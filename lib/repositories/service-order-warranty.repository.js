import { canManageWarranty, warrantyError } from "@/lib/warranty";

export async function assertWarrantyManager(client, userId) {
  const { rows } = await client.query('SELECT r.name AS role FROM users u JOIN role r ON r.id=u.role_id WHERE u.id=$1 AND u.status=\'Activo\'', [userId]);
  if (!canManageWarranty(rows[0]?.role)) throw warrantyError("Solo los gestores de servicio pueden preparar o gestionar una garantía.", true);
}

export function warrantyInput(order) {
  return { orderKind: order.order_kind, warrantyOrigin: order.warranty_origin,
    warrantyOriginOrderId: order.warranty_origin_order_id, warrantyReference: order.warranty_reference,
    warrantyServiceDate: order.warranty_service_date, warrantyReason: order.warranty_reason };
}

export function assertWarrantyIdentity(current, data) {
  for (const [key, value] of Object.entries(warrantyInput(current))) {
    if (key === "warrantyReason" || data[key] === undefined) continue;
    // Identidad y documento de origen no se convierten al editar una orden existente.
    if (String(data[key] ?? "") !== String(value ?? "")) throw warrantyError("La clasificación y el origen de la orden no se pueden cambiar.");
  }
}

// OC/cotización no se capturan en garantías. Una edición que omite esos campos
// conserva referencias antiguas; ni siquiera un payload directo puede reemplazarlas.
export function assertWarrantyCommercialReferences(data, current = null) {
  if ((current?.order_kind || data.orderKind) !== "Garantia") return;
  for (const [field, column] of [["purchaseOrderNumber", "purchase_order_number"], ["quotationNumber", "quotation_number"]]) {
    if (data[field] === undefined || (current ? data[field] === current[column] : !data[field])) continue;
    throw warrantyError("Las O/S de garantía no permiten registrar ni cambiar orden de compra o cotización.");
  }
}

// El llamador mantiene el bloqueo del PAR. La evidencia original nunca se sobrescribe.
export async function prepareWarranty(client, par, data, equipment) {
  if ((data.orderKind || "Normal") === "Normal") {
    if (par.purpose === "ReferenciaGarantia") throw warrantyError("Un PAR de referencia solo permite órdenes de garantía.");
    if ([data.warrantyOrigin,data.warrantyOriginOrderId,data.warrantyReference,data.warrantyServiceDate,data.warrantyReason].some(Boolean) || data.warrantyWorks?.length) throw warrantyError("Los datos de garantía solo corresponden a una O/S de garantía.");
    return equipment;
  }
  if (!data.warrantyReason || data.warrantyReason.trim().length < 5 || data.warrantyReason.length > 2000) throw warrantyError("Explique el motivo de garantía (5–2000 caracteres).");
  if (data.warrantyOrigin === "Registered") {
    const { rows } = await client.query("SELECT id,par_id,status FROM service_order WHERE id=$1 FOR SHARE", [data.warrantyOriginOrderId]);
    if (!rows[0] || rows[0].status !== "Completada" || rows[0].par_id !== par.id) throw warrantyError("Seleccione una O/S completada del mismo PAR.");
    const { rows: original } = await client.query("SELECT equipment_id FROM service_order_equipment WHERE service_order_id=$1", [rows[0].id]);
    if (equipment.some((row) => !original.some((entry) => entry.equipment_id === row.id))) throw warrantyError("Seleccione equipos atendidos por la O/S original.");
    if (data.warrantyReference || data.warrantyServiceDate) throw warrantyError("La referencia externa no corresponde a una O/S registrada.");
  } else if (data.warrantyOrigin === "External") {
    if (data.warrantyOriginOrderId || !data.warrantyReference || data.warrantyReference.trim().length < 5 || data.warrantyReference.length > 500) throw warrantyError("Identifique el servicio anterior mediante una referencia de 5–500 caracteres.");
  } else throw warrantyError("Seleccione el origen de la garantía.");
  const works = new Map((data.warrantyWorks || []).map((row) => [row.equipmentId,row.description?.trim()]));
  if (works.size !== equipment.length || works.size !== data.warrantyWorks?.length || equipment.some((row) => !works.get(row.id) || works.get(row.id).length > 10000)) throw warrantyError("Describa el trabajo de garantía para cada equipo seleccionado.");
  return equipment.map((row) => ({ ...row, description: works.get(row.id) }));
}
