import assert from "node:assert/strict";
import fs from "node:fs";
import { attachResponseMeta } from "../lib/axios.js";
import { normalizeSaintClientStatus } from "../lib/saint-status.js";

const domainResponse = attachResponseMeta({
  data: { id: 1, status: "Activo" },
  status: 200,
  statusText: "OK",
  headers: { etag: "test" },
});
assert.equal(domainResponse.status, "Activo");
assert.equal(domainResponse.httpStatus, 200);
assert.equal(domainResponse.httpStatusText, "OK");
for (const [entity, status] of [
  ["producto", "Activo"],
  ["equipo", "Operativo"],
  ["usuario", "Activo"],
  ["par", "Creado"],
  ["orden", "Pendiente"],
]) {
  const entityResponse = attachResponseMeta({ data: { entity, status }, status: 200 });
  assert.equal(entityResponse.status, status, `status de ${entity}`);
}

const envExample = fs.readFileSync(".env.example", "utf8");
assert.match(envExample, /^SAINT_API_URL=https?:\/\/[^\s/]+(?::\d+)?\s*$/m);
const saintApiSource = fs.readFileSync("lib/saint-api.js", "utf8");
assert.match(saintApiSource, /fetchSaint\("\/api\/clientes"\)/);
assert.doesNotMatch(envExample, /SAINT_API_URL=.*\/api\/clientes/);
for (const route of ["city", "state", "country"]) {
  const source = fs.readFileSync(`app/api/ubicacion/${route}/route.js`, "utf8");
  assert.doesNotMatch(source, /error\.message/);
  assert.match(source, /status: 500/);
}
const syncSource = fs.readFileSync("app/api/client/sync/route.js", "utf8");
assert.doesNotMatch(syncSource, /error\.message/);
const equipmentSource = fs.readFileSync("app/api/equipment/[id]/route.js", "utf8");
assert.match(equipmentSource, /Equipo no encontrado/);
assert.match(equipmentSource, /status: 404/);
for (const route of [
  "app/api/equipment/[id]/route.js",
  "app/api/product/[id]/route.js",
  "app/api/user/[id]/route.js",
  "app/api/par/[id]/route.js",
  "app/api/service-order/[id]/route.js",
]) {
  assert.match(fs.readFileSync(route, "utf8"), /status: 404/, `404 en ${route}`);
}
assert.equal(normalizeSaintClientStatus("0"), "0");
assert.equal(normalizeSaintClientStatus("1"), "1");
assert.throws(() => normalizeSaintClientStatus("Activo"), /Estado Saint inválido/);
assert.throws(() => normalizeSaintClientStatus("2"), /Estado Saint inválido/);

console.log("Phase 1 regression tests passed.");
