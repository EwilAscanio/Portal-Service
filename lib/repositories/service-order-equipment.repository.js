import { closureError, CLOSURE_DOCUMENTS } from "@/lib/service-order-closure";

export async function resolveOrderEquipment(client, parId, ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 500 || new Set(ids).size !== ids.length) {
    throw closureError("ORDER_CLOSURE_INVALID", "Seleccione al menos un equipo del PAR, sin repetir.");
  }
  const { rows } = await client.query(
    `SELECT pe.equipment_id AS id, COALESCE(e.name, pe.tipo) AS name, pe.tipo AS type,
       pe.marca AS brand, pe.modelo AS model, COALESCE(e.serial, pe.serial) AS serial,
       pe.observaciones AS description, pe.is_main
     FROM par_equipment pe JOIN equipment e ON e.id = pe.equipment_id
     WHERE pe.par_id = $1 AND pe.equipment_id = ANY($2::uuid[])
     ORDER BY pe.is_main DESC, pe.item_no`, [parId, ids]);
  if (rows.length !== ids.length || rows.some((row) => !row.description?.trim())) {
    throw closureError("ORDER_CLOSURE_INVALID", "Los equipos deben pertenecer al PAR y tener una descripción del trabajo.");
  }
  return rows;
}

// Solo durante programación o confirmación inicial histórica, antes de adjuntar documentos.
export async function replaceOrderEquipment(client, orderId, equipment) {
  const { rows: attached } = await client.query(
    `SELECT f.id FROM service_order_closure_file f JOIN service_order_closure_requirement r ON r.id = f.requirement_id
     WHERE r.service_order_id = $1 LIMIT 1`, [orderId]);
  if (attached.length) throw closureError("ORDER_CLOSURE_LOCKED", "Los equipos ya tienen documentos asociados.");
  await client.query("DELETE FROM service_order_equipment WHERE service_order_id = $1", [orderId]);
  for (const [position, row] of equipment.entries()) {
    await client.query(
      `INSERT INTO service_order_equipment(service_order_id,equipment_id,position,name,type,brand,model,serial,description,is_main)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [orderId, row.id, position, row.name, row.type, row.brand, row.model, row.serial, row.description, position === 0]);
    for (const category of CLOSURE_DOCUMENTS) {
      await client.query("INSERT INTO service_order_closure_requirement(service_order_id,equipment_id,category) VALUES ($1,$2,$3)", [orderId, row.id, category.value]);
    }
  }
  await client.query(
    `UPDATE service_order SET equipment_id=$2, equipment_name=$3, work_description=$4,
     equipment_scope_confirmed=true, updated_at=now() WHERE id=$1`,
    [orderId, equipment[0].id, equipment[0].name, equipment.map((row) => row.description.trim()).join("\n")]);
}
