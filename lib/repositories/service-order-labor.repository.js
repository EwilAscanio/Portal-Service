import { query } from "@/lib/db";
import { hourUnits, sumLaborHours } from "@/lib/labor-hours";

export function laborError(code, message) {
  return Object.assign(new Error(message), { code });
}

export async function getLaborBudget(parId, orderId = null, client = { query }) {
  const { rows: headers } = await client.query("SELECT id, budgeted_hours FROM par_header WHERE id = $1", [parId]);
  if (!headers.length) throw laborError("PAR_NOT_FOUND", "PAR no encontrado.");
  const { rows: items } = await client.query(
    `SELECT i.id, i.item_no, i.product_id, p.code AS product_code, i.descripcion AS description,
            COALESCE(i.qty, 0) AS budgeted_hours, COALESCE(a.committed_hours, 0) AS committed_hours,
            COALESCE(i.qty, 0) - COALESCE(a.committed_hours, 0) AS available_hours
     FROM par_item i LEFT JOIN product p ON p.id = i.product_id
     LEFT JOIN LATERAL (
       SELECT SUM(CASE WHEN so.closed_at IS NOT NULL THEN a.actual_hours ELSE a.hours END) AS committed_hours FROM service_order_labor_allocation a
       JOIN service_order so ON so.id = a.service_order_id
       WHERE a.par_item_id = i.id AND so.status <> 'Cancelada'
         AND ($2::int IS NULL OR so.id <> $2)
     ) a ON true
     WHERE i.par_id = $1 AND i.requires_technician ORDER BY i.item_no, i.id`,
    [parId, orderId]
  );
  const { rows: pendingReviewOrders } = await client.query(
    `SELECT id, order_code FROM service_order WHERE par_id = $1
       AND labor_review_required AND status <> 'Cancelada'
       AND ($2::int IS NULL OR id <> $2) ORDER BY id`, [parId, orderId]
  );
  return { ...headers[0], items, pendingReviewOrders };
}

// El llamador mantiene FOR UPDATE sobre par_header antes de leer el saldo y escribir.
// Abiertas reservan estimaciones; cerradas con expediente consumen horas reales.
// Los cierres históricos sin ejecución confirmada conservan su reserva anterior.
export async function prepareLaborAllocations(client, parId, orderId, allocations, { reviewing = false } = {}) {
  if (!Array.isArray(allocations) || (!reviewing && !allocations.length) || allocations.length > 500) {
    throw laborError("ORDER_LABOR_INVALID", "Asigne horas de al menos un renglón del PAR a un técnico.");
  }
  const budget = await getLaborBudget(parId, orderId, client);
  if (!reviewing && budget.pendingReviewOrders.length) {
    throw laborError("ORDER_LABOR_REVIEW_REQUIRED", `Revise primero la distribución de horas de: ${budget.pendingReviewOrders.map((order) => order.order_code).join(", ")}.`);
  }
  const byId = new Map(budget.items.map((row) => [row.id, row]));
  const totals = new Map();
  const pairs = new Set();
  const result = allocations.map((row) => {
    const item = byId.get(Number(row.parItemId));
    const units = hourUnits(row.hours);
    const pair = `${row.parItemId}:${row.technicalId}`;
    if (!item || !Number.isFinite(Number(row.hours)) || units <= 0 || Math.abs(Number(row.hours) * 100 - units) > 0.000001 || pairs.has(pair)) {
      throw laborError("ORDER_LABOR_INVALID", "Use renglones de mano de obra de este PAR, horas positivas con hasta dos decimales y un registro por técnico en cada renglón.");
    }
    pairs.add(pair);
    totals.set(item.id, (totals.get(item.id) || 0) + units);
    if (totals.get(item.id) > hourUnits(item.available_hours)) {
      throw laborError("ORDER_LABOR_EXCEEDED", `El renglón ${item.item_no} (${item.description}) dispone de ${item.available_hours} horas. Actualice el saldo y ajuste la distribución.`);
    }
    return { ...row, hours: units / 100, item };
  });
  if (sumLaborHours(result) > 999999.99) throw laborError("ORDER_LABOR_INVALID", "El total de horas excede el límite de la orden.");
  return result;
}

export async function replaceLaborAllocations(client, orderId, allocations, technicians) {
  const byId = new Map(technicians.map((row) => [row.id, row]));
  await client.query("DELETE FROM service_order_labor_allocation WHERE service_order_id = $1", [orderId]);
  for (const row of allocations) {
    await client.query(
      `INSERT INTO service_order_labor_allocation
         (service_order_id, par_item_id, source_item_id, source_item_no, product_id,
          product_code, description, technical_id, technician_name, hours)
       VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [orderId, row.item.id, row.item.item_no, row.item.product_id, row.item.product_code,
        row.item.description, row.technicalId, byId.get(row.technicalId).name, row.hours]
    );
  }
}
