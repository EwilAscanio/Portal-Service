import { Temporal } from "temporal-polyfill";
import { ROLES } from "./permissions.js";

// Los días de ausencia se interpretan igual en servidor y navegador, independientemente del equipo.
export const OPERATION_TIME_ZONE = "America/Caracas";
export const OPEN_SERVICE_ORDER_STATUSES = ["Pendiente", "Aprobada", "En Proceso"];
export const UNAVAILABILITY_MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR];
export const canManageUnavailability = (role) => UNAVAILABILITY_MANAGER_ROLES.includes(role);
export const canReadUnavailability = (role) => canManageUnavailability(role) || role === ROLES.COORDINADOR;

export const UNAVAILABILITY_REASONS = [
  { value: "Vacaciones", label: "Vacaciones" },
  { value: "DiasCompensatorios", label: "Días compensatorios" },
  { value: "Enfermedad", label: "Enfermedad" },
  { value: "Permisos", label: "Permisos" },
  { value: "Otros", label: "Otros" },
];
export const unavailabilityReasonLabel = (value) => UNAVAILABILITY_REASONS.find((reason) => reason.value === value)?.label || "Sin categoría";
// Solo para snapshots administrativos previos a 058; nunca inferir categorías en catálogos públicos.
export const historicalUnavailabilityReason = (snapshot) => unavailabilityReasonLabel(snapshot?.reason_type ?? "Vacaciones");

export function validUnavailabilityDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "") || value < "1900-01-01" || value > "9998-12-31") return false;
  try { return Temporal.PlainDate.from(value).toString() === value; } catch { return false; }
}

export function unavailabilityBounds(startDate, endDate) {
  const start = Temporal.PlainDate.from(startDate);
  const end = Temporal.PlainDate.from(endDate).add({ days: 1 });
  return { start: start.toZonedDateTime(OPERATION_TIME_ZONE).toInstant().toString(),
    end: end.toZonedDateTime(OPERATION_TIME_ZONE).toInstant().toString(), endDateExclusive: end.toString() };
}

export function operationDate(value = new Date()) {
  return Temporal.Instant.from(new Date(value).toISOString()).toZonedDateTimeISO(OPERATION_TIME_ZONE).toPlainDate().toString();
}

export function operationDateTimeInput(value = new Date()) {
  try { return Temporal.Instant.from(new Date(value).toISOString()).toZonedDateTimeISO(OPERATION_TIME_ZONE).toPlainDateTime().toString({ smallestUnit: "minute" }); } catch { return ""; }
}

export function operationInputToInstant(value) {
  return Temporal.PlainDateTime.from(value).toZonedDateTime(OPERATION_TIME_ZONE).toInstant().toString();
}

export function unavailabilityStatus(unavailability, today = operationDate()) {
  if (unavailability.cancelled_at) return "Cancelado";
  if (today < unavailability.start_date) return "Programado";
  return today > unavailability.end_date ? "Finalizado" : "Vigente";
}

export function unavailabilityOverlapping(unavailability = [], start, end) {
  const from = new Date(start).getTime(), to = new Date(end).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
  return unavailability.filter((unavailability) => {
    if (unavailability.cancelled_at) return false;
    const bounds = unavailabilityBounds(unavailability.start_date, unavailability.end_date);
    return from < new Date(bounds.end).getTime() && to > new Date(bounds.start).getTime();
  });
}

export function schedulingError(code, message, conflicts = []) {
  return Object.assign(new Error(message), { code, conflicts });
}
