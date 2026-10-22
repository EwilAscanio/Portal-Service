import { ROLES } from "./permissions.js";

export const CLOSURE_DOCUMENTS = [
  { value: "service_report", label: "Reporte de Servicio" },
  { value: "work_checklist", label: "Check List de Trabajo" },
  { value: "pre_verification", label: "Lista de Verificación Previa" },
  { value: "post_verification", label: "Lista de Verificación Posterior" },
];
export const MAX_CLOSURE_FILE_SIZE = 10 * 1024 * 1024;
export const CLOSURE_READ_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO];
export function canManageClosure(role) {
  return [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR].includes(role);
}
export function canCloseServiceOrder(role) {
  return [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR].includes(role);
}
export function closureError(code, message) {
  return Object.assign(new Error(message), { code });
}
export function requirementStatus(requirement) {
  if (requirement.not_applicable) return "No aplica";
  return requirement.files?.some((file) => !file.retired_at) ? "Adjunto" : "Pendiente";
}
