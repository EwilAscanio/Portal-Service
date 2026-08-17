import { Pool } from "pg";

/**
 * Shared pg pool. In dev, Next.js hot-reload would create a new pool per
 * reload, so we cache it on globalThis to reuse the same connections.
 */
const globalForPg = globalThis;

function buildConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const db = process.env.DB_NAME || "db_service";
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD || "";
  return `postgresql://${user}:${password}@${host}:${port}/${db}`;
}

export const pool =
  globalForPg.__maquitechPgPool ??
  new Pool({
    connectionString: buildConnectionString(),
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.__maquitechPgPool = pool;
}

export async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Ejecuta un callback dentro de una transacción.
 * El callback recibe un cliente conectado para ejecutar sus queries.
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
