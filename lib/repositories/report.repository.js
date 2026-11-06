import { query, withTransaction } from "@/lib/db";
import { REPORT_ROW_LIMIT, REPORT_TIME_ZONE, reportDecimal, reportUnits } from "@/lib/reports";
import { findScheduleConflictIds } from "@/lib/technician-calendar-policy";

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
  if (rows.length > REPORT_ROW_LIMIT) throw reportError(`El reporte supera ${REPORT_ROW_LIMIT.toLocaleString("es-VE")} renglones. Acota los filtros para generarlo completo.`, 422);
}

function parMoneyTotals(rows, { countKey } = {}) {
  return {
    pars: countKey ? rows.reduce((sum, row) => sum + Number(row[countKey] || 0), 0) : rows.length,
    hours: reportDecimal(rows.reduce((sum, row) => sum + reportUnits(row.budgeted_hours), 0n)),
    subtotalUsd: reportDecimal(rows.reduce((sum, row) => sum + reportUnits(row.subtotal_usd), 0n)),
    discountUsd: reportDecimal(rows.reduce((sum, row) => sum + reportUnits(row.discount_amount_usd), 0n)),
    usd: reportDecimal(rows.reduce((sum, row) => sum + reportUnits(row.total_usd), 0n)),
  };
}

function parFilter(filters) {
  const { params, add } = conditions();
  const where = dateConditions("h.created_at", filters, add);
  if (filters.clientId) where.push(`h.client_id = ${add(filters.clientId)}`);
  if (filters.parPurpose) where.push(`h.purpose = ${add(filters.parPurpose)}`);
  const status = filters.status ? `WHERE display_status = ${add(filters.status)}` : "";
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return { params, status, whereSql };
}

// Mismo estado visible del PAR: garantías separadas de la ejecución comercial.
function parRecordsCte(whereSql) {
  return `WITH records AS (
    SELECT h.id, h.purpose, h.par_number, h.created_at, c.description AS client_name,
           p.name AS plant_name, h.budgeted_hours, h.subtotal_usd,
           h.discount_percent, h.discount_amount_usd, h.total_usd,
           CASE WHEN h.status IN ('Aprobado', 'En Servicio', 'Finalizado') AND os.total > 0
             THEN CASE WHEN os.completed = os.total THEN 'Finalizado' ELSE 'En Servicio' END
             ELSE h.status END AS display_status
    FROM par_header h
    JOIN client c ON c.id = h.client_id
    LEFT JOIN plant p ON p.id = h.plant_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*) FILTER (WHERE status <> 'Cancelada' AND (h.purpose='ReferenciaGarantia' OR order_kind='Normal')) AS total,
             COUNT(*) FILTER (WHERE status = 'Completada' AND (h.purpose='ReferenciaGarantia' OR order_kind='Normal')) AS completed
      FROM service_order WHERE par_id = h.id
    ) os ON true
    ${whereSql}
  )`;
}

async function readPars(client, filters) {
  const { params, status, whereSql } = parFilter(filters);
  const { rows } = await client.query(`
    ${parRecordsCte(whereSql)} SELECT * FROM records ${status}
    ORDER BY created_at DESC, id DESC LIMIT ${REPORT_ROW_LIMIT + 1}`, params);
  assertSize(rows);
  return { rows, totals: parMoneyTotals(rows) };
}

async function readParsByMonth(client, filters) {
  const { params, status, whereSql } = parFilter(filters);
  // El mes se calcula en America/Caracas. Cada fila del documento es un mes, no un PAR.
  const { rows } = await client.query(`
    ${parRecordsCte(whereSql)}
    SELECT to_char(date_trunc('month', created_at AT TIME ZONE '${REPORT_TIME_ZONE}'), 'YYYY-MM') AS month_key,
           COUNT(*)::int AS par_count,
           SUM(budgeted_hours) AS budgeted_hours,
           SUM(subtotal_usd) AS subtotal_usd,
           SUM(discount_amount_usd) AS discount_amount_usd,
           SUM(total_usd) AS total_usd
    FROM records ${status}
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT ${REPORT_ROW_LIMIT + 1}`, params);
  assertSize(rows);
  return { rows, totals: { ...parMoneyTotals(rows, { countKey: "par_count" }), months: rows.length } };
}

async function readServiceOrders(client, filters) {
  const { params, add } = conditions();
  const where = dateConditions("so.scheduled_start", filters, add);
  if (filters.clientId) where.push(`so.client_id = ${add(filters.clientId)}`);
  if (filters.status) where.push(`so.status = ${add(filters.status)}`);
  if (filters.orderKind) where.push(`so.order_kind = ${add(filters.orderKind)}`);
  if (filters.technicianId) where.push(`EXISTS (
    SELECT 1 FROM service_order_technician sot
    WHERE sot.service_order_id = so.id AND sot.technical_id = ${add(filters.technicianId)})`);
  // Una fila por orden. Los técnicos se agregan en una subconsulta para no repetir la orden.
  const { rows } = await client.query(`
    SELECT so.id, so.order_code, so.order_kind, so.status, so.scheduled_start, so.closed_at,
           ph.par_number, c.description AS client_name, p.name AS plant_name,
           COALESCE((
             SELECT string_agg(t.name, ', ' ORDER BY sot.is_lead DESC, t.name)
             FROM service_order_technician sot
             JOIN technical t ON t.id = sot.technical_id
             WHERE sot.service_order_id = so.id
           ), NULLIF(so.technician_name, '')) AS technician_names
    FROM service_order so
    JOIN par_header ph ON ph.id = so.par_id
    JOIN client c ON c.id = so.client_id
    LEFT JOIN plant p ON p.id = so.plant_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY so.scheduled_start DESC, so.id DESC
    LIMIT ${REPORT_ROW_LIMIT + 1}`, params);
  assertSize(rows);
  return {
    rows,
    totals: {
      orders: rows.length,
      normal: rows.filter((row) => row.order_kind === "Normal").length,
      warranty: rows.filter((row) => row.order_kind === "Garantia").length,
    },
  };
}

async function readClients(client, filters) {
  const { params, add } = conditions();
  const where = filters.status ? `WHERE c.status = ${add(filters.status)}` : "";
  const { rows } = await client.query(`
    SELECT c.id, c.codclie, c.description, c.status,
           (SELECT COUNT(*)::int FROM plant p WHERE p.client_id = c.id) AS plant_count,
           (SELECT COUNT(*)::int FROM contact ct WHERE ct.client_id = c.id) AS contact_count,
           (SELECT COUNT(*)::int FROM equipment e WHERE e.client_id = c.id) AS equipment_count
    FROM client c
    ${where}
    ORDER BY c.description NULLS LAST, c.codclie, c.id
    LIMIT ${REPORT_ROW_LIMIT + 1}`, params);
  assertSize(rows);
  return {
    rows,
    totals: {
      clients: rows.length,
      plants: rows.reduce((sum, row) => sum + Number(row.plant_count || 0), 0),
      contacts: rows.reduce((sum, row) => sum + Number(row.contact_count || 0), 0),
      equipment: rows.reduce((sum, row) => sum + Number(row.equipment_count || 0), 0),
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
  if (filters.orderKind) where.push(`so.order_kind = ${add(filters.orderKind)}`);
  if (filters.technicianId) where.push(`a.technical_id = ${add(filters.technicianId)}`);
  // Una fila por asignación técnico/renglón. No unir equipos ni documentos:
  // sus relaciones múltiples repetirían las horas y los importes.
  const { rows } = await client.query(`
    SELECT a.id, a.technical_id, COALESCE(t.name, a.technician_name) AS technician_name,
           a.technician_name AS assigned_technician_name, a.source_item_no,
           a.product_code, a.description, a.hours, a.actual_hours,
           (a.actual_hours - a.hours)::numeric AS difference,
           so.order_kind, so.warranty_origin_order_id, (SELECT origin.order_code FROM service_order origin WHERE origin.id=so.warranty_origin_order_id) AS warranty_origin_order_code, so.warranty_reference, so.id AS order_id, so.order_code, so.closed_at, ph.par_number, c.description AS client_name
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
  if (filters.orderKind) historyWhere.push(`so.order_kind = ${history.add(filters.orderKind)}`);
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
    const groupKey = `${row.technical_id}:${row.order_kind}`;
    if (!groups.has(groupKey)) groups.set(groupKey, { id: row.technical_id, orderKind: row.order_kind, name: row.technician_name, rows: [], orders: new Set(), estimated: 0n, actual: 0n });
    const group = groups.get(groupKey);
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
      id: group.id, orderKind: group.orderKind, name: group.name, rows: group.rows, orderCount: group.orders.size,
      estimated: reportDecimal(group.estimated), actual: reportDecimal(group.actual), difference: reportDecimal(group.actual - group.estimated),
    })),
    totals: { byKind: ["Normal","Garantia"].map((kind)=>({kind,estimated:reportDecimal(rows.filter((row)=>row.order_kind===kind).reduce((sum,row)=>sum+reportUnits(row.hours),0n)),actual:reportDecimal(rows.filter((row)=>row.order_kind===kind).reduce((sum,row)=>sum+reportUnits(row.actual_hours),0n))})), technicians: new Set(rows.map((row)=>row.technical_id)).size, orders: allOrders.size, estimated: reportDecimal(estimated), actual: reportDecimal(actual), difference: reportDecimal(actual - estimated) },
    undatedHistoryCount: exclusions[0].undated,
    incompleteCount: exclusions[0].incomplete,
  };
}

async function readTechnicianCalendar(client, filters) {
  const { params, add } = conditions();
  const where = ["so.approved_by IS NOT NULL", "so.approved_at IS NOT NULL", "so.status <> 'Cancelada'"];
  // El rango cruza el horario programado: no basta con que el inicio caiga dentro de las fechas.
  if (filters.from) where.push(`so.scheduled_end > (${add(filters.from)}::date::timestamp AT TIME ZONE '${REPORT_TIME_ZONE}')`);
  if (filters.to) where.push(`so.scheduled_start < ((${add(filters.to)}::date + 1)::timestamp AT TIME ZONE '${REPORT_TIME_ZONE}')`);
  if (filters.technicianId) where.push(`t.id = ${add(filters.technicianId)}::uuid`);
  const { rows } = await client.query(`
    SELECT so.id AS service_order_id, so.order_code, so.status, so.work_type, so.service_type,
           so.scheduled_start AS start_at, so.scheduled_end AS end_at, ph.par_number,
           c.description AS client_name, p.name AS plant_name,
           t.id AS technician_id, t.name AS technician_name
    FROM service_order so
    JOIN service_order_technician sot ON sot.service_order_id = so.id
    JOIN technical t ON t.id = sot.technical_id
    JOIN par_header ph ON ph.id = so.par_id
    JOIN client c ON c.id = so.client_id
    JOIN plant p ON p.id = so.plant_id
    JOIN equipment e ON e.id = so.equipment_id
    WHERE ${where.join(" AND ")}
    ORDER BY t.name, so.scheduled_start, so.id
    LIMIT ${REPORT_ROW_LIMIT + 1}`, params);
  assertSize(rows);
  const conflicts = findScheduleConflictIds(rows);
  const participations = rows.map((row) => ({
    ...row,
    has_conflict: conflicts.has(`${row.service_order_id}:${row.technician_id}`),
  }));

  const absence = conditions();
  const absenceWhere = ["v.cancelled_at IS NULL"];
  if (filters.technicianId) absenceWhere.push(`v.technical_id = ${absence.add(filters.technicianId)}::uuid`);
  if (filters.from) absenceWhere.push(`((v.end_date + 1)::timestamp AT TIME ZONE '${REPORT_TIME_ZONE}') > (${absence.add(filters.from)}::date::timestamp AT TIME ZONE '${REPORT_TIME_ZONE}')`);
  if (filters.to) absenceWhere.push(`(v.start_date::timestamp AT TIME ZONE '${REPORT_TIME_ZONE}') < ((${absence.add(filters.to)}::date + 1)::timestamp AT TIME ZONE '${REPORT_TIME_ZONE}')`);
  const { rows: unavailability } = await client.query(`
    SELECT v.id, t.name AS technician_name, v.start_date::text AS start_date, v.end_date::text AS end_date
    FROM technical_unavailability v
    JOIN technical t ON t.id = v.technical_id
    WHERE ${absenceWhere.join(" AND ")}
    ORDER BY t.name, v.start_date, v.id
    LIMIT ${REPORT_ROW_LIMIT + 1}`, absence.params);
  assertSize(unavailability);

  return {
    rows: participations,
    unavailability,
    totals: {
      participations: participations.length,
      orders: new Set(participations.map((row) => row.service_order_id)).size,
      technicians: new Set(participations.map((row) => row.technician_id)).size,
      absences: unavailability.length,
    },
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
    const readers = {
      pars: readPars,
      "technician-hours": readTechnicianHours,
      "service-orders": readServiceOrders,
      clients: readClients,
      "par-monthly": readParsByMonth,
      "technician-calendar": readTechnicianCalendar,
    };
    const result = await readers[filters.type](client, filters);
    return { ...result, filters, clientName, technicianName, company: configs[0] ?? { company_name: "MAQUITECH" }, generatedAt: new Date().toISOString(), generatedBy: actor.name };
  });
}
