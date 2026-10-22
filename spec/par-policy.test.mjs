import assert from "node:assert/strict";
import fs from "node:fs";
import {
  PAR_EDITABLE_STATUS,
  PAR_LINKABLE_STATUSES,
  canEditPar,
  canReviewPar,
  getParEditError,
  isValidParTransition,
} from "../lib/par-policy.js";
import {
  calculateLineTotalUsd,
  calculateTotalBs,
  calculateTotalUsd,
} from "../lib/par-calculation.js";
import { ROLES } from "../lib/permissions.js";
import { getParErrorResponse } from "../lib/par-errors.js";

assert.equal(canEditPar(PAR_EDITABLE_STATUS), true);
assert.equal(canEditPar("Aprobado"), false);
assert.equal(canEditPar("Rechazado"), false);
for (const role of [...Object.values(ROLES), undefined, "rol-inexistente"]) {
  const allowed = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR].includes(role);
  assert.equal(canEditPar("Creado", { role }), true);
  assert.equal(canEditPar("Aprobado", { role }), allowed, `Edición aprobada por ${role}`);
  for (const status of ["Creado", "Aprobado", "En Servicio", "Finalizado", "Rechazado"]) {
    assert.equal(canEditPar(status, { role, hasActiveOrders: true }), false);
  }
  for (const status of ["En Servicio", "Finalizado", "Rechazado", undefined]) {
    assert.equal(canEditPar(status, { role }), false);
  }
}
for (const error of [
  getParEditError("Rechazado"),
  getParEditError("Aprobado", { role: ROLES.COORDINADOR }),
  getParEditError("Aprobado", { role: ROLES.SUPER_ADMIN, hasActiveOrders: true }),
]) {
  assert.deepEqual(getParErrorResponse(error), { error: error.message, status: 403 });
}
assert.equal(canReviewPar(ROLES.SUPER_ADMIN), true);
assert.equal(canReviewPar(ROLES.ADMIN), true);
assert.equal(canReviewPar(ROLES.SUPERVISOR), true);
assert.equal(canReviewPar(ROLES.COORDINADOR), false);
assert.equal(isValidParTransition("Creado", "Aprobado"), true);
assert.equal(isValidParTransition("Creado", "Rechazado"), true);
assert.equal(isValidParTransition("Aprobado", "Rechazado"), true);
assert.equal(isValidParTransition("Rechazado", "Aprobado"), false);
assert.equal(isValidParTransition("Finalizado", "Creado"), false);
assert.deepEqual(PAR_LINKABLE_STATUSES, ["Aprobado"]);
assert.equal(calculateLineTotalUsd({ qty: 2, valorUnitUsd: 10, multiplicador: 1, valorPercent: 5 }), 21);
assert.equal(calculateLineTotalUsd({ qty: 0, valorUnitUsd: 10 }), 0);
assert.equal(calculateTotalUsd([
  { qty: 2, valorUnitUsd: 10, multiplicador: 1, valorPercent: 5 },
  { qty: 1, valorUnitUsd: 3.333, multiplicador: 1, valorPercent: 0 },
]), 24.33);
assert.equal(calculateTotalBs(24.33, 36.5), 888.05);

const parRepositorySource = fs.readFileSync("lib/repositories/par.repository.js", "utf8");
assert.match(parRepositorySource, /FOR UPDATE/);
assert.match(parRepositorySource, /withTransaction/);
assert.match(parRepositorySource, /approved_by/);
assert.match(parRepositorySource, /approved_at/);
assert.doesNotMatch(parRepositorySource, /UPDATE par_header SET[^;]*display_status/);
const parRouteSource = fs.readFileSync("app/api/par/[id]/route.js", "utf8");
assert.match(parRouteSource, /MANUAL_STATUSES = \["Creado", "Aprobado", "Rechazado"\]/);
assert.doesNotMatch(parRouteSource, /MANUAL_STATUSES =[^\n]*En Servicio/);

console.log("PAR policy tests passed.");
