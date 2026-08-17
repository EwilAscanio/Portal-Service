import { query } from "@/lib/db";

export async function findAll({ status, search } = {}) {
  let sql = "SELECT * FROM equipment WHERE 1=1";
  const params = [];
  let i = 1;

  if (status) {
    sql += ` AND status = $${i++}`;
    params.push(status);
  }
  if (search) {
    sql += ` AND (name ILIKE $${i} OR brand ILIKE $${i} OR model ILIKE $${i} OR serial ILIKE $${i} OR client_description ILIKE $${i})`;
    params.push(`%${search}%`);
    i++;
  }

  sql += " ORDER BY created_at DESC";
  const { rows } = await query(sql, params);
  return rows;
}

export async function findById(id) {
  const { rows } = await query("SELECT * FROM equipment WHERE id = $1", [id]);
  return rows[0] || null;
}

export async function create({ name, brand, model, serial, clientDescription, location, status, lastMaintenance, nextMaintenance }) {
  const { rows } = await query(
    `INSERT INTO equipment (name, brand, model, serial, client_description, location, status, last_maintenance, next_maintenance)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [name, brand, model, serial, clientDescription, location, status || "Operativo", lastMaintenance, nextMaintenance]
  );
  return rows[0];
}

export async function update(id, data) {
  const fields = [];
  const values = [];
  let i = 1;

  const map = {
    name: "name",
    brand: "brand",
    model: "model",
    serial: "serial",
    clientDescription: "client_description",
    location: "location",
    status: "status",
    lastMaintenance: "last_maintenance",
    nextMaintenance: "next_maintenance",
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
    `UPDATE equipment SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function updateStatus(id, status) {
  const { rows } = await query(
    "UPDATE equipment SET status = $1 WHERE id = $2 RETURNING *",
    [status, id]
  );
  return rows[0] || null;
}

export async function getStats() {
  const { rows } = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'Operativo')::int AS operational,
      COUNT(*) FILTER (WHERE status = 'En Mantenimiento')::int AS in_maintenance,
      COUNT(*) FILTER (WHERE status = 'Fuera de Servicio')::int AS out_of_service
    FROM equipment
  `);
  return rows[0];
}
