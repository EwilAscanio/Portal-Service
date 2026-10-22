import fs from "node:fs";
import pg from "pg";

function loadEnv() {
  if (!fs.existsSync(".env.local")) return {};
  return Object.fromEntries(
    fs.readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['\"]|['\"]$/g, "")];
      })
  );
}

const login = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const listOnly = process.argv.includes("--list");
if (!listOnly && (!login || !process.argv.includes("--confirm"))) {
  throw new Error("Uso: npm run user:grant-super-admin -- <login> --confirm | --list");
}

const env = { ...loadEnv(), ...process.env };
const connectionString = env.DATABASE_URL || `postgresql://${encodeURIComponent(env.DB_USER || "postgres")}:${encodeURIComponent(env.DB_PASSWORD || "")}@${env.DB_HOST || "localhost"}:${env.DB_PORT || "5432"}/${env.DB_NAME || "db_service"}`;
const client = new pg.Client({ connectionString });
await client.connect();

try {
  if (listOnly) {
    const { rows } = await client.query(
      `SELECT u.login, u.name, u.status, r.name AS role
       FROM users u
       JOIN role r ON r.id = u.role_id
       ORDER BY u.login`
    );
    console.table(rows);
    process.exitCode = 0;
  } else {
  await client.query("BEGIN");
  const { rows } = await client.query(
    `SELECT u.id, u.login, u.status, r.name AS role
     FROM users u
     JOIN role r ON r.id = u.role_id
     WHERE lower(u.login) = lower($1)
     FOR UPDATE OF u`,
    [login]
  );
  const user = rows[0];
  if (!user) throw new Error(`No existe el usuario: ${login}`);
  if (user.status !== "Activo") throw new Error("El usuario debe estar activo antes de promoverlo.");

  const result = await client.query(
    `UPDATE users
     SET role_id = (SELECT id FROM role WHERE name = 'Superadministrador')
     WHERE id = $1
       AND EXISTS (SELECT 1 FROM role WHERE name = 'Superadministrador')
     RETURNING id`,
    [user.id]
  );
  if (!result.rowCount) throw new Error("El rol Superadministrador no existe. Aplica primero la migración 035.");
  await client.query("COMMIT");
  console.log(`Usuario promovido a Superadministrador: ${user.login}`);
  console.log("El usuario debe cerrar sesión y volver a entrar para renovar su JWT.");
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
