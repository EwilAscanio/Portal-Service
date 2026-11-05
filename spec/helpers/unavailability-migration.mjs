import fs from "node:fs";
import assert from "node:assert/strict";

// Se ejecuta en la transacción del esquema ficticio, antes de las pruebas funcionales.
export async function migrateAndCheckUnavailability(client) {
  const actor = (await client.query("INSERT INTO users(login,name,email,password_hash,role_id) SELECT 'absence-legacy','Usuario ficticio','absence-legacy@example.invalid','hash',id FROM role WHERE name='Administrador' RETURNING id")).rows[0].id;
  const tech = (await client.query("INSERT INTO technical(cedula,name) VALUES('ABS-LEGACY','Técnico histórico ficticio') RETURNING id")).rows[0].id;
  for (const cancelled of [false, true]) {
    const row = (await client.query("INSERT INTO technical_vacation(technical_id,start_date,end_date,note,created_by,updated_by) VALUES($1,'2040-01-01','2040-01-02','Nota histórica ficticia',$2,$2) RETURNING *", [tech, actor])).rows[0];
    if (cancelled) await client.query("UPDATE technical_vacation SET cancelled_at=now(),cancelled_by=$2,cancellation_reason='Cancelación ficticia',revision=2 WHERE id=$1", [row.id, actor]);
    await client.query("INSERT INTO technical_vacation_event(vacation_id,actor_id,action,details) VALUES($1,$2,'Registradas',$3::jsonb)", [row.id, actor, JSON.stringify({ before: null, after: row })]);
  }
  const rows = (await client.query("SELECT * FROM technical_vacation ORDER BY id")).rows;
  const events = (await client.query("SELECT * FROM technical_vacation_event ORDER BY id")).rows;
  await client.query(fs.readFileSync("db/migrations/058-technician-unavailability.sql", "utf8"));
  const migrated = (await client.query("SELECT * FROM technical_unavailability ORDER BY id")).rows;
  assert.ok(migrated.every(row => row.reason_type === "Vacaciones"));
  assert.deepEqual(migrated.map(({ reason_type, ...row }) => { assert.ok(reason_type); return row; }), rows);
  const migratedEvents = (await client.query("SELECT * FROM technical_unavailability_event ORDER BY id")).rows;
  assert.deepEqual(migratedEvents.map(({ unavailability_id, ...event }) => ({ ...event, vacation_id: unavailability_id })), events);
  assert.equal((await client.query("SELECT to_regclass(current_schema()||'.technical_vacation') AS old")).rows[0].old, null);
  // Retirar únicamente el fixture para no afectar las consultas de los siguientes casos.
  await client.query("DELETE FROM technical_unavailability_event WHERE unavailability_id=ANY($1::uuid[])", [rows.map(row => row.id)]);
  await client.query("DELETE FROM technical_unavailability WHERE technical_id=$1", [tech]);
  await client.query("DELETE FROM technical WHERE id=$1", [tech]);
  await client.query("DELETE FROM users WHERE id=$1", [actor]);
}
