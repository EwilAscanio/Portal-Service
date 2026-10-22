import fs from "node:fs";
import pg from "pg";

function loadEnv() {
  if (!fs.existsSync(".env.local")) return {};
  return Object.fromEntries(
    fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['\"]|['\"]$/g, "")];
      })
  );
}

const env = { ...loadEnv(), ...process.env };
const connectionString = env.DATABASE_URL || `postgresql://${encodeURIComponent(env.DB_USER || "postgres")}:${encodeURIComponent(env.DB_PASSWORD || "")}@${env.DB_HOST || "localhost"}:${env.DB_PORT || "5432"}/${env.DB_NAME || "db_service"}`;
const client = new pg.Client({ connectionString });
await client.connect();

try {
  const orders = (await client.query(`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE par_id IS NULL)::int AS without_par,
      COUNT(*) FILTER (WHERE NULLIF(trim(work_description), '') IS NULL)::int AS without_description,
      COUNT(*) FILTER (WHERE prepared_by IS NULL)::int AS without_author
    FROM service_order
  `)).rows[0];
  const assignments = (await client.query(`
    SELECT COUNT(*)::int AS invalid
    FROM (
      SELECT service_order_id FROM service_order_technician
      GROUP BY service_order_id HAVING COUNT(*) NOT BETWEEN 1 AND 3
    ) invalid_assignments
  `)).rows[0].invalid;
  const equipmentWithoutDescription = (await client.query(
    "SELECT COUNT(*)::int AS count FROM par_equipment WHERE NULLIF(trim(observaciones), '') IS NULL"
  )).rows[0].count;
  const calendarIntegrity = (await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE (approved_by IS NULL) <> (approved_at IS NULL))::int AS inconsistent_approval,
      COUNT(*) FILTER (WHERE approved_at IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM service_order_technician sot WHERE sot.service_order_id = service_order.id
      ))::int AS approved_without_technicians
    FROM service_order
  `)).rows[0];
  const duplicateTechnicalUsers = (await client.query(`
    SELECT COUNT(*)::int AS count FROM (
      SELECT user_id FROM technical WHERE user_id IS NOT NULL GROUP BY user_id HAVING COUNT(*) > 1
    ) duplicates
  `)).rows[0].count;
  const productIntegrity = (await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE category NOT IN ('Servicio', 'Repuestos'))::int AS invalid_products,
      (SELECT COUNT(*)::int FROM par_item item JOIN product ON product.id = item.product_id WHERE item.categoria <> product.category) AS par_mismatches,
      (SELECT COUNT(*)::int FROM par_template_item item JOIN product ON product.id = item.product_id WHERE item.categoria <> product.category) AS template_mismatches
    FROM product
  `)).rows[0];
  const productTypeColumns = (await client.query(`
    SELECT COUNT(*)::int AS count
    FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'product' AND column_name = 'type'
  `)).rows[0].count;
  const migrations = (await client.query(`
    SELECT version FROM schema_migrations
    WHERE version IN ('036-normalize-service-orders', '037-saint-client-sync-audit', '038-service-order-par-scope', '039-par-work-description-required', '040-use-equipment-description-for-orders', '041-par-equipment-description-required', '042-service-order-automatic-number', '043-technician-calendar', '044-data-import', '045-normalize-product-category', '046-drop-product-type')
    ORDER BY version
  `)).rows.map((row) => row.version);
  const orderCodeDefault = (await client.query(`
    SELECT column_default FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'service_order' AND column_name = 'order_code'
  `)).rows[0]?.column_default || "";

  if (orders.without_par || orders.without_description || orders.without_author || assignments || equipmentWithoutDescription || calendarIntegrity.inconsistent_approval || calendarIntegrity.approved_without_technicians || duplicateTechnicalUsers || productIntegrity.invalid_products || productIntegrity.par_mismatches || productIntegrity.template_mismatches || productTypeColumns || migrations.length !== 11 || !orderCodeDefault.includes("service_order_number_seq")) {
    throw new Error(`Validación fallida: ${JSON.stringify({ orders, invalidAssignments: assignments, equipmentWithoutDescription, calendarIntegrity, duplicateTechnicalUsers, migrations, orderCodeDefault })}`);
  }
  console.log(JSON.stringify({ orders, invalidAssignments: assignments, equipmentWithoutDescription, calendarIntegrity, duplicateTechnicalUsers, productIntegrity, productTypeColumns, migrations, orderCodeDefault }));
} finally {
  await client.end();
}
