import fs from "node:fs";
import pg from "pg";

function loadEnv() {
  if (!fs.existsSync(".env.local")) return {};
  return Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => { const i = line.indexOf("="); return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['\"]|['\"]$/g, "")]; }));
}

const env = { ...loadEnv(), ...process.env };
const connectionString = env.DATABASE_URL || `postgresql://${encodeURIComponent(env.DB_USER || "postgres")}:${encodeURIComponent(env.DB_PASSWORD || "")}@${env.DB_HOST || "localhost"}:${env.DB_PORT || "5432"}/${env.DB_NAME || "db_service"}`;
const schema = `schema_test_${Date.now()}`;
const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET LOCAL search_path TO ${schema}, public`);
  const sql = fs.readFileSync("db/schema.sql", "utf8").replace(/^CREATE EXTENSION.*$/m, "");
  await client.query(sql);
  const { rows } = await client.query("SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = $1", [schema]);
  if (rows[0].count !== 25) throw new Error(`Esquema consolidado incompleto: ${rows[0].count} tablas`);
  const importTables = await client.query("SELECT to_regclass($1) AS batch, to_regclass($2) AS row", [`${schema}.data_import_batch`, `${schema}.data_import_row`]);
  if (!importTables.rows[0].batch || !importTables.rows[0].row) throw new Error("Faltan las tablas de importación.");
  await client.query("ROLLBACK");
  console.log(`Esquema consolidado probado en ${schema}: 25 tablas, rollback correcto.`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
