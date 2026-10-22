import { query } from "@/lib/db";
import { ROLES } from "@/lib/permissions";
import { findScheduleConflictIds } from "@/lib/technician-calendar-policy";

function addParam(params, value) {
  params.push(value);
  return `$${params.length}`;
}

async function resolveScope(userId, role) {
  if (role !== ROLES.TECNICO) return { ownTechnicianId: null };
  const { rows } = await query("SELECT id, name FROM technical WHERE user_id = $1 LIMIT 1", [userId]);
  if (!rows[0]) {
    const error = new Error("Tu usuario no está vinculado a un técnico. Solicita la asociación a un administrador.");
    error.code = "TECHNICIAN_ACCOUNT_NOT_LINKED";
    throw error;
  }
  return { ownTechnicianId: rows[0].id, ownTechnicianName: rows[0].name };
}

export async function findCalendarData(filters, actor) {
  const scope = await resolveScope(actor.userId, actor.role);
  const params = [];
  let where = `WHERE so.approved_by IS NOT NULL
    AND so.approved_at IS NOT NULL
    AND so.status <> 'Cancelada'
    AND so.scheduled_start < ${addParam(params, filters.to)}::timestamptz
    AND so.scheduled_end > ${addParam(params, filters.from)}::timestamptz`;

  const effectiveTechnicianId = scope.ownTechnicianId || filters.technicianId;
  if (effectiveTechnicianId) where += ` AND t.id = ${addParam(params, effectiveTechnicianId)}::uuid`;
  if (filters.status) where += ` AND so.status = ${addParam(params, filters.status)}`;
  if (filters.priority) where += ` AND so.priority = ${addParam(params, filters.priority)}`;
  if (filters.serviceType) where += ` AND so.service_type = ${addParam(params, filters.serviceType)}`;
  if (filters.clientId) where += ` AND c.id = ${addParam(params, filters.clientId)}::uuid`;
  if (filters.plantId) where += ` AND p.id = ${addParam(params, filters.plantId)}::uuid`;

  const { rows: events } = await query(
    `SELECT so.id AS service_order_id, so.order_code, so.status, so.priority,
       so.work_type, so.service_type, so.scheduled_start AS start_at,
       so.scheduled_end AS end_at, so.approved_at, ph.par_number,
       c.id AS client_id, c.description AS client_name,
       p.id AS plant_id, p.name AS plant_name, e.name AS equipment_name,
       t.id AS technician_id, t.name AS technician_name, sot.is_lead
     FROM service_order so
     JOIN service_order_technician sot ON sot.service_order_id = so.id
     JOIN technical t ON t.id = sot.technical_id
     JOIN par_header ph ON ph.id = so.par_id
     JOIN client c ON c.id = so.client_id
     JOIN plant p ON p.id = so.plant_id
     JOIN equipment e ON e.id = so.equipment_id
     ${where}
     ORDER BY so.scheduled_start, sot.is_lead DESC, t.name`,
    params
  );

  const catalogParams = [];
  const catalogScope = scope.ownTechnicianId
    ? `AND t.id = ${addParam(catalogParams, scope.ownTechnicianId)}::uuid`
    : "";
  const { rows: technicians } = await query(
    `SELECT t.id, t.name, t.status
     FROM technical t
     WHERE (t.status = 'Activo' OR t.id IN (
       SELECT sot.technical_id FROM service_order_technician sot
       JOIN service_order so ON so.id = sot.service_order_id
       WHERE so.approved_at IS NOT NULL
     )) ${catalogScope}
     ORDER BY t.status DESC, t.name`,
    catalogParams
  );

  const relationParams = [filters.to, filters.from];
  const relationScope = scope.ownTechnicianId
    ? `AND sot.technical_id = ${addParam(relationParams, scope.ownTechnicianId)}::uuid`
    : "";
  const { rows: relations } = await query(
    `SELECT DISTINCT c.id AS client_id, c.description AS client_name,
            p.id AS plant_id, p.name AS plant_name
     FROM service_order so
     JOIN service_order_technician sot ON sot.service_order_id = so.id
     JOIN client c ON c.id = so.client_id
     JOIN plant p ON p.id = so.plant_id
     WHERE so.approved_by IS NOT NULL AND so.approved_at IS NOT NULL
       AND so.status <> 'Cancelada'
       AND so.scheduled_start < $1::timestamptz
       AND so.scheduled_end > $2::timestamptz
       ${relationScope}
     ORDER BY c.description, p.name`,
    relationParams
  );

  const conflictingIds = findScheduleConflictIds(events);
  const mappedEvents = events.map((event) => ({
    id: `${event.service_order_id}:${event.technician_id}`,
    ...event,
    has_conflict: conflictingIds.has(`${event.service_order_id}:${event.technician_id}`),
  }));
  const clients = new Map();
  const plants = new Map();
  for (const relation of relations) {
    clients.set(relation.client_id, { id: relation.client_id, name: relation.client_name });
    plants.set(relation.plant_id, { id: relation.plant_id, name: relation.plant_name, clientId: relation.client_id });
  }

  return {
    events: mappedEvents,
    technicians,
    clients: [...clients.values()].toSorted((a, b) => a.name.localeCompare(b.name, "es")),
    plants: [...plants.values()].toSorted((a, b) => a.name.localeCompare(b.name, "es")),
    summary: {
      orders: new Set(events.map((event) => event.service_order_id)).size,
      technicians: new Set(events.map((event) => event.technician_id)).size,
      assignments: events.length,
      conflicts: conflictingIds.size,
    },
    scope: scope.ownTechnicianId
      ? { type: "own", technicianId: scope.ownTechnicianId, technicianName: scope.ownTechnicianName }
      : { type: "all" },
  };
}
