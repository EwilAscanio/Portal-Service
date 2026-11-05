import { query, withTransaction } from "@/lib/db";

const VENDOR_SELECT = `
  SELECT
    v.id,
    v.codvend,
    v.description,
    v.cedula,
    v.phone,
    v.status,
    v.email,
    v.country,
    v.state,
    v.city,
    v.source_system,
    v.last_synced_at,
    v.last_seen_at,
    v.created_at,
    v.updated_at,
    p.name AS country_name,
    e.name AS state_name,
    c.name AS city_name
  FROM vendor v
  LEFT JOIN country p ON v.country = p.cod_saint::text
  LEFT JOIN state e ON v.state = e.cod_saint::text
  LEFT JOIN city c ON v.city = c.cod_saint::text
`;

export async function findAll() {
  const { rows } = await query(`${VENDOR_SELECT} ORDER BY v.description NULLS LAST, v.codvend`);
  return rows;
}

export async function beginVendorSync(receivedCount) {
  const { rows } = await query(
    `INSERT INTO integration_sync_run(source_system, entity_name, status, received_count)
     VALUES ('Saint', 'Vendor', 'Running', $1) RETURNING id`,
    [receivedCount]
  );
  return rows[0].id;
}

export async function failVendorSync(runId, message) {
  await query(
    `UPDATE integration_sync_run
     SET status = 'Failed', finished_at = now(), error_message = left($2, 2000)
     WHERE id = $1`,
    [runId, message || "Error desconocido de sincronización"]
  );
}

/**
 * Inserta o actualiza el catálogo recibido. No desactiva vendedores ausentes.
 */
export async function syncManyFromSaint(vendors, runId) {
  return withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('saint-vendor-sync'))");
    const codes = vendors.map((item) => item.codvend);
    const { rows: existingRows } = await client.query(
      "SELECT codvend, status FROM vendor WHERE codvend = ANY($1::text[])",
      [codes]
    );
    const existing = new Map(existingRows.map((row) => [row.codvend, row.status]));
    const stats = { inserted: 0, updated: 0, activated: 0, deactivated: 0 };
    for (const item of vendors) {
      const previous = existing.get(item.codvend);
      if (previous === undefined) stats.inserted += 1;
      else {
        stats.updated += 1;
        if (previous === "0" && item.status === "1") stats.activated += 1;
        if (previous === "1" && item.status === "0") stats.deactivated += 1;
      }
    }

    await client.query(
      `INSERT INTO vendor
        (codvend, description, cedula, phone, status, email, country, state, city,
         source_system, last_synced_at, last_seen_at)
       SELECT x.codvend, x.description, x.cedula, x.phone, x.status, x.email,
              x.country, x.state, x.city, 'Saint', now(), now()
       FROM jsonb_to_recordset($1::jsonb) AS x(
         codvend text, description text, cedula text, phone text, status text,
         email text, country text, state text, city text
       )
       ON CONFLICT (codvend) DO UPDATE SET
         description = EXCLUDED.description,
         cedula = EXCLUDED.cedula,
         phone = EXCLUDED.phone,
         status = EXCLUDED.status,
         email = EXCLUDED.email,
         country = EXCLUDED.country,
         state = EXCLUDED.state,
         city = EXCLUDED.city,
         source_system = 'Saint',
         last_synced_at = now(),
         last_seen_at = now(),
         updated_at = now()`,
      [JSON.stringify(vendors)]
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
