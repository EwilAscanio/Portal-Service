import { query } from "@/lib/db";

const PRODUCT_SELECT = `
  SELECT
    id,
    code,
    description,
    type,
    brand,
    serial,
    modelo,
    cost,
    price,
    category,
    stock,
    status,
    created_at,
    updated_at
  FROM product
`;

export async function findAll(category) {
  if (category && category !== "Todos") {
    const { rows } = await query(
      `${PRODUCT_SELECT} WHERE category = $1 ORDER BY created_at ASC`,
      [category]
    );
    return rows;
  }
  const { rows } = await query(`${PRODUCT_SELECT} ORDER BY created_at ASC`);
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
  type,
  brand,
  serial,
  modelo,
  cost,
  price,
  category,
  stock,
  status = "Activo",
}) {
  const { rows } = await query(
    `
    INSERT INTO product (code, description, type, brand, serial, modelo, cost, price, category, stock, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
    `,
    [code, description, type, brand || null, serial || null, modelo || null, cost, price, category, stock, status]
  );
  return findById(rows[0].id);
}

export async function update(
  id,
  { code, description, type, brand, serial, modelo, cost, price, category, stock, status }
) {
  await query(
    `
    UPDATE product
    SET
      code        = $2,
      description = $3,
      type        = $4,
      brand       = $5,
      serial      = $6,
      modelo      = $7,
      cost        = $8,
      price       = $9,
      category    = $10,
      stock       = $11,
      status      = $12
    WHERE id = $1
    `,
    [id, code, description, type, brand || null, serial || null, modelo || null, cost, price, category, stock, status]
  );
  return findById(id);
}

export async function setStatus(id, status) {
  await query(`UPDATE product SET status = $2 WHERE id = $1`, [id, status]);
  return findById(id);
}
