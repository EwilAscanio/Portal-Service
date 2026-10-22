import assert from "node:assert/strict";
import fs from "node:fs";
import pg from "pg";

function loadEnv() {
  if (!fs.existsSync(".env.local")) return {};
  return Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => { const i = line.indexOf("="); return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['\"]|['\"]$/g, "")]; }));
}

const env = { ...loadEnv(), ...process.env };
const connectionString = env.DATABASE_URL || `postgresql://${encodeURIComponent(env.DB_USER || "postgres")}:${encodeURIComponent(env.DB_PASSWORD || "")}@${env.DB_HOST || "localhost"}:${env.DB_PORT || "5432"}/${env.DB_NAME || "db_service"}`;
const client = new pg.Client({ connectionString });
await client.connect();

async function expectForeignKey(run) {
  await client.query("SAVEPOINT expected_fk");
  try {
    await run();
    assert.fail("Se esperaba rechazo por clave foránea");
  } catch (error) {
    assert.equal(error.code, "23503");
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT expected_fk");
  }
}

async function expectCheck(run) {
  await client.query("SAVEPOINT expected_check");
  try {
    await run();
    assert.fail("Se esperaba rechazo por restricción de consistencia");
  } catch (error) {
    assert.equal(error.code, "23514");
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT expected_check");
  }
}

try {
  await client.query("BEGIN");
  const schemaName = `integration_${Date.now()}`;
  await client.query(`CREATE SCHEMA ${schemaName}`);
  await client.query(`SET LOCAL search_path TO ${schemaName}, public`);
  const schema = fs.readFileSync("db/schema.sql", "utf8").replace(/^CREATE EXTENSION.*$/m, "");
  await client.query(schema);

  const client1 = (await client.query("INSERT INTO client(codclie,description) VALUES ('IT-1','Cliente Uno') RETURNING id")).rows[0].id;
  const client2 = (await client.query("INSERT INTO client(codclie,description) VALUES ('IT-2','Cliente Dos') RETURNING id")).rows[0].id;
  const plant1 = (await client.query("INSERT INTO plant(name,code,address,client_id) VALUES ('Planta Uno','P-001','Dirección Uno',$1) RETURNING id", [client1])).rows[0].id;
  const plant2 = (await client.query("INSERT INTO plant(name,code,address,client_id) VALUES ('Planta Dos','P-001','Dirección Dos',$1) RETURNING id", [client2])).rows[0].id;

  const sparePlant = (await client.query("INSERT INTO plant(name,code,address,client_id) VALUES ('Temporal','P-002','A',$1) RETURNING id", [client1])).rows[0].id;
  assert.equal((await client.query("SELECT name FROM plant WHERE id=$1", [sparePlant])).rows[0].name, "Temporal");
  await client.query("UPDATE plant SET name='Temporal editada' WHERE id=$1", [sparePlant]);
  assert.equal((await client.query("DELETE FROM plant WHERE id=$1 RETURNING id", [sparePlant])).rowCount, 1);

  const contact1 = (await client.query("INSERT INTO contact(name,client_id,plant_id,phone,email) VALUES ('Contacto Uno',$1,$2,'111','uno@test.dev') RETURNING id", [client1, plant1])).rows[0].id;
  const contact2 = (await client.query("INSERT INTO contact(name,client_id,plant_id,email) VALUES ('Contacto Dos',$1,$2,'dos@test.dev') RETURNING id", [client2, plant2])).rows[0].id;
  const spareContact = (await client.query("INSERT INTO contact(name,client_id,plant_id,email) VALUES ('Temporal',$1,$2,'temporal@test.dev') RETURNING id", [client1, plant1])).rows[0].id;
  assert.equal((await client.query("SELECT name FROM contact WHERE id=$1", [spareContact])).rows[0].name, "Temporal");
  await client.query("UPDATE contact SET phone='222' WHERE id=$1", [spareContact]);
  assert.equal((await client.query("DELETE FROM contact WHERE id=$1 RETURNING id", [spareContact])).rowCount, 1);

  const equipment1 = (await client.query("INSERT INTO equipment(name,brand,model,serial,client_id,plant_id,hp,pressure) VALUES ('Equipo Uno','Marca','M1','SER-IT-1',$1,$2,10,120) RETURNING id", [client1, plant1])).rows[0].id;
  const equipment2 = (await client.query("INSERT INTO equipment(name,brand,model,serial,client_id,plant_id) VALUES ('Equipo Dos','Marca','M2','SER-IT-2',$1,$2) RETURNING id", [client2, plant2])).rows[0].id;
  const technical = (await client.query("INSERT INTO technical(cedula,name) VALUES ('V-IT-1','Técnico Uno') RETURNING id")).rows[0].id;
  const technical2 = (await client.query("INSERT INTO technical(cedula,name) VALUES ('V-IT-2','Técnico Dos') RETURNING id")).rows[0].id;
  const technical3 = (await client.query("INSERT INTO technical(cedula,name) VALUES ('V-IT-3','Técnico Tres') RETURNING id")).rows[0].id;
  const technical4 = (await client.query("INSERT INTO technical(cedula,name) VALUES ('V-IT-4','Técnico Cuatro') RETURNING id")).rows[0].id;
  const roleId = (await client.query("SELECT id FROM role WHERE name='Administrador'")).rows[0].id;
  const userId = (await client.query("INSERT INTO users(login,name,email,password_hash,role_id) VALUES ('integration','Integration User','integration@test.dev','hash',$1) RETURNING id", [roleId])).rows[0].id;
  const parId = (await client.query("INSERT INTO par_header(par_number,client_id,plant_id,contact_id,status,exchange_rate,observations,created_by) VALUES ('PAR-IT-1',$1,$2,$3,'Aprobado',1,'Trabajo de integración',$4) RETURNING id", [client1, plant1, contact1, userId])).rows[0].id;
  await client.query("INSERT INTO par_equipment(par_id,item_no,is_main,equipment_id,observaciones) VALUES ($1,1,true,$2,'Mantenimiento preventivo del equipo')", [parId, equipment1]);

  const insertOrder = `INSERT INTO service_order(order_code,client_description,equipment_name,type,technician_name,client_id,plant_id,equipment_id,technical_id,contact_id,amount,par_id,work_type,service_type,call_date,scheduled_start,scheduled_end,worked_hours,work_description,prepared_by) VALUES ($1,'snapshot cliente','snapshot equipo','Maintenance','snapshot técnico',$2,$3,$4,$5,$6,10,$7,'External','Maintenance',now(),now(),now(),0,'Trabajo de integración',$8) RETURNING id`;
  const orderId = (await client.query(insertOrder, ["OS-IT-1", client1, plant1, equipment1, technical, contact1, parId, userId])).rows[0].id;
  await client.query("INSERT INTO service_order_technician(service_order_id,technical_id,is_lead) VALUES ($1,$2,true)", [orderId, technical]);
  await client.query("INSERT INTO service_order_technician(service_order_id,technical_id) VALUES ($1,$2),($1,$3)", [orderId, technical2, technical3]);
  await expectCheck(() => client.query("INSERT INTO service_order_technician(service_order_id,technical_id) VALUES ($1,$2)", [orderId, technical4]));
  await client.query("UPDATE service_order SET amount=25,status='En Proceso' WHERE id=$1", [orderId]);
  const normalized = (await client.query("SELECT so.amount,so.status,c.description,p.name,e.name,ct.name FROM service_order so JOIN client c ON c.id=so.client_id JOIN plant p ON p.id=so.plant_id JOIN equipment e ON e.id=so.equipment_id JOIN contact ct ON ct.id=so.contact_id WHERE so.id=$1", [orderId])).rows[0];
  assert.equal(normalized.amount, "25.00");
  assert.equal(normalized.status, "En Proceso");
  assert.equal(normalized.description, "Cliente Uno");
  assert.equal(normalized.name, "Contacto Uno");

  await expectForeignKey(() => client.query(insertOrder, ["OS-IT-BAD-EQ", client1, plant1, equipment2, technical, contact1, parId, userId]));
  await expectForeignKey(() => client.query(insertOrder, ["OS-IT-BAD-CT", client1, plant1, equipment1, technical, contact2, parId, userId]));
  await client.query("ROLLBACK");

  await client.query("BEGIN");
  const legacySchema = `backfill_${Date.now()}`;
  await client.query(`CREATE SCHEMA ${legacySchema}`);
  await client.query(`SET LOCAL search_path TO ${legacySchema}, public`);
  await client.query(`
    CREATE TABLE schema_migrations(version varchar(50) PRIMARY KEY, checksum text, applied_at timestamptz DEFAULT now());
    CREATE TABLE client(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), description varchar(255), codclie varchar(20));
    CREATE TABLE technical(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(120));
    CREATE TABLE equipment(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(200), client_id uuid REFERENCES client(id), location varchar(200));
    CREATE TABLE service_order(id serial PRIMARY KEY, client_description varchar(200), equipment_name varchar(200), technician_name varchar(120));
    CREATE TABLE par_header(id serial PRIMARY KEY, client_id uuid REFERENCES client(id));
    CREATE TABLE par_equipment(id serial PRIMARY KEY, par_id int REFERENCES par_header(id), equipment_id uuid REFERENCES equipment(id), is_main boolean);
  `);
  const legacyClient = (await client.query("INSERT INTO client(description,codclie) VALUES ('Legacy Client','LEG') RETURNING id")).rows[0].id;
  const legacyTech = (await client.query("INSERT INTO technical(name) VALUES ('Legacy Tech') RETURNING id")).rows[0].id;
  const legacyEquipment = (await client.query("INSERT INTO equipment(name,client_id,location) VALUES ('Legacy Equipment',$1,'Legacy Plant') RETURNING id", [legacyClient])).rows[0].id;
  const legacyPar = (await client.query("INSERT INTO par_header(client_id) VALUES ($1) RETURNING id", [legacyClient])).rows[0].id;
  await client.query("INSERT INTO par_equipment(par_id,equipment_id,is_main) VALUES ($1,$2,true)", [legacyPar, legacyEquipment]);
  await client.query("INSERT INTO service_order(client_description,equipment_name,technician_name) VALUES ('Legacy Client','Legacy Equipment','Legacy Tech')");

  await client.query(fs.readFileSync("db/migrations/032-service-order-relations.sql", "utf8"));
  const backfilledOrder = (await client.query("SELECT client_id,plant_id,equipment_id,technical_id FROM service_order")).rows[0];
  assert.equal(backfilledOrder.client_id, legacyClient);
  assert.equal(backfilledOrder.equipment_id, legacyEquipment);
  assert.equal(backfilledOrder.technical_id, legacyTech);
  assert.ok(backfilledOrder.plant_id);

  const migration033 = fs.readFileSync("db/migrations/033-par-header-plant-backfill.sql", "utf8").replace(/^BEGIN;$/m, "").replace(/^COMMIT;$/m, "");
  await client.query(migration033);
  assert.equal((await client.query("SELECT plant_id FROM par_header WHERE id=$1", [legacyPar])).rows[0].plant_id, backfilledOrder.plant_id);
  await client.query("ROLLBACK");

  console.log("Catalog, normalized order, relation rejection, flow and 032/033 backfill integration tests passed.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
