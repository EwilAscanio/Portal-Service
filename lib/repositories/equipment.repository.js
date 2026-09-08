import { query } from "@/lib/db";

const EQUIPMENT_SELECT = `
  SELECT
    e.id,
    e.name,
    e.brand,
    e.model,
    e.serial,
    e.client_id,
    c.description AS client_name,
    e.location,
    e.status,
    e.last_maintenance,
    e.next_maintenance,
    e.created_at,
    e.updated_at
  FROM equipment e
  LEFT JOIN client c ON c.id = e.client_id
`;

export async function findAll({ status, search, clientId } = {}) {
  let sql = `${EQUIPMENT_SELECT} WHERE 1=1`;
  const params = [];
  let i = 1;

  if (status) {
    sql += ` AND e.status = $${i++}`;
    params.push(status);
  }
  if (clientId) {
    sql += ` AND e.client_id = $${i++}`;
    params.push(clientId);
  }
  if (search) {
    sql += ` AND (e.name ILIKE $${i} OR e.brand ILIKE $${i} OR e.model ILIKE $${i} OR e.serial ILIKE $${i} OR c.description ILIKE $${i})`;
    params.push(`%${search}%`);
    i++;
  }

  sql += " ORDER BY e.created_at DESC";
  const { rows } = await query(sql, params);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`${EQUIPMENT_SELECT} WHERE e.id = $1`, [id]);
  return rows[0] || null;
}

export async function existsBySerial(serial, excludeId) {
  const { rows } = await query(
    `
    SELECT EXISTS (
      SELECT 1 FROM equipment
      WHERE lower(serial) = lower($1)
        AND ($2::uuid IS NULL OR id <> $2::uuid)
    ) AS taken
    `,
    [serial, excludeId ?? null]
  );
  return rows[0]?.taken ?? false;
}

export async function create({ name, brand, model, serial, clientId, location, status, lastMaintenance, nextMaintenance }) {
  const { rows } = await query(
    `INSERT INTO equipment (name, brand, model, serial, client_id, location, status, last_maintenance, next_maintenance)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [name, brand, model, serial, clientId, location, status || "Operativo", lastMaintenance, nextMaintenance]
  );
  return findById(rows[0].id);
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
    clientId: "client_id",
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
    `UPDATE equipment SET ${fields.join(", ")} WHERE id = $${i} RETURNING id`,
    values
  );
  return findById(rows[0].id);
}

export async function findParRefs(equipmentId) {
  const { rows } = await query(
    `SELECT h.par_number, h.status
     FROM par_equipment pe
     JOIN par_header h ON h.id = pe.par_id
     WHERE pe.equipment_id = $1
     ORDER BY h.par_number ASC`,
    [equipmentId]
  );
  return rows;
}

export async function updateStatus(id, status) {
  const { rows } = await query(
    "UPDATE equipment SET status = $1 WHERE id = $2 RETURNING id",
    [status, id]
  );
  return findById(rows[0].id);
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
