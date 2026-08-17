import { query } from "@/lib/db";

const CONFIG_SELECT = `
  SELECT
    id,
    company_name,
    rif,
    phone,
    email,
    address,
    website,
    city,
    country,
    logo,
    facebook,
    instagram,
    linkedin,
    exchange_rate,
    created_at,
    updated_at
  FROM configuration
`;

export async function findFirst() {
  const { rows } = await query(`${CONFIG_SELECT} WHERE id = 1`);
  return rows[0] ?? null;
}

export async function update(data) {
  const existing = (await findFirst()) ?? {};
  const provided = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
  const merged = { ...existing, ...provided };

  await query(
    `
    INSERT INTO configuration (
      id,
      company_name,
      rif,
      phone,
      email,
      address,
      website,
      city,
      country,
      logo,
      facebook,
      instagram,
      linkedin,
      exchange_rate
    )
    VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      rif          = EXCLUDED.rif,
      phone        = EXCLUDED.phone,
      email        = EXCLUDED.email,
      address      = EXCLUDED.address,
      website      = EXCLUDED.website,
      city         = EXCLUDED.city,
      country      = EXCLUDED.country,
      logo         = EXCLUDED.logo,
      facebook     = EXCLUDED.facebook,
      instagram    = EXCLUDED.instagram,
      linkedin     = EXCLUDED.linkedin,
      exchange_rate = EXCLUDED.exchange_rate
    `,
    [
      merged.company_name,
      merged.rif || null,
      merged.phone || null,
      merged.email || null,
      merged.address || null,
      merged.website || null,
      merged.city || null,
      merged.country || null,
      merged.logo || "/logo.webp",
      merged.facebook || null,
      merged.instagram || null,
      merged.linkedin || null,
      merged.exchange_rate ?? 0,
    ]
  );
  return findFirst();
}
