import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";
import pg from "pg";

/**
 * Crea schema_migrations si no existe (DDL espejo de 031-integrity-and-history.sql).
 * Se ejecuta dentro de la transaccion abierta por el runner.
 */
const ENSURE_SCHEMA_MIGRATIONS = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checksum TEXT
);
`;

const MIGRATION_STATEMENT = /^\d{3}-[a-z0-9-]+\.sql$/i;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['\"]|['\"]$/g, "")];
      })
  );
}

const env = { ...loadEnvFile(".env.local"), ...process.env };
const connectionString = env.DATABASE_URL || `postgresql://${encodeURIComponent(env.DB_USER || "postgres")}:${encodeURIComponent(env.DB_PASSWORD || "")}@${env.DB_HOST || "localhost"}:${env.DB_PORT || "5432"}/${env.DB_NAME || "db_service"}`;

const fileName = process.argv[2] || "031-integrity-and-history.sql";
if (!MIGRATION_STATEMENT.test(fileName)) {
  throw new Error("Indica una migración numerada, por ejemplo 031-integrity-and-history.sql");
}

const force = process.argv.includes("--force");
const version = fileName.replace(/\.sql$/i, "");
const migrationPath = path.join("db", "migrations", fileName);
const sqlContent = fs.readFileSync(migrationPath, "utf8");
const checksum = crypto.createHash("sha256").update(sqlContent, "utf8").digest("hex");

const client = new pg.Client({ connectionString });
await client.connect();

async function isApplied(client, migrationVersion) {
  const { rows } = await client.query("SELECT 1 FROM schema_migrations WHERE version = $1", [migrationVersion]);
  return rows.length > 0;
}

let skipped = false;
await client.query("BEGIN");
try {
  await client.query(ENSURE_SCHEMA_MIGRATIONS);
  if (await isApplied(client, version)) {
    if (!force) {
      skipped = true;
      await client.query("ROLLBACK");
      console.log(`Migración omitida (ya registrada en schema_migrations): ${fileName}`);
    } else {
      console.log(`Migración ya registrada: ${fileName} (re-aplicando por --force).`);
    }
  }
  if (!skipped) {
    await client.query(sqlContent);
    await client.query(
      "INSERT INTO schema_migrations(version, checksum) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING",
      [version, checksum]
    );
    await client.query("COMMIT");
    console.log(`Migración aplicada: ${fileName} (checksum ${checksum})`);
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(`Migración revertida: ${fileName}`);
  console.error(error.message);
} finally {
  await client.end();
}