import { query } from "@/lib/db";

const TECH_SELECT = `
  SELECT
    id,
    cedula,
    name,
    phone,
    email,
    status,
    created_at,
    updated_at
  FROM technical
`;

export async function findAll() {
  const { rows } = await query(`${TECH_SELECT} ORDER BY created_at ASC`);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`${TECH_SELECT} WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function existsByCedula(cedula, excludeId) {
  const { rows } = await query(
    `
    SELECT EXISTS (
      SELECT 1 FROM technical
      WHERE lower(cedula) = lower($1)
        AND ($2::uuid IS NULL OR id <> $2::uuid)
    ) AS taken
    `,
    [cedula, excludeId ?? null]
  );
  return rows[0]?.taken ?? false;
}

export async function create({ cedula, name, phone, email, status = "Activo" }) {
  const { rows } = await query(
    `
    INSERT INTO technical (cedula, name, phone, email, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
    `,
    [cedula, name, phone || null, email || null, status]
  );
  return findById(rows[0].id);
}

export async function update(id, { cedula, name, phone, email, status }) {
  await query(
    `
    UPDATE technical
    SET
      cedula  = $2,
      name    = $3,
      phone   = $4,
      email   = $5,
      status  = $6
    WHERE id = $1
    `,
    [id, cedula, name, phone || null, email || null, status]
  );
  return findById(id);
}

export async function setStatus(id, status) {
  await query(`UPDATE technical SET status = $2 WHERE id = $1`, [id, status]);
  return findById(id);
}
