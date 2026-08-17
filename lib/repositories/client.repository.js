import { query } from "@/lib/db";

const CLIENT_SELECT = `
  SELECT
    c.id,
    c.codclie,
    c.description,
    c.rif,
    c.address1,
    c.address2,
    c.status,
    c.country,
    c.state,
    c.phone,
    c.email,
    c.mobile,
    c.created_at,
    c.updated_at,
    p.name AS country_name,
    e.name AS state_name
  FROM client c
  LEFT JOIN country p ON c.country = p.cod_saint::text
  LEFT JOIN state e ON c.state = e.cod_saint::text
`;

export async function findAll() {
  const { rows } = await query(`${CLIENT_SELECT} ORDER BY c.created_at DESC`);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`${CLIENT_SELECT} WHERE c.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function findByCodclie(codclie) {
  const { rows } = await query(`${CLIENT_SELECT} WHERE c.codclie = $1`, [codclie]);
  return rows[0] ?? null;
}

export async function upsert({
  codclie,
  description,
  rif,
  address1,
  address2,
  status,
  country,
  state,
  phone,
  email,
  mobile,
}) {
  const { rows } = await query(
    `
    INSERT INTO client (codclie, description, rif, address1, address2, status, country, state, phone, email, mobile)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (codclie)
    DO UPDATE SET
      description = EXCLUDED.description,
      rif         = EXCLUDED.rif,
      address1    = EXCLUDED.address1,
      address2    = EXCLUDED.address2,
      status      = EXCLUDED.status,
      country     = EXCLUDED.country,
      state       = EXCLUDED.state,
      phone       = EXCLUDED.phone,
      email       = EXCLUDED.email,
      mobile      = EXCLUDED.mobile
    RETURNING id
    `,
    [codclie, description, rif, address1, address2, status, country, state, phone, email, mobile]
  );
  return findById(rows[0].id);
}

export async function getAllCodclies() {
  const { rows } = await query("SELECT codclie FROM client");
  return rows.map(r => r.codclie);
}

export async function getExistingStatusMap() {
  const { rows } = await query("SELECT codclie, status FROM client");
  const map = {};
  for (const r of rows) map[r.codclie] = r.status;
  return map;
}

export async function upsertMany(clients) {
  const results = [];
  for (const client of clients) {
    const result = await upsert(client);
    results.push(result);
  }
  return results;
}
