import { query, withTransaction } from "@/lib/db";
import { canManageClosure, canCloseServiceOrder, closureError, CLOSURE_DOCUMENTS } from "@/lib/service-order-closure";
import { hourUnits } from "@/lib/labor-hours";
import { getLaborBudget } from "@/lib/repositories/service-order-labor.repository";
import { resolveOrderEquipment, replaceOrderEquipment } from "@/lib/repositories/service-order-equipment.repository";
import { persistClosureFile, assertClosureFileAvailable } from "@/lib/service-order-storage";

async function lockClosure(client, id, actor, revision, closing = false) {
  if (!actor.userId || !(closing ? canCloseServiceOrder(actor.role) : canManageClosure(actor.role))) {
    throw closureError("ORDER_CLOSURE_FORBIDDEN", closing ? "Solo Superadministrador, Administrador o Supervisor pueden cerrar la O/S." : "No tiene permiso para gestionar el cierre.");
  }
  const { rows: reference } = await client.query("SELECT par_id FROM service_order WHERE id=$1", [id]);
  if (!reference.length) throw closureError("ORDER_CLOSURE_NOT_FOUND", "Orden no encontrada.");
  // Orden común con reservas, cancelaciones y edición del PAR. Leer después de esperar.
  await client.query("SELECT id FROM par_header WHERE id=$1 FOR UPDATE", [reference[0].par_id]);
  const { rows } = await client.query("SELECT * FROM service_order WHERE id=$1 FOR UPDATE", [id]);
  const order = rows[0];
  if (order.status !== "En Proceso") throw closureError("ORDER_CLOSURE_LOCKED", "El expediente solo se puede modificar mientras la orden está En Proceso.");
  if (order.closure_revision !== revision) throw closureError("ORDER_CLOSURE_CONFLICT", "El expediente cambió en otra sesión. Actualice antes de continuar.");
  return order;
}

async function recordEvent(client, id, actor, action, details) {
  await client.query("INSERT INTO service_order_closure_event(service_order_id,actor_id,action,details) VALUES ($1,$2,$3,$4::jsonb)", [id, actor.userId, action, JSON.stringify(details)]);
  await client.query("UPDATE service_order SET closure_revision=closure_revision+1, updated_at=now() WHERE id=$1", [id]);
}

async function getRequirement(client, orderId, equipmentId, category) {
  const { rows } = await client.query("SELECT * FROM service_order_closure_requirement WHERE service_order_id=$1 AND equipment_id=$2 AND category=$3", [orderId, equipmentId, category]);
  if (!rows.length) throw closureError("ORDER_CLOSURE_INVALID", "El documento debe corresponder a un equipo seleccionado en esta O/S.");
  return rows[0];
}

function requireConfirmedEquipment(order) {
  if (!order.equipment_scope_confirmed) throw closureError("ORDER_CLOSURE_INVALID", "Confirme primero los equipos atendidos por esta orden.");
}

async function readClosure(client, id) {
    // Bloqueo compartido: cabecera, requisitos, horas e historial corresponden a una revisión.
    const { rows } = await client.query("SELECT * FROM service_order WHERE id=$1 FOR SHARE", [id]);
    if (!rows.length) throw closureError("ORDER_CLOSURE_NOT_FOUND", "Orden no encontrada.");
    const order = rows[0];
    const { rows: equipment } = await client.query("SELECT *, equipment_id AS id FROM service_order_equipment WHERE service_order_id=$1 ORDER BY position", [id]);
    const { rows: requirements } = await client.query(
      `SELECT r.*, u.name AS updated_by_name, COALESCE((SELECT json_agg(json_build_object(
         'id',f.id,'original_name',f.original_name,'mime_type',f.mime_type,'byte_size',f.byte_size,
         'uploaded_at',f.uploaded_at,'uploaded_by_name',uploader.name,'retired_at',f.retired_at,
         'retired_by_name',retirer.name,'retirement_reason',f.retirement_reason) ORDER BY f.uploaded_at)
       FROM service_order_closure_file f JOIN "users" uploader ON uploader.id=f.uploaded_by
       LEFT JOIN "users" retirer ON retirer.id=f.retired_by WHERE f.requirement_id=r.id),'[]'::json) AS files
       FROM service_order_closure_requirement r LEFT JOIN "users" u ON u.id=r.updated_by
       WHERE r.service_order_id=$1 ORDER BY r.id`, [id]);
    const { rows: allocations } = await client.query("SELECT * FROM service_order_labor_allocation WHERE service_order_id=$1 ORDER BY source_item_no,id", [id]);
    const { rows: events } = await client.query(
      `SELECT ev.*, u.name AS actor_name FROM service_order_closure_event ev JOIN "users" u ON u.id=ev.actor_id
       WHERE ev.service_order_id=$1 ORDER BY ev.id DESC`, [id]);
    const { rows: candidates } = order.equipment_scope_confirmed ? { rows: [] } : await client.query(
      `SELECT pe.equipment_id AS id, COALESCE(e.name,pe.tipo) AS name, COALESCE(e.serial,pe.serial) AS serial
       FROM par_equipment pe JOIN equipment e ON e.id=pe.equipment_id WHERE pe.par_id=$1 ORDER BY pe.is_main DESC,pe.item_no`, [order.par_id]);
    const { rows: closer } = order.closed_by ? await client.query('SELECT name FROM "users" WHERE id=$1', [order.closed_by]) : { rows: [] };
    return { order: { ...order, closed_by_name: closer[0]?.name }, equipment, requirements, allocations, events, candidates,
      budget: await getLaborBudget(order.par_id, id, client) };
}

export async function getClosure(id) {
  return withTransaction((client) => readClosure(client, id));
}

async function saveActualHours(client, order, data) {
  if (order.labor_review_required) throw closureError("ORDER_CLOSURE_INVALID", "Revise la distribución de horas anteriores antes de registrar las horas reales.");
  const { rows: allocations } = await client.query("SELECT * FROM service_order_labor_allocation WHERE service_order_id=$1 ORDER BY id", [order.id]);
  const actuals = new Map(data.actuals.map((row) => [String(row.allocationId), row]));
  if (actuals.size !== data.actuals.length || actuals.size !== allocations.length || allocations.some((row) => !actuals.has(String(row.id)))) {
    throw closureError("ORDER_CLOSURE_INVALID", "Registre las horas reales de cada asignación programada, sin agregar otros técnicos.");
  }
  let total = 0;
  for (const row of allocations) {
    const actual = actuals.get(String(row.id));
    const units = hourUnits(actual.hours);
    total += units;
    if (!Number.isFinite(actual.hours) || units < 0 || Math.abs(actual.hours * 100 - units) > 0.000001) throw closureError("ORDER_CLOSURE_INVALID", "Ingrese horas válidas con hasta dos decimales.");
    if (!units && actual.note.trim().length < 5) throw closureError("ORDER_CLOSURE_INVALID", "Explique las asignaciones con cero horas reales (mínimo 5 caracteres).");
    await client.query("UPDATE service_order_labor_allocation SET actual_hours=$2, actual_note=$3 WHERE id=$1", [row.id, units / 100, actual.note.trim() || null]);
  }
  if (total > 99999999) throw closureError("ORDER_CLOSURE_INVALID", "El total de horas reales excede el límite de la orden.");
  await client.query("UPDATE service_order SET closure_notes=$2, excess_reason=$3 WHERE id=$1", [order.id, data.notes || null, data.excessReason || null]);
  return { before: allocations.map((row) => ({ allocationId: row.id, hours: row.actual_hours, note: row.actual_note })), after: data.actuals,
    previousNotes: order.closure_notes, previousExcessReason: order.excess_reason, notes: data.notes, excessReason: data.excessReason };
}

async function closeOrder(client, order, actor) {
  requireConfirmedEquipment(order);
  if (order.labor_review_required) throw closureError("ORDER_CLOSURE_INVALID", "Revise las horas anteriores antes de cerrar.");
  const { rows: equipment } = await client.query("SELECT equipment_id FROM service_order_equipment WHERE service_order_id=$1", [order.id]);
  const { rows: requirements } = await client.query(
    `SELECT r.*, COUNT(f.id)::int AS file_count FROM service_order_closure_requirement r
     LEFT JOIN service_order_closure_file f ON f.requirement_id=r.id AND f.retired_at IS NULL
     WHERE r.service_order_id=$1 GROUP BY r.id`, [order.id]);
  if (!equipment.length || requirements.length !== equipment.length * CLOSURE_DOCUMENTS.length || requirements.some((row) => row.not_applicable ? !row.justification || row.justification.trim().length < 5 : !row.file_count)) {
    throw closureError("ORDER_CLOSURE_INVALID", "Cada equipo necesita los cuatro documentos o una justificación de No aplica por categoría.");
  }
  const { rows: files } = await client.query(
    `SELECT f.* FROM service_order_closure_file f JOIN service_order_closure_requirement r ON r.id=f.requirement_id
     WHERE r.service_order_id=$1 AND f.retired_at IS NULL`, [order.id]);
  await Promise.all(files.map(assertClosureFileAvailable));
  const { rows: allocations } = await client.query(
    `SELECT a.*, EXISTS (SELECT 1 FROM service_order_technician t WHERE t.service_order_id=a.service_order_id AND t.technical_id=a.technical_id) AS programmed
     FROM service_order_labor_allocation a WHERE a.service_order_id=$1`, [order.id]);
  const totals = new Map();
  let actualUnits = 0;
  let exceeded = false;
  for (const row of allocations) {
    if (!row.programmed || row.actual_hours == null || (hourUnits(row.actual_hours) === 0 && (!row.actual_note || row.actual_note.trim().length < 5))) {
      throw closureError("ORDER_CLOSURE_INVALID", "Registre las horas reales de todos los técnicos programados y explique las asignaciones con cero horas.");
    }
    const units = hourUnits(row.actual_hours);
    actualUnits += units;
    totals.set(row.par_item_id, (totals.get(row.par_item_id) || 0) + units);
    if (units > hourUnits(row.hours)) exceeded = true;
  }
  const budget = await getLaborBudget(order.par_id, order.id, client);
  for (const [itemId, units] of totals) {
    const item = budget.items.find((entry) => entry.id === itemId);
    if (!item) throw closureError("ORDER_CLOSURE_INVALID", "Una asignación ya no pertenece al presupuesto del PAR.");
    if (units > hourUnits(item.available_hours)) exceeded = true;
  }
  if (exceeded && (!order.excess_reason || order.excess_reason.trim().length < 5)) throw closureError("ORDER_CLOSURE_INVALID", "Justifique el exceso de horas respecto a la estimación o al saldo del PAR antes de cerrar.");
  if (actualUnits > 99999999) throw closureError("ORDER_CLOSURE_INVALID", "El total de horas reales excede el límite de la orden.");
  await client.query(
    `UPDATE service_order SET status='Completada', actual_hours=$2, closed_by=$3, closed_at=now()
     WHERE id=$1`, [order.id, actualUnits / 100, actor.userId]);
  return { estimatedHours: order.worked_hours, actualHours: actualUnits / 100, exceeded, excessReason: order.excess_reason, notes: order.closure_notes };
}

export async function updateClosure(id, data, actor) {
  return withTransaction(async (client) => {
    const order = await lockClosure(client, id, actor, data.revision, data.action === "close");
    let details;
    if (data.action === "equipment") {
      if (order.equipment_scope_confirmed) throw closureError("ORDER_CLOSURE_LOCKED", "Los equipos de esta orden ya fueron confirmados.");
      const equipment = await resolveOrderEquipment(client, order.par_id, data.equipmentIds);
      await replaceOrderEquipment(client, id, equipment);
      details = { equipmentIds: data.equipmentIds };
    } else if (data.action === "hours") details = await saveActualHours(client, order, data);
    else if (data.action === "requirement") {
      requireConfirmedEquipment(order);
      const requirement = await getRequirement(client, id, data.equipmentId, data.category);
      if (data.notApplicable && data.justification.trim().length < 5) throw closureError("ORDER_CLOSURE_INVALID", "Justifique No aplica con al menos 5 caracteres.");
      const { rows: active } = await client.query("SELECT id FROM service_order_closure_file WHERE requirement_id=$1 AND retired_at IS NULL", [requirement.id]);
      if (data.notApplicable && active.length) throw closureError("ORDER_CLOSURE_INVALID", "Retire los archivos vigentes antes de marcar No aplica.");
      await client.query("UPDATE service_order_closure_requirement SET not_applicable=$2, justification=$3, updated_by=$4, updated_at=now() WHERE id=$1", [requirement.id, data.notApplicable, data.notApplicable ? data.justification.trim() : null, actor.userId]);
      details = { equipmentId: data.equipmentId, category: data.category, before: { notApplicable: requirement.not_applicable, justification: requirement.justification }, notApplicable: data.notApplicable, justification: data.justification };
    } else if (data.action === "close") details = await closeOrder(client, order, actor);
    else throw closureError("ORDER_CLOSURE_INVALID", "Acción inválida.");
    await recordEvent(client, id, actor, data.action, details);
    // Responder la revisión confirmada por esta operación, sin mezclar cambios posteriores.
    return readClosure(client, id);
  });
}

export async function addClosureFile(id, data, file, actor) {
  return withTransaction(async (client) => {
    const order = await lockClosure(client, id, actor, data.revision);
    requireConfirmedEquipment(order);
    const requirement = await getRequirement(client, id, data.equipmentId, data.category);
    if (requirement.not_applicable) throw closureError("ORDER_CLOSURE_INVALID", "Quite No aplica antes de adjuntar archivos.");
    if (data.replaceId) {
      const result = await client.query("UPDATE service_order_closure_file SET retired_at=now(),retired_by=$3,retirement_reason=$4 WHERE id=$1 AND requirement_id=$2 AND retired_at IS NULL RETURNING id", [data.replaceId, requirement.id, actor.userId, "Reemplazado por " + file.original_name]);
      if (!result.rowCount) throw closureError("ORDER_CLOSURE_CONFLICT", "El archivo a reemplazar ya no está vigente en esta categoría.");
    }
    await persistClosureFile(file);
    await client.query(
      `INSERT INTO service_order_closure_file(id,requirement_id,storage_key,original_name,mime_type,byte_size,sha256,uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [file.id, requirement.id, file.storage_key, file.original_name, file.mime_type, file.byte_size, file.sha256, actor.userId]);
    await recordEvent(client, id, actor, data.replaceId ? "replace_file" : "upload_file", { fileId: file.id, name: file.original_name, equipmentId: data.equipmentId, category: data.category, replacedFileId: data.replaceId || null });
    // Responder la revisión confirmada por esta operación, sin mezclar cambios posteriores.
    return readClosure(client, id);
  });
}

export async function retireClosureFile(id, fileId, data, actor) {
  return withTransaction(async (client) => {
    await lockClosure(client, id, actor, data.revision);
    const { rows } = await client.query(
      `UPDATE service_order_closure_file f SET retired_at=now(), retired_by=$3, retirement_reason=$4
       FROM service_order_closure_requirement r WHERE r.id=f.requirement_id AND r.service_order_id=$1
       AND f.id=$2 AND f.retired_at IS NULL RETURNING f.id,f.original_name`, [id, fileId, actor.userId, data.reason]);
    if (!rows.length) throw closureError("ORDER_CLOSURE_NOT_FOUND", "Archivo vigente no encontrado en esta orden.");
    await recordEvent(client, id, actor, "retire_file", { fileId, name: rows[0].original_name, reason: data.reason });
    // Responder la revisión confirmada por esta operación, sin mezclar cambios posteriores.
    return readClosure(client, id);
  });
}

export async function findClosureFile(id, fileId) {
  const { rows } = await query(
    `SELECT f.* FROM service_order_closure_file f JOIN service_order_closure_requirement r ON r.id=f.requirement_id
     WHERE r.service_order_id=$1 AND f.id=$2`, [id, fileId]);
  if (!rows.length) throw closureError("ORDER_CLOSURE_NOT_FOUND", "Archivo no encontrado en esta orden.");
  return rows[0];
}
