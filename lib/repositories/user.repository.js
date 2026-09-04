import { query } from "@/lib/db";

const USER_SELECT = `
  SELECT
    u.id,
    u.login,
    u.name,
    u.email,
    u.status,
    u.last_access_at,
    u.created_at,
    u.updated_at,
    r.id   AS role_id,
    r.name AS role
  FROM users u
  JOIN role r ON r.id = u.role_id
`;

export async function findByLogin(login) {
  const { rows } = await query(
    `
    SELECT
      u.id,
      u.login,
      u.name,
      u.email,
      u.password_hash,
      u.status,
      r.name AS role
    FROM users u
    JOIN role r ON r.id = u.role_id
    WHERE lower(u.login) = lower($1)
    LIMIT 1
    `,
    [login]
  );
  return rows[0] ?? null;
}

export async function findAll() {
  const { rows } = await query(`${USER_SELECT} ORDER BY u.created_at ASC`);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`${USER_SELECT} WHERE u.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function existsByLoginOrEmail({ login, email, excludeId }) {
  const { rows } = await query(
    `
    SELECT
      bool_or(lower(login) = lower($1)) AS login_taken,
      bool_or(lower(email) = lower($2)) AS email_taken
    FROM users
    WHERE (lower(login) = lower($1) OR lower(email) = lower($2))
      AND ($3::uuid IS NULL OR id <> $3::uuid)
    `,
    [login, email, excludeId ?? null]
  );
  return rows[0] ?? { login_taken: false, email_taken: false };
}

export async function create({ login, name, email, passwordHash, roleId, status = "Activo" }) {
  const { rows } = await query(
    `
    INSERT INTO users (login, name, email, password_hash, role_id, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
    `,
    [login, name, email, passwordHash, roleId, status]
  );
  return findById(rows[0].id);
}

export async function update(id, { login, name, email, roleId, status, passwordHash = null }) {
  await query(
    `
    UPDATE users
    SET
      login         = $2,
      name          = $3,
      email         = $4,
      role_id       = $5,
      status        = $6,
      password_hash = COALESCE($7, password_hash)
    WHERE id = $1
    `,
    [id, login, name, email, roleId, status, passwordHash]
  );
  return findById(id);
}

export async function setStatus(id, status) {
  await query(`UPDATE users SET status = $2 WHERE id = $1`, [id, status]);
  return findById(id);
}

export async function touchLastAccess(id) {
  await query(`UPDATE users SET last_access_at = now() WHERE id = $1`, [id]);
}

export async function findAllRoles() {
  const { rows } = await query(`SELECT id, name, description FROM role ORDER BY id ASC`);
  return rows;
}
