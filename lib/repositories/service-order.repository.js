import { query, withTransaction } from "@/lib/db";
import { PAR_LINKABLE_STATUSES } from "@/lib/par-policy";
import { canEditServiceOrder } from "@/lib/service-order-policy";
import { allocationTechnicianIds, sumLaborHours } from "@/lib/labor-hours";
import { prepareLaborAllocations, replaceLaborAllocations } from "@/lib/repositories/service-order-labor.repository";
import { resolveOrderEquipment, replaceOrderEquipment } from "@/lib/repositories/service-order-equipment.repository";

const ORDER_SELECT = `
  SELECT so.*, ph.par_number, ph.budgeted_hours, ph.observations AS par_observations,
         COALESCE((SELECT json_agg(a ORDER BY a.source_item_no, a.id)
           FROM service_order_labor_allocation a WHERE a.service_order_id = so.id), '[]'::json) AS labor_allocations,
         c.description AS client_name, c.codclie AS client_code, c.rif AS client_rif,
         COALESCE(NULLIF(c.address1, ''), c.address2) AS client_address,
         c.phone AS client_phone, c.email AS client_email,
         p.name AS plant_name, p.address AS plant_address,
         ct.name AS contact_name, ct.phone AS contact_phone, ct.email AS contact_email,
         e.name AS equipment_display_name,
         creator.name AS prepared_by_name, approver.name AS approved_by_name, reviewer.name AS labor_reviewed_by_name,
         closer.name AS closed_by_name,
         COALESCE((
           SELECT string_agg(t.name, ', ' ORDER BY sot.is_lead DESC, sot.assigned_at, t.name)
           FROM service_order_technician sot
           JOIN technical t ON t.id = sot.technical_id
           WHERE sot.service_order_id = so.id
         ), so.technician_name) AS technician_display_name,
         COALESCE((
           SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'is_lead', sot.is_lead)
                           ORDER BY sot.is_lead DESC, sot.assigned_at, t.name)
           FROM service_order_technician sot
           JOIN technical t ON t.id = sot.technical_id
           WHERE sot.service_order_id = so.id
         ), '[]'::json) AS technicians,
         COALESCE((
           SELECT json_agg(json_build_object(
              'id', pe.equipment_id, 'name', pe.name,
              'type', pe.type, 'brand', pe.brand, 'model', pe.model,
              'serial', pe.serial, 'description', pe.description,
              'is_main', pe.is_main
           ) ORDER BY pe.position)
           FROM service_order_equipment pe
           WHERE pe.service_order_id = so.id
         ), '[]'::json) AS equipment,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', pi.product_id, 'description', pi.descripcion, 'quantity', pi.qty
           ) ORDER BY pi.item_no)
           FROM par_item pi WHERE pi.par_id = ph.id
         ), '[]'::json) AS items
  FROM service_order so
  JOIN par_header ph ON ph.id = so.par_id
  JOIN client c ON c.id = ph.client_id
  JOIN plant p ON p.id = ph.plant_id
  JOIN contact ct ON ct.id = ph.contact_id
  LEFT JOIN equipment e ON e.id = so.equipment_id
  JOIN users creator ON creator.id = so.prepared_by
  LEFT JOIN users approver ON approver.id = so.approved_by
  LEFT JOIN users reviewer ON reviewer.id = so.labor_reviewed_by
  LEFT JOIN users closer ON closer.id = so.closed_by
`;

function domainError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function getLinkablePar(client, parId) {
  // Serializa reservas de distintas órdenes y ediciones del mismo PAR.
  // La lectura posterior usa un snapshot nuevo si tuvo que esperar el bloqueo.
  await client.query("SELECT id FROM par_header WHERE id = $1 FOR UPDATE", [parId]);
  const { rows } = await client.query(
    `SELECT ph.id, ph.par_number, ph.status, ph.client_id, ph.plant_id, ph.contact_id,
            c.description AS client_description, c.status AS client_status,
            pe.equipment_id, COALESCE(e.name, pe.tipo) AS equipment_name,
            descriptions.work_description
     FROM par_header ph
     JOIN client c ON c.id = ph.client_id
     LEFT JOIN LATERAL (
       SELECT equipment_id, tipo FROM par_equipment
       WHERE par_id = ph.id ORDER BY is_main DESC, item_no LIMIT 1
     ) pe ON true
     LEFT JOIN equipment e ON e.id = pe.equipment_id
     LEFT JOIN LATERAL (
       SELECT string_agg(trim(px.observaciones), E'\n' ORDER BY px.is_main DESC, px.item_no, px.id)
         AS work_description
       FROM par_equipment px
       WHERE px.par_id = ph.id AND NULLIF(trim(px.observaciones), '') IS NOT NULL
     ) descriptions ON true
     WHERE ph.id = $1`,
    [parId]
  );
  const par = rows[0];
  if (!par) throw domainError("PAR_NOT_FOUND", "PAR no encontrado.");
  if (!PAR_LINKABLE_STATUSES.includes(par.status)) {
    throw domainError("PAR_NOT_APPROVED", "Solo se puede crear una orden desde un PAR aprobado.");
  }
  if (par.client_status !== "1") {
    throw domainError("CLIENT_INACTIVE", "El cliente del PAR está inactivo en Saint.");
  }
  if (!par.work_description?.trim()) {
    throw domainError("PAR_DESCRIPTION_REQUIRED", "El equipo del PAR debe tener una descripción del trabajo a realizar antes de crear la orden.");
  }
  if (!par.equipment_id) {
    throw domainError("PAR_EQUIPMENT_REQUIRED", "El PAR debe tener al menos un equipo registrado antes de crear la orden.");
  }
  return par;
}

async function resolveTechnicians(client, technicianIds) {
  const uniqueIds = [...new Set(technicianIds)];
  if (uniqueIds.length !== technicianIds.length || uniqueIds.length < 1 || uniqueIds.length > 3) {
    throw domainError("ORDER_TECHNICIANS_INVALID", "Seleccione entre 1 y 3 técnicos sin repetir.");
  }
  const { rows } = await client.query(
    "SELECT id, name FROM technical WHERE id = ANY($1::uuid[]) AND status = 'Activo'",
    [uniqueIds]
  );
  if (rows.length !== uniqueIds.length) {
    throw domainError("ORDER_TECHNICIANS_INVALID", "Todos los técnicos asignados deben existir y estar activos.");
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  return uniqueIds.map((id) => byId.get(id));
}

async function replaceTechnicians(client, orderId, technicians) {
  await client.query("DELETE FROM service_order_technician WHERE service_order_id = $1", [orderId]);
  for (let index = 0; index < technicians.length; index += 1) {
    await client.query(
      `INSERT INTO service_order_technician(service_order_id, technical_id, is_lead)
       VALUES ($1, $2, $3)`,
      [orderId, technicians[index].id, index === 0]
    );
  }
}

async function validateApproval(client, orderId, confirmScheduleConflict) {
  const { rows } = await client.query(
    `SELECT so.scheduled_start, so.scheduled_end,
            COUNT(sot.technical_id)::int AS technician_count,
            COUNT(sot.technical_id) FILTER (WHERE t.status = 'Activo')::int AS active_count
     FROM service_order so
     LEFT JOIN service_order_technician sot ON sot.service_order_id = so.id
     LEFT JOIN technical t ON t.id = sot.technical_id
     WHERE so.id = $1
     GROUP BY so.id`,
    [orderId]
  );
  const order = rows[0];
  if (!order || order.technician_count < 1 || order.technician_count > 3 || order.active_count !== order.technician_count) {
    throw domainError("ORDER_APPROVAL_INVALID", "La orden requiere entre uno y tres técnicos activos para aprobarse.");
  }
  if (new Date(order.scheduled_end) <= new Date(order.scheduled_start)) {
    throw domainError("ORDER_APPROVAL_INVALID", "La fecha final debe ser posterior a la fecha inicial.");
  }

  const { rows: conflicts } = await client.query(
    `SELECT DISTINCT other.id AS order_id, other.order_code,
            other.scheduled_start, other.scheduled_end,
            t.id AS technician_id, t.name AS technician_name
     FROM service_order current_order
     JOIN service_order_technician current_sot ON current_sot.service_order_id = current_order.id
     JOIN technical t ON t.id = current_sot.technical_id
     JOIN service_order_technician other_sot ON other_sot.technical_id = current_sot.technical_id
     JOIN service_order other ON other.id = other_sot.service_order_id
     WHERE current_order.id = $1
       AND other.id <> current_order.id
       AND other.approved_by IS NOT NULL
       AND other.approved_at IS NOT NULL
       AND other.status <> 'Cancelada'
       AND other.scheduled_start < current_order.scheduled_end
       AND other.scheduled_end > current_order.scheduled_start
     ORDER BY other.scheduled_start, t.name`,
    [orderId]
  );
  if (conflicts.length && !confirmScheduleConflict) {
    const error = domainError("ORDER_SCHEDULE_CONFLICT", "La programación se solapa con otra orden aprobada.");
    error.conflicts = conflicts;
    throw error;
  }
}

export async function findAll({ status, priority, search, clientId, plantId } = {}) {
  let sql = `${ORDER_SELECT} WHERE 1=1`;
  const params = [];
  const add = (value) => { params.push(value); return `$${params.length}`; };
  if (status) sql += ` AND so.status = ${add(status)}`;
  if (priority) sql += ` AND so.priority = ${add(priority)}`;
  if (clientId) sql += ` AND ph.client_id = ${add(clientId)}`;
  if (plantId) sql += ` AND ph.plant_id = ${add(plantId)}`;
  if (search) {
    const ref = add(`%${search}%`);
    sql += ` AND (so.order_code ILIKE ${ref} OR ph.par_number ILIKE ${ref}
      OR c.description ILIKE ${ref} OR p.name ILIKE ${ref}
      OR so.purchase_order_number ILIKE ${ref} OR so.quotation_number ILIKE ${ref}
      OR EXISTS (SELECT 1 FROM service_order_technician sot
        JOIN technical t ON t.id = sot.technical_id
        WHERE sot.service_order_id = so.id AND t.name ILIKE ${ref}))`;
  }
  const { rows } = await query(`${sql} ORDER BY so.created_at DESC`, params);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`${ORDER_SELECT} WHERE so.id = $1`, [id]);
  return rows[0] || null;
}

async function findByIdWithClient(client, id) {
  const { rows } = await client.query(`${ORDER_SELECT} WHERE so.id = $1`, [id]);
  return rows[0] || null;
}

export async function create(data, preparedBy) {
  return withTransaction(async (client) => {
    const par = await getLinkablePar(client, data.parId);
    const equipment = await resolveOrderEquipment(client, par.id, data.equipmentIds);
    if (data.reviewLabor || data.laborReviewNote) throw domainError("ORDER_LABOR_INVALID", "La revisión corresponde solo a órdenes anteriores.");
    const allocations = await prepareLaborAllocations(client, par.id, null, data.laborAllocations);
    const technicianIds = allocationTechnicianIds(allocations, data.leadTechnicianId);
    if (data.leadTechnicianId && !technicianIds.includes(data.leadTechnicianId)) throw domainError("ORDER_TECHNICIANS_INVALID", "El responsable debe tener horas asignadas.");
    const technicians = await resolveTechnicians(client, technicianIds);
    const lead = technicians[0];
    const { rows } = await client.query(
      `INSERT INTO service_order
        (purchase_order_number, quotation_number, par_id,
         client_id, plant_id, contact_id, equipment_id, technical_id,
         client_description, equipment_name, technician_name, type,
         work_type, service_type, call_date, scheduled_start, scheduled_end,
         scheduled_date, worked_hours, work_description, priority, status,
         amount, prepared_by, labor_review_required)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$16,$18,$19,$20,'Pendiente',0,$21,false)
        RETURNING id`,
      [data.purchaseOrderNumber || null, data.quotationNumber || null,
       par.id, par.client_id, par.plant_id, par.contact_id, par.equipment_id, lead.id,
       par.client_description, par.equipment_name, lead.name, data.serviceType,
       data.workType, data.serviceType, data.callDate, data.scheduledStart,
       data.scheduledEnd, sumLaborHours(allocations), par.work_description.trim(),
       data.priority || "Media", preparedBy]
    );
    await replaceTechnicians(client, rows[0].id, technicians);
    await replaceLaborAllocations(client, rows[0].id, allocations, technicians);
    await replaceOrderEquipment(client, rows[0].id, equipment);
    return findByIdWithClient(client, rows[0].id);
  });
}

const STATUS_TRANSITIONS = {
  Pendiente: ["Pendiente", "Aprobada", "Cancelada"],
  Aprobada: ["Aprobada", "En Proceso", "Cancelada"],
  "En Proceso": ["En Proceso", "Completada", "Cancelada"],
  Completada: ["Completada"],
  Cancelada: ["Cancelada"],
};

export async function update(id, data, actor = {}) {
  return withTransaction(async (client) => {
    const { rows: references } = await client.query("SELECT par_id FROM service_order WHERE id = $1", [id]);
    if (!references.length) return null;
    // Mismo orden de bloqueos que create y las ediciones del PAR: cabecera, luego orden.
    await client.query("SELECT id FROM par_header WHERE id = $1 FOR UPDATE", [references[0].par_id]);
    const { rows } = await client.query("SELECT * FROM service_order WHERE id = $1 FOR UPDATE", [id]);
    const current = rows[0];
    if (!current) return null;
    // El cierre valida el expediente bajo el mismo bloqueo PAR → O/S que las reservas.
    if (data.status === "Completada" && current.status !== "Completada") {
      throw domainError("ORDER_CLOSURE_REQUIRED", "Use Cerrar O/S para validar documentos y horas reales.");
    }
    if (data.parId !== undefined && Number(data.parId) !== current.par_id) {
      throw domainError("ORDER_PAR_IMMUTABLE", "El PAR de una orden no puede cambiarse.");
    }
    if (data.status && !STATUS_TRANSITIONS[current.status]?.includes(data.status)) {
      throw domainError("ORDER_STATUS_INVALID", `No se puede cambiar de ${current.status} a ${data.status}.`);
    }
    const reviewing = data.reviewLabor === true;
    const editableKeys = Object.keys(data).filter((key) => !["status", "confirmScheduleConflict"].includes(key));
    if (reviewing) {
      if (!actor.canApprove || !actor.userId) throw domainError("ORDER_LABOR_REVIEW_FORBIDDEN", "Solo Superadministrador, Administrador o Supervisor pueden revisar horas anteriores.");
      if (!Array.isArray(data.laborAllocations) || !current.labor_review_required || current.status === "Cancelada" || editableKeys.some((key) => !["reviewLabor", "laborReviewNote", "laborAllocations"].includes(key)) || data.status !== undefined || !data.laborReviewNote?.trim() || data.laborReviewNote.trim().length < 5) {
        throw domainError("ORDER_LABOR_INVALID", "La revisión requiere una orden anterior no cancelada, su distribución y una explicación; no permite cambiar otros datos.");
      }
    } else {
      if (data.laborReviewNote || data.reviewLabor !== undefined) throw domainError("ORDER_LABOR_INVALID", "Use la revisión de horas anteriores para registrar esta información.");
      if (current.labor_review_required && (editableKeys.length || (data.status && ![current.status, "Cancelada"].includes(data.status)))) {
        throw domainError("ORDER_LABOR_REVIEW_REQUIRED", "Revise la distribución de horas anteriores antes de editar o continuar la orden.");
      }
      if (editableKeys.length && !canEditServiceOrder(current.status)) throw domainError("ORDER_LOCKED", "La orden solo se puede editar mientras esté pendiente.");
    }
    if (data.workedHours !== undefined || data.technicianIds !== undefined) throw domainError("ORDER_LABOR_INVALID", "Las horas y los técnicos se calculan desde la distribución de mano de obra.");
    if (data.leadTechnicianId && !data.laborAllocations) throw domainError("ORDER_LABOR_INVALID", "Envíe la distribución para cambiar el responsable.");
    const equipment = data.equipmentIds !== undefined ? await resolveOrderEquipment(client, current.par_id, data.equipmentIds) : null;
    const allocations = data.laborAllocations !== undefined
      ? await prepareLaborAllocations(client, current.par_id, id, data.laborAllocations, { reviewing }) : null;
    let technicians = null;
    if (allocations) {
      if (reviewing) {
        // La conciliación conserva el equipo histórico y su agenda, incluso si hoy está inactivo.
        const { rows: historical } = await client.query(
          `SELECT t.id, t.name FROM service_order_technician sot JOIN technical t ON t.id = sot.technical_id
           WHERE sot.service_order_id = $1 ORDER BY sot.is_lead DESC, sot.assigned_at, t.name`, [id]);
        technicians = historical;
        if (allocations.some((row) => !historical.some((t) => t.id === row.technicalId))) throw domainError("ORDER_TECHNICIANS_INVALID", "Distribuya las horas entre los técnicos ya registrados en esta orden.");
      } else {
        const ids = allocationTechnicianIds(allocations, data.leadTechnicianId || current.technical_id);
        if (data.leadTechnicianId && !ids.includes(data.leadTechnicianId)) throw domainError("ORDER_TECHNICIANS_INVALID", "El responsable debe tener horas asignadas.");
        technicians = await resolveTechnicians(client, ids);
      }
    }
    const fields = [];
    const values = [];
    const addField = (column, value) => {
      values.push(value === "" ? null : value);
      fields.push(`${column} = $${values.length}`);
    };
    const map = {
      purchaseOrderNumber: "purchase_order_number", quotationNumber: "quotation_number",
      workType: "work_type",
      serviceType: "service_type", callDate: "call_date",
      scheduledStart: "scheduled_start", scheduledEnd: "scheduled_end",
      priority: "priority", status: "status",
    };
    for (const [key, column] of Object.entries(map)) {
      if (data[key] !== undefined) addField(column, data[key]);
    }
    if (data.serviceType !== undefined) addField("type", data.serviceType);
    if (data.scheduledStart !== undefined) addField("scheduled_date", data.scheduledStart);
    if (technicians && !reviewing) {
      addField("technical_id", technicians[0].id);
      addField("technician_name", technicians[0].name);
    }
    if (allocations) addField("worked_hours", sumLaborHours(allocations));
    if (reviewing) {
      addField("labor_review_required", false);
      addField("closure_revision", current.closure_revision + 1);
      addField("labor_review_note", data.laborReviewNote.trim());
      addField("labor_reviewed_by", actor.userId);
      addField("labor_reviewed_at", new Date());
    }
    if (data.status === "Aprobada" && current.status !== "Aprobada") {
      if (!actor.canApprove) throw domainError("ORDER_APPROVAL_FORBIDDEN", "No tiene permiso para aprobar órdenes.");
      addField("approved_by", actor.userId);
      addField("approved_at", new Date());
    }
    if (fields.length) {
      values.push(id);
      await client.query(
        `UPDATE service_order SET ${fields.join(", ")}, updated_at = now() WHERE id = $${values.length}`,
        values
      );
    }
    if (technicians && !reviewing) await replaceTechnicians(client, id, technicians);
    if (allocations) await replaceLaborAllocations(client, id, allocations, technicians);
    if (equipment) await replaceOrderEquipment(client, id, equipment);
    if (data.status === "Aprobada" && current.status !== "Aprobada") {
      await validateApproval(client, id, data.confirmScheduleConflict === true);
    }
    return findByIdWithClient(client, id);
  });
}

export async function updateStatus(id, status, actor) {
  return update(id, { status }, actor);
}

export async function getStats() {
  const { rows } = await query(`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'Pendiente')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'En Proceso')::int AS in_progress,
      COUNT(*) FILTER (WHERE status = 'Completada')::int AS completed,
      COUNT(*) FILTER (WHERE status = 'Cancelada')::int AS cancelled,
      COALESCE(SUM(amount) FILTER (WHERE status = 'Completada'), 0)::numeric AS total_revenue
    FROM service_order
  `);
  return rows[0];
}
