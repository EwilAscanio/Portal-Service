import { query } from "@/lib/db";

const PRODUCT_SELECT = `
  SELECT
    id,
    code,
    description,
    brand,
    serial,
    modelo,
    cost,
    price,
    category,
    requires_technician,
    stock,
    status,
    created_at,
    updated_at
  FROM product
`;

export async function findAll({ category, status } = {}) {
  let sql = `${PRODUCT_SELECT} WHERE 1=1`;
  const params = [];
  if (category && category !== "Todos") {
    params.push(category);
    sql += ` AND category = $${params.length}`;
  }
  if (status) {
    params.push(status);
    sql += ` AND status = $${params.length}`;
  }
  const { rows } = await query(`${sql} ORDER BY created_at ASC`, params);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`${PRODUCT_SELECT} WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function existsByCode({ code, excludeId }) {
  const { rows } = await query(
    `
    SELECT EXISTS (
      SELECT 1 FROM product
      WHERE lower(code) = lower($1)
        AND ($2::uuid IS NULL OR id <> $2::uuid)
    ) AS taken
    `,
    [code, excludeId ?? null]
  );
  return rows[0]?.taken ?? false;
}

export async function create({
  code,
  description,
  brand,
  serial,
  modelo,
  cost,
  price,
  category,
  requiresTechnician = false,
  stock,
  status = "Activo",
}) {
  const { rows } = await query(
    `
    INSERT INTO product (code, description, brand, serial, modelo, cost, price, category, stock, status, requires_technician)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
    `,
    [code, description, brand || null, serial || null, modelo || null, cost, price, category, stock, status, requiresTechnician]
  );
  return findById(rows[0].id);
}

export async function update(
  id,
  { code, description, brand, serial, modelo, cost, price, category, stock, status, requiresTechnician }
) {
  await query(
    `
    UPDATE product
    SET
      code        = $2,
      description = $3,
      brand       = $4,
      serial      = $5,
      modelo      = $6,
      cost        = $7,
      price       = $8,
      category    = $9,
      stock       = $10,
      status      = $11,
      requires_technician = COALESCE($12, requires_technician)
    WHERE id = $1
    `,
    [id, code, description, brand || null, serial || null, modelo || null, cost, price, category, stock, status, requiresTechnician ?? null]
  );
  return findById(id);
}

export async function setStatus(id, status) {
  await query(`UPDATE product SET status = $2 WHERE id = $1`, [id, status]);
  return findById(id);
}
