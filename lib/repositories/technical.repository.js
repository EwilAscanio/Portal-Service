import { query } from "@/lib/db";

const TECH_SELECT = `
  SELECT
    technical.id,
    technical.cedula,
    technical.name,
    technical.phone,
    technical.email,
    technical.status,
    technical.user_id,
    linked_user.name AS user_name,
    linked_user.login AS user_login,
    technical.created_at,
    technical.updated_at
  FROM technical
  LEFT JOIN users linked_user ON linked_user.id = technical.user_id
`;

export async function findAll() {
  const { rows } = await query(`${TECH_SELECT} ORDER BY technical.created_at ASC`);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`${TECH_SELECT} WHERE technical.id = $1`, [id]);
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

export async function create({ cedula, name, phone, email, status = "Activo", userId = null }) {
  const { rows } = await query(
    `
    INSERT INTO technical (cedula, name, phone, email, status, user_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
    `,
    [cedula, name, phone || null, email || null, status, userId || null]
  );
  return findById(rows[0].id);
}

export async function update(id, { cedula, name, phone, email, status, userId = null }) {
  await query(
    `
    UPDATE technical
    SET
      cedula  = $2,
      name    = $3,
      phone   = $4,
      email   = $5,
      status  = $6,
      user_id = $7
    WHERE id = $1
    `,
    [id, cedula, name, phone || null, email || null, status, userId || null]
  );
  return findById(id);
}

export async function setStatus(id, status) {
  await query(`UPDATE technical SET status = $2 WHERE id = $1`, [id, status]);
  return findById(id);
}

export async function findAssignableUsers(currentTechnicalId = null) {
  const { rows } = await query(
    `SELECT u.id, u.login, u.name, u.email, linked.id AS technical_id
     FROM users u
     JOIN role r ON r.id = u.role_id
     LEFT JOIN technical linked ON linked.user_id = u.id
     WHERE r.name = 'Técnico'
       AND u.status = 'Activo'
       AND (linked.id IS NULL OR linked.id = $1::uuid)
     ORDER BY u.name`,
    [currentTechnicalId]
  );
  return rows;
}
