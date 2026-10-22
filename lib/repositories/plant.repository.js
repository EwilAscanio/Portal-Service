import { query } from "@/lib/db";

const PLANT_SELECT = `
  SELECT p.id, p.name, p.code, p.address, p.client_id,
         c.codclie AS client_code, c.description AS client_name,
         p.created_at, p.updated_at
  FROM plant p
  JOIN client c ON c.id = p.client_id
`;

export async function findAll({ clientId, search } = {}) {
  let sql = `${PLANT_SELECT} WHERE 1=1`;
  const params = [];
  if (clientId) {
    params.push(clientId);
    sql += ` AND p.client_id = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (p.name ILIKE $${params.length} OR p.code ILIKE $${params.length} OR p.address ILIKE $${params.length} OR c.description ILIKE $${params.length})`;
  }
  const { rows } = await query(`${sql} ORDER BY c.description, p.name`, params);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`${PLANT_SELECT} WHERE p.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function create({ name, code, address, clientId }) {
  const { rows: clients } = await query("SELECT 1 FROM client WHERE id = $1 AND status = '1'", [clientId]);
  if (!clients.length) {
    const error = new Error("El cliente no existe o está inactivo en Saint.");
    error.code = "CLIENT_INACTIVE";
    throw error;
  }
  const { rows } = await query(
    `INSERT INTO plant (name, code, address, client_id) VALUES ($1, $2, $3, $4) RETURNING id`,
    [name, code, address || null, clientId]
  );
  return findById(rows[0].id);
}

export async function update(id, data) {
  const fields = [];
  const values = [];
  const map = { name: "name", code: "code", address: "address", clientId: "client_id" };
  for (const [key, column] of Object.entries(map)) {
    if (data[key] !== undefined) {
      values.push(data[key] || null);
      fields.push(`${column} = $${values.length}`);
    }
  }
  if (data.clientId) {
    const { rows: clients } = await query("SELECT 1 FROM client WHERE id = $1 AND status = '1'", [data.clientId]);
    if (!clients.length) {
      const error = new Error("El cliente no existe o está inactivo en Saint.");
      error.code = "CLIENT_INACTIVE";
      throw error;
    }
  }
  if (!fields.length) return findById(id);
  values.push(id);
  const { rows } = await query(
    `UPDATE plant SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING id`,
    values
  );
  return rows[0] ? findById(rows[0].id) : null;
}

export async function remove(id) {
  const { rowCount } = await query("DELETE FROM plant WHERE id = $1", [id]);
  return rowCount > 0;
}
