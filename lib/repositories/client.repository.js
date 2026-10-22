import { query, withTransaction } from "@/lib/db";

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
    c.source_system,
    c.last_synced_at,
    c.last_seen_at,
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

export async function beginSaintSync(receivedCount) {
  const { rows } = await query(
    `INSERT INTO integration_sync_run(source_system, entity_name, status, received_count)
     VALUES ('Saint', 'Client', 'Running', $1) RETURNING id`,
    [receivedCount]
  );
  return rows[0].id;
}

export async function failSaintSync(runId, message) {
  await query(
    `UPDATE integration_sync_run
     SET status = 'Failed', finished_at = now(), error_message = left($2, 2000)
     WHERE id = $1`,
    [runId, message || "Unknown synchronization error"]
  );
}

export async function syncManyFromSaint(clients, runId) {
  return withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('saint-client-sync'))");
    const codes = clients.map((item) => item.codclie);
    const { rows: existingRows } = await client.query(
      "SELECT codclie, status FROM client WHERE codclie = ANY($1::text[])",
      [codes]
    );
    const existing = new Map(existingRows.map((row) => [row.codclie, row.status]));
    const stats = { inserted: 0, updated: 0, activated: 0, deactivated: 0 };
    for (const item of clients) {
      const previous = existing.get(item.codclie);
      if (previous === undefined) stats.inserted += 1;
      else {
        stats.updated += 1;
        if (previous === "0" && item.status === "1") stats.activated += 1;
        if (previous === "1" && item.status === "0") stats.deactivated += 1;
      }
    }

    await client.query(
      `INSERT INTO client
        (codclie, description, rif, address1, address2, status, country, state,
         phone, email, mobile, source_system, last_synced_at, last_seen_at)
       SELECT x.codclie, x.description, x.rif, x.address1, x.address2, x.status,
              x.country, x.state, x.phone, x.email, x.mobile, 'Saint', now(), now()
       FROM jsonb_to_recordset($1::jsonb) AS x(
         codclie text, description text, rif text, address1 text, address2 text,
         status text, country text, state text, phone text, email text, mobile text
       )
       ON CONFLICT (codclie) DO UPDATE SET
         description = EXCLUDED.description, rif = EXCLUDED.rif,
         address1 = EXCLUDED.address1, address2 = EXCLUDED.address2,
         status = EXCLUDED.status, country = EXCLUDED.country, state = EXCLUDED.state,
         phone = EXCLUDED.phone, email = EXCLUDED.email, mobile = EXCLUDED.mobile,
         source_system = 'Saint', last_synced_at = now(), last_seen_at = now(), updated_at = now()`,
      [JSON.stringify(clients)]
    );
    await client.query(
      `UPDATE integration_sync_run SET status = 'Completed', finished_at = now(),
         inserted_count = $2, updated_count = $3, activated_count = $4, deactivated_count = $5
       WHERE id = $1`,
      [runId, stats.inserted, stats.updated, stats.activated, stats.deactivated]
    );
    return stats;
  });
}
