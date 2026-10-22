import { query } from "@/lib/db";

const CONTACT_SELECT = `
  SELECT ct.id, ct.name, ct.department, ct.client_id, ct.plant_id, ct.phone, ct.email,
         c.codclie AS client_code, c.description AS client_name,
         p.name AS plant_name, ct.created_at, ct.updated_at
  FROM contact ct
  JOIN client c ON c.id = ct.client_id
  JOIN plant p ON p.id = ct.plant_id
`;

export async function findAll({ clientId, plantId, search } = {}) {
  let sql = `${CONTACT_SELECT} WHERE 1=1`;
  const params = [];
  if (clientId) {
    params.push(clientId);
    sql += ` AND ct.client_id = $${params.length}`;
  }
  if (plantId) {
    params.push(plantId);
    sql += ` AND ct.plant_id = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (ct.name ILIKE $${params.length} OR ct.department ILIKE $${params.length} OR ct.phone ILIKE $${params.length} OR ct.email ILIKE $${params.length})`;
  }
  const { rows } = await query(`${sql} ORDER BY ct.name`, params);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`${CONTACT_SELECT} WHERE ct.id = $1`, [id]);
  return rows[0] ?? null;
}

async function assertPlantBelongsToClient(plantId, clientId) {
  const { rows } = await query(
    "SELECT 1 FROM plant p JOIN client c ON c.id = p.client_id WHERE p.id = $1 AND p.client_id = $2 AND c.status = '1'",
    [plantId, clientId]
  );
  if (!rows.length) {
    const error = new Error("La planta no pertenece al cliente seleccionado.");
    error.code = "CONTACT_RELATION_INVALID";
    throw error;
  }
}

export async function create({ name, department, clientId, plantId, phone, email }) {
  await assertPlantBelongsToClient(plantId, clientId);
  const { rows } = await query(
    `INSERT INTO contact (name, department, client_id, plant_id, phone, email)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [name, department || null, clientId, plantId, phone || null, email || null]
  );
  return findById(rows[0].id);
}

export async function update(id, data) {
  const current = await findById(id);
  if (!current) return null;
  const clientId = data.clientId ?? current.client_id;
  const plantId = data.plantId ?? current.plant_id;
  await assertPlantBelongsToClient(plantId, clientId);
  const fields = [];
  const values = [];
  const map = { name: "name", department: "department", clientId: "client_id", plantId: "plant_id", phone: "phone", email: "email" };
  for (const [key, column] of Object.entries(map)) {
    if (data[key] !== undefined) {
      values.push(data[key] || null);
      fields.push(`${column} = $${values.length}`);
    }
  }
  if (!fields.length) return current;
  values.push(id);
  const { rows } = await query(
    `UPDATE contact SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING id`,
    values
  );
  return rows[0] ? findById(rows[0].id) : null;
}

export async function remove(id) {
  const { rowCount } = await query("DELETE FROM contact WHERE id = $1", [id]);
  return rowCount > 0;
}
