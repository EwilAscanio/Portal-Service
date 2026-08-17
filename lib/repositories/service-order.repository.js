import { query } from "@/lib/db";

export async function findAll({ status, priority, search } = {}) {
  let sql = "SELECT * FROM service_order WHERE 1=1";
  const params = [];
  let i = 1;

  if (status) {
    sql += ` AND status = $${i++}`;
    params.push(status);
  }
  if (priority) {
    sql += ` AND priority = $${i++}`;
    params.push(priority);
  }
  if (search) {
    sql += ` AND (order_code ILIKE $${i} OR client_description ILIKE $${i} OR equipment_name ILIKE $${i} OR technician_name ILIKE $${i})`;
    params.push(`%${search}%`);
    i++;
  }

  sql += " ORDER BY created_at DESC";
  const { rows } = await query(sql, params);
  return rows;
}

export async function findById(id) {
  const { rows } = await query("SELECT * FROM service_order WHERE id = $1", [id]);
  return rows[0] || null;
}

export async function create({ orderCode, clientDescription, equipmentName, type, technicianName, priority, status, scheduledDate, amount, parId }) {
  const { rows } = await query(
    `INSERT INTO service_order (order_code, client_description, equipment_name, type, technician_name, priority, status, scheduled_date, amount, par_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [orderCode, clientDescription, equipmentName, type, technicianName, priority || "Media", status || "Pendiente", scheduledDate, amount || 0, parId || null]
  );
  return rows[0];
}

export async function update(id, data) {
  const fields = [];
  const values = [];
  let i = 1;

  const map = {
    orderCode: "order_code",
    clientDescription: "client_description",
    equipmentName: "equipment_name",
    type: "type",
    technicianName: "technician_name",
    priority: "priority",
    status: "status",
    scheduledDate: "scheduled_date",
    amount: "amount",
    parId: "par_id",
  };

  for (const [key, col] of Object.entries(map)) {
    if (data[key] !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(data[key]);
    }
  }

  if (fields.length === 0) return findById(id);

  values.push(id);
  const { rows } = await query(
    `UPDATE service_order SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function updateStatus(id, status) {
  const { rows } = await query(
    "UPDATE service_order SET status = $1 WHERE id = $2 RETURNING *",
    [status, id]
  );
  return rows[0] || null;
}

export async function getStats() {
  const { rows } = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'Pendiente')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'En Proceso')::int AS in_progress,
      COUNT(*) FILTER (WHERE status = 'Completada')::int AS completed,
      COUNT(*) FILTER (WHERE status = 'Cancelada')::int AS cancelled,
      COALESCE(SUM(amount) FILTER (WHERE status = 'Completada'), 0)::numeric AS total_revenue
    FROM service_order
  `);
  return rows[0];
}
