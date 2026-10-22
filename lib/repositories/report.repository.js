import { query, withTransaction } from "@/lib/db";
import { REPORT_ROW_LIMIT, REPORT_TIME_ZONE, reportDecimal, reportUnits } from "@/lib/reports";

function reportError(message, status = 400) {
  return Object.assign(new Error(message), { reportStatus: status });
}

export async function getReportCatalogs() {
  const [clients, technicians] = await Promise.all([
    query("SELECT id, codclie, description, rif, status FROM client ORDER BY description, id"),
    query("SELECT id, name, status FROM technical ORDER BY name, id"),
  ]);
  // Conservar inactivos: los filtros también deben permitir consultar historial.
  return { clients: clients.rows, technicians: technicians.rows };
}

function conditions() {
  const params = [];
  const add = (value) => { params.push(value); return `$${params.length}`; };
  return { params, add };
}

function dateConditions(column, filters, add) {
  const clauses = [];
  // Rango local inclusivo: [inicio del primer día, inicio del día siguiente).
  // No aplicar DATE() a la columna para permitir usar sus índices.
  if (filters.from) clauses.push(`${column} >= (${add(filters.from)}::date::timestamp AT TIME ZONE '${REPORT_TIME_ZONE}')`);
  if (filters.to) clauses.push(`${column} < ((${add(filters.to)}::date + 1)::timestamp AT TIME ZONE '${REPORT_TIME_ZONE}')`);
  return clauses;
}

function assertSize(rows) {
  if (rows.length > REPORT_ROW_LIMIT) throw reportError(`El reporte supera ${REPORT_ROW_LIMIT.toLocaleString("es-VE")} renglones. Reduce el período o selecciona un cliente o técnico para generarlo completo.`, 422);
}

async function readPars(client, filters) {
  const { params, add } = conditions();
  const where = dateConditions("h.created_at", filters, add);
  if (filters.clientId) where.push(`h.client_id = ${add(filters.clientId)}`);
  const status = filters.status ? `WHERE display_status = ${add(filters.status)}` : "";
  // Mismo estado visible que HEADER_SELECT de par.repository: cualquier O/S
  // no cancelada participa; si todas están completadas, el PAR se ve Finalizado.
  const { rows } = await client.query(`
    WITH records AS (
      SELECT h.id, h.par_number, h.created_at, c.description AS client_name,
             p.name AS plant_name, h.budgeted_hours, h.total_usd,
             CASE WHEN h.status IN ('Aprobado', 'En Servicio', 'Finalizado') AND os.total > 0
               THEN CASE WHEN os.completed = os.total THEN 'Finalizado' ELSE 'En Servicio' END
               ELSE h.status END AS display_status
      FROM par_header h
      JOIN client c ON c.id = h.client_id
      LEFT JOIN plant p ON p.id = h.plant_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) FILTER (WHERE status <> 'Cancelada') AS total,
               COUNT(*) FILTER (WHERE status = 'Completada') AS completed
        FROM service_order WHERE par_id = h.id
      ) os ON true
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ) SELECT * FROM records ${status}
    ORDER BY created_at DESC, id DESC LIMIT ${REPORT_ROW_LIMIT + 1}`, params);
  assertSize(rows);
  return {
    rows,
    totals: {
      pars: rows.length,
      hours: reportDecimal(rows.reduce((sum, row) => sum + reportUnits(row.budgeted_hours), 0n)),
      usd: reportDecimal(rows.reduce((sum, row) => sum + reportUnits(row.total_usd), 0n)),
    },
  };
}

const CONFIRMED_ALLOCATION = `NOT so.labor_review_required
  AND EXISTS (SELECT 1 FROM service_order_labor_allocation a0 WHERE a0.service_order_id = so.id)
  AND NOT EXISTS (SELECT 1 FROM service_order_labor_allocation a0 WHERE a0.service_order_id = so.id AND a0.actual_hours IS NULL)`;

async function readTechnicianHours(client, filters) {
  const { params, add } = conditions();
  const where = ["so.status = 'Completada'", "so.closed_at IS NOT NULL", CONFIRMED_ALLOCATION];
  where.push(...dateConditions("so.closed_at", filters, add));
  if (filters.clientId) where.push(`ph.client_id = ${add(filters.clientId)}`);
  if (filters.technicianId) where.push(`a.technical_id = ${add(filters.technicianId)}`);
  // Una fila por asignación técnico/renglón. No unir equipos ni documentos:
  // sus relaciones múltiples repetirían las horas y los importes.
  const { rows } = await client.query(`
    SELECT a.id, a.technical_id, COALESCE(t.name, a.technician_name) AS technician_name,
           a.technician_name AS assigned_technician_name, a.source_item_no,
           a.product_code, a.description, a.hours, a.actual_hours,
           (a.actual_hours - a.hours)::numeric AS difference,
           so.id AS order_id, so.order_code, so.closed_at, ph.par_number, c.description AS client_name
    FROM service_order_labor_allocation a
    JOIN service_order so ON so.id = a.service_order_id
    JOIN par_header ph ON ph.id = so.par_id
    JOIN client c ON c.id = ph.client_id
    LEFT JOIN technical t ON t.id = a.technical_id
    WHERE ${where.join(" AND ")}
    ORDER BY technician_name, a.technical_id, so.closed_at DESC, so.id DESC, a.source_item_no, a.id
    LIMIT ${REPORT_ROW_LIMIT + 1}`, params);
  assertSize(rows);

  const history = conditions();
  const historyWhere = ["so.status = 'Completada'"];
  if (filters.clientId) historyWhere.push(`ph.client_id = ${history.add(filters.clientId)}`);
  if (filters.technicianId) historyWhere.push(`EXISTS (
    SELECT 1 FROM service_order_technician sot WHERE sot.service_order_id = so.id AND sot.technical_id = ${history.add(filters.technicianId)})`);
  const dated = dateConditions("so.closed_at", filters, history.add);
  const { rows: exclusions } = await client.query(`
    SELECT COUNT(*) FILTER (WHERE so.closed_at IS NULL)::int AS undated,
           COUNT(*) FILTER (WHERE so.closed_at IS NOT NULL
             ${dated.length ? `AND ${dated.join(" AND ")}` : ""}
             AND NOT (${CONFIRMED_ALLOCATION}))::int AS incomplete
    FROM service_order so JOIN par_header ph ON ph.id = so.par_id
    WHERE ${historyWhere.join(" AND ")}`, history.params);

  const groups = new Map();
  const allOrders = new Set();
  let estimated = 0n;
  let actual = 0n;
  for (const row of rows) {
    if (!groups.has(row.technical_id)) groups.set(row.technical_id, { id: row.technical_id, name: row.technician_name, rows: [], orders: new Set(), estimated: 0n, actual: 0n });
    const group = groups.get(row.technical_id);
    group.rows.push(row);
    group.orders.add(row.order_id);
    group.estimated += reportUnits(row.hours);
    group.actual += reportUnits(row.actual_hours);
    allOrders.add(row.order_id);
    estimated += reportUnits(row.hours);
    actual += reportUnits(row.actual_hours);
  }
  return {
    rows,
    groups: [...groups.values()].map((group) => ({
      id: group.id, name: group.name, rows: group.rows, orderCount: group.orders.size,
      estimated: reportDecimal(group.estimated), actual: reportDecimal(group.actual), difference: reportDecimal(group.actual - group.estimated),
    })),
    totals: { technicians: groups.size, orders: allOrders.size, estimated: reportDecimal(estimated), actual: reportDecimal(actual), difference: reportDecimal(actual - estimated) },
    undatedHistoryCount: exclusions[0].undated,
    incompleteCount: exclusions[0].incomplete,
  };
}

export async function readReport(filters, actor) {
  return withTransaction(async (client) => {
    // Cabecera, filtros, detalle y totales pertenecen a la misma lectura,
    // incluso si otra sesión cierra una orden mientras se genera el reporte.
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
    await client.query("SET LOCAL statement_timeout = '20s'");
    const { rows: configs } = await client.query("SELECT company_name, rif, phone, email, address, logo FROM configuration WHERE id = 1");
    let clientName = "Todos los clientes";
    let technicianName = "Todos los técnicos";
    if (filters.clientId) {
      const { rows } = await client.query("SELECT description FROM client WHERE id = $1", [filters.clientId]);
      if (!rows[0]) throw reportError("El cliente seleccionado no existe.");
      clientName = rows[0].description;
    }
    if (filters.technicianId) {
      const { rows } = await client.query("SELECT name FROM technical WHERE id = $1", [filters.technicianId]);
      if (!rows[0]) throw reportError("El técnico seleccionado no existe.");
      technicianName = rows[0].name;
    }
    const result = filters.type === "pars" ? await readPars(client, filters) : await readTechnicianHours(client, filters);
    return { ...result, filters, clientName, technicianName, company: configs[0] ?? { company_name: "MAQUITECH" }, generatedAt: new Date().toISOString(), generatedBy: actor.name };
  });
}
