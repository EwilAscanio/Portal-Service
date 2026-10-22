import assert from "node:assert/strict";
import fs from "node:fs";
import {
  API_PERMISSIONS,
  PAGE_PERMISSIONS,
  ROLES,
  canAccessRole,
  rolesFor,
} from "../lib/permissions.js";

const assertRoles = (pathname, permissions, expected) => {
  assert.deepEqual(rolesFor(pathname, permissions), expected, pathname);
};

assertRoles("/api/dashboard", API_PERMISSIONS, Object.values(ROLES));
assertRoles("/api/import/preview", API_PERMISSIONS, [ROLES.SUPER_ADMIN]);
assertRoles("/api/notification/123", API_PERMISSIONS, Object.values(ROLES));
assertRoles("/api/client", API_PERMISSIONS, Object.values(ROLES));
assertRoles("/api/client/sync", API_PERMISSIONS, [ROLES.ADMIN, ROLES.SUPERVISOR]);
assertRoles("/api/par-template/1", API_PERMISSIONS, [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR]);
assertRoles("/api/par/1", API_PERMISSIONS, [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR]);
assertRoles("/api/service-order/1", API_PERMISSIONS, [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO]);
assertRoles("/api/technician-calendar", API_PERMISSIONS, [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO]);
assertRoles("/calendario-tecnicos", PAGE_PERMISSIONS, [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO]);
assertRoles("/importaciones", PAGE_PERMISSIONS, [ROLES.SUPER_ADMIN]);
assertRoles("/api/plant/1", API_PERMISSIONS, [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR]);
assertRoles("/api/contact/1", API_PERMISSIONS, [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR]);
assertRoles("/api/equipment/1", API_PERMISSIONS, [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO]);
assertRoles("/api/configuration/exchange-rate", API_PERMISSIONS, [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR]);
assertRoles("/api/configuration", API_PERMISSIONS, [ROLES.SUPERVISOR]);
assertRoles("/api/clientx", API_PERMISSIONS, []);
assertRoles("/api/unknown", API_PERMISSIONS, []);
assertRoles("/usuarios-extra", PAGE_PERMISSIONS, []);
assert.equal(canAccessRole(ROLES.SUPER_ADMIN, rolesFor("/usuarios", PAGE_PERMISSIONS)), true);
assert.equal(canAccessRole(ROLES.SUPER_ADMIN, rolesFor("/configuracion", PAGE_PERMISSIONS)), true);
assert.equal(canAccessRole(ROLES.SUPER_ADMIN, rolesFor("/api/user", API_PERMISSIONS)), true);
assert.equal(canAccessRole(ROLES.SUPER_ADMIN, rolesFor("/api/configuration", API_PERMISSIONS)), true);
assert.equal(canAccessRole(ROLES.SUPER_ADMIN, rolesFor("/api/unknown", API_PERMISSIONS)), false);

const proxySource = fs.readFileSync("proxy.js", "utf8");
assert.match(proxySource, /status: 401/);
assert.match(proxySource, /status: 403/);
assert.match(proxySource, /session\.user\?\.status !== "Activo"/);
const authSource = fs.readFileSync("auth.js", "utf8");
assert.match(authSource, /findById\(token\.id\)/);
assert.match(authSource, /currentUser\.role/);

for (const { prefix: path, roles: allowedRoles } of API_PERMISSIONS) {
  for (const role of Object.values(ROLES)) {
    const resolved = rolesFor(path, API_PERMISSIONS);
    assert.equal(resolved.includes(role), allowedRoles.includes(role), `${path} / ${role}`);
  }
}

console.log("Permission matrix tests passed.");
