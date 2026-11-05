import { query, withTransaction } from "@/lib/db";
import { canManageUnavailability, canReadUnavailability, unavailabilityBounds, OPERATION_TIME_ZONE, schedulingError } from "@/lib/technician-unavailability";
import { unavailabilityCreateSchema, unavailabilityUpdateSchema, unavailabilityCancelSchema, unavailabilityImpactSchema } from "@/lib/validators/technician-unavailability.schema";

function requireManager(actor) {
  if (!actor?.userId || !canManageUnavailability(actor.role)) throw schedulingError("SCHEDULING_FORBIDDEN", "Solo Superadministrador, Administrador o Supervisor pueden gestionar la no disponibilidad y las reprogramaciones.");
}
function parse(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw schedulingError("SCHEDULING_INVALID", parsed.error.issues[0].message);
  return parsed.data;
}

// Compartido por no disponibilidad y TODAS las escrituras de programación. O/S toma PAR → O/S
// antes de estos candados; no disponibilidad toma solo técnicos y nunca bloquea PAR/O/S.
// Ordenar UUID evita interbloqueos al sustituir varios participantes entre órdenes.
export async function lockTechnicianSchedules(client, ids) {
  for (const id of [...new Set(ids)].sort()) {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('maquitech:technical-schedule:' || $1::uuid::text, 0))", [id]);
  }
}

export async function assertTechniciansAvailable(client, ids, start, end) {
  if (!Number.isFinite(new Date(start).getTime()) || !Number.isFinite(new Date(end).getTime()) || new Date(end) <= new Date(start)) {
    throw schedulingError("SCHEDULING_INVALID", "La fecha final debe ser posterior a la inicial.");
  }
  const { rows } = await client.query(
    `SELECT v.id, v.technical_id, t.name AS technician_name, v.start_date::text, v.end_date::text
     FROM technical_unavailability v JOIN technical t ON t.id=v.technical_id
     WHERE v.technical_id=ANY($1::uuid[]) AND v.cancelled_at IS NULL
       AND (v.start_date::timestamp AT TIME ZONE $4) < $3::timestamptz
       AND ((v.end_date + 1)::timestamp AT TIME ZONE $4) > $2::timestamptz
     ORDER BY t.name,v.start_date`, [ids, start, end, OPERATION_TIME_ZONE]);
  if (rows.length) throw schedulingError("ORDER_TECHNICIAN_UNAVAILABLE", `Técnicos no disponibles: ${rows.map((row) => `${row.technician_name} (${row.start_date} al ${row.end_date})`).join(", ")}. Ajuste las fechas o sustituya al técnico.`, rows);
}

async function requireTechnician(client, id) {
  const { rows } = await client.query("SELECT id FROM technical WHERE id=$1", [id]);
  if (!rows.length) throw schedulingError("SCHEDULING_NOT_FOUND", "Técnico no encontrado.");
}

async function impact(client, technicalId, data, excludeId = null) {
  const bounds = unavailabilityBounds(data.startDate, data.endDate);
  const { rows: orders } = await client.query(
    `SELECT so.id,so.order_code,so.status,so.scheduled_start,so.scheduled_end
     FROM service_order so JOIN service_order_technician sot ON sot.service_order_id=so.id
     WHERE sot.technical_id=$1 AND so.status IN ('Pendiente','Aprobada','En Proceso')
       AND so.scheduled_start < $3::timestamptz AND so.scheduled_end > $2::timestamptz
     ORDER BY so.scheduled_start,so.id`, [technicalId, bounds.start, bounds.end]);
  const { rows: unavailability } = await client.query(
    `SELECT id,start_date::text,end_date::text FROM technical_unavailability
     WHERE technical_id=$1 AND cancelled_at IS NULL AND ($4::uuid IS NULL OR id<>$4)
       AND start_date <= $3::date AND end_date >= $2::date ORDER BY start_date`,
    [technicalId, data.startDate, data.endDate, excludeId]);
  return { orders, unavailability };
}

export async function previewUnavailabilityImpact(technicalId, data, actor, excludeId = null) {
  requireManager(actor);
  const parsed = parse(unavailabilityImpactSchema, data);
  await requireTechnician({ query }, technicalId);
  return impact({ query }, technicalId, parsed, excludeId);
}

export async function listUnavailability(technicalId, actor) {
  if (!actor?.userId || !canReadUnavailability(actor.role)) throw schedulingError("SCHEDULING_FORBIDDEN", "No tiene permiso para consultar no disponibilidad.");
  const manager = canManageUnavailability(actor.role);
  await requireTechnician({ query }, technicalId);
  const { rows } = await query(
    `SELECT id,technical_id,start_date::text,end_date::text,cancelled_at,revision
      ${manager ? ",reason_type,note,created_at,updated_at,cancellation_reason" : ""}
     FROM technical_unavailability WHERE technical_id=$1 ORDER BY start_date DESC,id`, [technicalId]);
  const { rows: events } = manager ? await query(
    `SELECT e.id,e.unavailability_id,e.action,e.reason,e.details,e.created_at,u.name AS actor_name
     FROM technical_unavailability_event e JOIN technical_unavailability v ON v.id=e.unavailability_id
     JOIN users u ON u.id=e.actor_id WHERE v.technical_id=$1 ORDER BY e.id DESC`, [technicalId]) : { rows: [] };
  return { unavailability: rows, events, canManage: manager, timeZone: OPERATION_TIME_ZONE };
}

async function writeUnavailability(technicalId, unavailabilityId, raw, actor, cancelling = false) {
  requireManager(actor);
  const data = parse(cancelling ? unavailabilityCancelSchema : unavailabilityId ? unavailabilityUpdateSchema : unavailabilityCreateSchema, raw);
  return withTransaction(async (client) => {
    await lockTechnicianSchedules(client, [technicalId]);
    await requireTechnician(client, technicalId);
    let before = null;
    if (unavailabilityId) {
      const { rows } = await client.query("SELECT *,start_date::text,end_date::text FROM technical_unavailability WHERE id=$1 AND technical_id=$2 FOR UPDATE", [unavailabilityId, technicalId]);
      before = rows[0];
      if (!before) throw schedulingError("SCHEDULING_NOT_FOUND", "Período de no disponibilidad no encontrado.");
      if (before.cancelled_at || before.revision !== data.revision) throw schedulingError("SCHEDULING_CONFLICT", "El período cambió o fue cancelado. Actualice antes de continuar.");
    }
    if (!cancelling) {
      const conflicts = await impact(client, technicalId, data, unavailabilityId);
      if (conflicts.orders.length) throw schedulingError("UNAVAILABILITY_OPEN_ORDERS", "Resuelva las O/S abiertas que coinciden con este período de no disponibilidad antes de guardarlo.", conflicts.orders);
      if (conflicts.unavailability.length) throw schedulingError("UNAVAILABILITY_OVERLAP", "Ya existe un período de no disponibilidad que coincide con estas fechas.", conflicts.unavailability);
    }
    let result;
    if (cancelling) {
      result = await client.query("UPDATE technical_unavailability SET cancelled_at=now(),cancelled_by=$2,cancellation_reason=$3,updated_at=now(),updated_by=$2,revision=revision+1 WHERE id=$1 RETURNING *,start_date::text,end_date::text", [unavailabilityId, actor.userId, data.reason]);
    } else if (before) {
      result = await client.query("UPDATE technical_unavailability SET start_date=$2,end_date=$3,note=$4,reason_type=$6,updated_at=now(),updated_by=$5,revision=revision+1 WHERE id=$1 RETURNING *,start_date::text,end_date::text", [unavailabilityId, data.startDate, data.endDate, data.note || null, actor.userId, data.reasonType]);
    } else {
      result = await client.query("INSERT INTO technical_unavailability(technical_id,start_date,end_date,note,created_by,updated_by,reason_type) VALUES($1,$2,$3,$4,$5,$5,$6) RETURNING *,start_date::text,end_date::text", [technicalId, data.startDate, data.endDate, data.note || null, actor.userId, data.reasonType]);
    }
    const after = result.rows[0];
    await client.query("INSERT INTO technical_unavailability_event(unavailability_id,actor_id,action,reason,details) VALUES($1,$2,$3,$4,$5::jsonb)", [after.id, actor.userId, cancelling ? "Canceladas" : before ? "Modificadas" : "Registradas", data.reason || null, JSON.stringify({ before, after })]);
    return after;
  });
}

export const createUnavailability = (technicalId, data, actor) => writeUnavailability(technicalId, null, data, actor);
export const updateUnavailability = (technicalId, id, data, actor) => writeUnavailability(technicalId, id, data, actor);
export const cancelUnavailability = (technicalId, id, data, actor) => writeUnavailability(technicalId, id, data, actor, true);
