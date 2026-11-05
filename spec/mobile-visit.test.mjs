import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { readMobileToken, signMobileToken } from "../lib/mobile-token.js";
import { mobileLoginSchema, mobileSyncSchema } from "../lib/validators/mobile.schema.js";

const migration = fs.readFileSync("db/migrations/060-client-visit.sql", "utf8");
const schema = fs.readFileSync("db/schema.sql", "utf8");
const proxy = fs.readFileSync("proxy.js", "utf8");

for (const source of [migration, schema]) {
  assert.match(source, /CREATE TABLE client_prospect/);
  assert.match(source, /CREATE TABLE client_visit/);
  assert.match(source, /UNIQUE \(user_id, local_id\)/);
  assert.match(source, /Potencial \(Cliente Nuevo\)/);
  assert.match(source, /FOREIGN KEY \(plant_id, client_id\) REFERENCES plant\(id, client_id\)/);
  assert.match(source, /client_visit_plant_name_check/);
}
assert.doesNotMatch(migration, /\b(DELETE FROM|TRUNCATE|DROP TABLE)\b/i);

const mobileAt = proxy.indexOf('pathname.startsWith("/api/mobile/")');
const sessionAt = proxy.indexOf("if (!session)");
assert.ok(mobileAt > 0 && mobileAt < sessionAt, "El proxy debe dejar pasar /api/mobile antes de exigir la sesión web.");

const secret = "prueba-mobile-visita";
const user = {
  id: randomUUID(),
  login: "vendedor",
  name: "Ana Pérez",
  email: "ana@maquitech.test",
  role: "Usuario",
  status: "Activo",
};
const signed = signMobileToken(user, secret, Date.parse("2026-11-05T12:00:00Z"));
const payload = readMobileToken(signed.token, secret, Date.parse("2026-11-05T12:00:00Z"));
assert.equal(payload.id, user.id);
assert.equal(payload.aud, "maquitech-mobile");
assert.equal(signed.expiresAt, "2027-02-03T12:00:00.000Z");
assert.throws(() => readMobileToken(signed.token, "otro-secreto"));
assert.throws(() => readMobileToken(signed.token, secret, Date.parse("2027-02-03T12:00:00Z")));

assert.equal(mobileLoginSchema.safeParse({ login: " ana ", password: "x" }).data.login, "ana");
assert.equal(mobileLoginSchema.safeParse({ login: "", password: "x" }).success, false);

const localId = randomUUID();
const clientId = randomUUID();
const validSync = mobileSyncSchema.safeParse({
  prospects: [{
    local_id: localId,
    description: " Taller Norte ",
    rif: "J-12345678-9",
    contact_name: "",
    phone: null,
    email: "",
    address1: "Zona industrial",
  }],
  visits: [{
    local_id: randomUUID(),
    client_id: clientId,
    client_prospect_id: null,
    client_prospect_local_id: null,
    plant_id: null,
    plant_name: null,
    visited_at: "2026-11-05T14:30:00.000Z",
    client_class: "A",
    visit_objective: "Máquinas",
    visit_type: "En Físico",
    contact_name: "Luis",
    contact_email: "luis@cliente.test",
    will_quote: true,
    office_zone: "Valencia",
    observations: "",
  }],
});
assert.equal(validSync.success, true, validSync.success ? "" : validSync.error.issues.map((issue) => issue.message).join(" "));
assert.equal(validSync.data.prospects[0].description, "Taller Norte");
assert.equal(validSync.data.prospects[0].email, null);
assert.equal(validSync.data.visits[0].observations, null);

const twoSubjects = mobileSyncSchema.safeParse({
  visits: [{
    local_id: randomUUID(),
    client_id: clientId,
    client_prospect_local_id: localId,
    visited_at: "2026-11-05T14:30:00.000Z",
    client_class: "B",
    visit_objective: "Servicio",
    visit_type: "Por Telf",
    will_quote: false,
    office_zone: "Caracas",
  }],
});
assert.equal(twoSubjects.success, false);

const repeated = mobileSyncSchema.safeParse({
  prospects: [
    { local_id: localId, description: "Uno", rif: "J-1" },
    { local_id: localId, description: "Dos", rif: "J-2" },
  ],
});
assert.equal(repeated.success, false);

console.log("Mobile visit contract tests passed.");
