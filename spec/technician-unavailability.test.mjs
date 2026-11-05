import assert from "node:assert/strict";
import { validUnavailabilityDate, unavailabilityBounds, unavailabilityStatus, unavailabilityOverlapping, canManageUnavailability, canReadUnavailability, operationDateTimeInput, operationInputToInstant } from "../lib/technician-unavailability.js";
import { ROLES } from "../lib/permissions.js";
import { unavailabilityCreateSchema, unavailabilityUpdateSchema, unavailabilityCancelSchema } from "../lib/validators/technician-unavailability.schema.js";
import { serviceOrderRescheduleSchema } from "../lib/validators/operational.schema.js";
import { UNAVAILABILITY_REASONS, historicalUnavailabilityReason } from "../lib/technician-unavailability.js";

const validPeriod = { startDate: "2030-01-01", endDate: "2030-01-01" };
assert.equal(unavailabilityCreateSchema.safeParse(validPeriod).success, false);
for (const { value } of UNAVAILABILITY_REASONS) {
  assert.equal(unavailabilityCreateSchema.safeParse({ ...validPeriod, reasonType: value, note: "Detalle ficticio" }).success, true);
}
for (const reasonType of ["Desconocido", "", null]) assert.equal(unavailabilityCreateSchema.safeParse({ ...validPeriod, reasonType }).success, false);
for (const note of [undefined, "", "     ", "abcd"]) assert.equal(unavailabilityCreateSchema.safeParse({ ...validPeriod, reasonType: "Otros", note }).success, false);
assert.equal(unavailabilityUpdateSchema.safeParse({ ...validPeriod, reasonType: "Otros", revision: 1, reason: "Cambio válido", note: "" }).success, false);
assert.equal(historicalUnavailabilityReason({ start_date: "2020-01-01" }), "Vacaciones");
assert.equal(historicalUnavailabilityReason({ reason_type: "DiasCompensatorios" }), "Días compensatorios");
assert.equal(validUnavailabilityDate("2030-02-29"), false);
assert.equal(validUnavailabilityDate("2032-02-29"), true);
assert.equal(validUnavailabilityDate("2030-01-01T00:00Z"), false);
assert.equal(validUnavailabilityDate("9999-12-31"), false);
assert.equal(unavailabilityCreateSchema.safeParse({ reasonType: "Vacaciones", startDate: "2030-01-03", endDate: "2030-01-02" }).success, false);
assert.equal(unavailabilityCreateSchema.safeParse({ reasonType: "Vacaciones", startDate: "2030-01-03", endDate: "2030-01-03", technicalId: "injected" }).success, false);
assert.equal(unavailabilityUpdateSchema.safeParse({ reasonType: "Vacaciones", startDate: "2030-01-01", endDate: "2030-01-02", revision: 1, reason: "" }).success, false);
assert.equal(unavailabilityCancelSchema.safeParse({ revision: 1, reason: "Motivo ficticio" }).success, true);
const period = { start_date: "2030-01-10", end_date: "2030-01-12" };
assert.deepEqual(unavailabilityBounds(period.start_date, period.end_date), { start: "2030-01-10T04:00:00Z", end: "2030-01-13T04:00:00Z", endDateExclusive: "2030-01-13" });
for (const [day, status] of [["2030-01-09","Programado"],["2030-01-10","Vigente"],["2030-01-12","Vigente"],["2030-01-13","Finalizado"]]) assert.equal(unavailabilityStatus(period, day), status);
assert.equal(unavailabilityStatus({ ...period, cancelled_at: "2030-01-01" }, "2030-01-11"), "Cancelado");
assert.equal(unavailabilityOverlapping([period], "2030-01-10T03:00Z", "2030-01-10T04:00Z").length, 0);
assert.equal(unavailabilityOverlapping([period], "2030-01-10T04:00Z", "2030-01-10T05:00Z").length, 1);
assert.equal(unavailabilityOverlapping([period], "2030-01-13T03:00Z", "2030-01-13T04:00Z").length, 1);
assert.equal(unavailabilityOverlapping([period], "2030-01-13T04:00Z", "2030-01-13T05:00Z").length, 0);
assert.equal(unavailabilityOverlapping([period], "2030-01-09T00:00Z", "2030-01-14T00:00Z").length, 1);
assert.equal(unavailabilityOverlapping([{ ...period, cancelled_at: "2030-01-01" }], "2030-01-10T04:00Z", "2030-01-10T05:00Z").length, 0);
assert.equal(operationInputToInstant("2030-01-10T08:00"), "2030-01-10T12:00:00Z");
assert.equal(operationDateTimeInput("2030-01-10T12:00:00Z"), "2030-01-10T08:00");
for (const role of Object.values(ROLES)) {
  assert.equal(canManageUnavailability(role), [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR].includes(role));
  assert.equal(canReadUnavailability(role), [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR].includes(role));
}
assert.equal(serviceOrderRescheduleSchema.safeParse({ scheduleRevision: 0, scheduledStart: "2030-01-01T10:00:00Z", scheduledEnd: "2030-01-01T11:00:00Z", leadTechnicianId: "00000000-0000-4000-8000-000000000001", reason: "Cambio ficticio", laborAllocations: [], status: "En Proceso" }).success, false);
console.log("Unavailability policy/validation passed: inclusive dates, Caracas boundaries, cancelled periods, permissions and strict rescheduling payload.");
