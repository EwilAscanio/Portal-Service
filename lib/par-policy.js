import { ROLES } from "./permissions.js";

export const PAR_EDITABLE_STATUS = "Creado";
export const PAR_APPROVED_EDIT_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR];
export const PAR_REVIEW_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR];
export const PAR_LINKABLE_STATUSES = ["Aprobado"];

export function getParEditError(status, { role, hasActiveOrders = false } = {}) {
  if (![PAR_EDITABLE_STATUS, "Aprobado"].includes(status)) {
    return { code: "PAR_LOCKED", message: "Solo se puede modificar un PAR en estado Creado o Aprobado." };
  }
  if (hasActiveOrders) {
    return { code: "PAR_HAS_ACTIVE_ORDERS", message: "No se puede modificar el PAR porque tiene órdenes de servicio no canceladas." };
  }
  if (status === "Aprobado" && !PAR_APPROVED_EDIT_ROLES.includes(role)) {
    return { code: "PAR_EDIT_FORBIDDEN", message: "Solo Superadministrador, Administrador y Supervisor pueden modificar un PAR aprobado." };
  }
  return null;
}

export function canEditPar(status, options) {
  return getParEditError(status, options) === null;
}

export function canReviewPar(role) {
  return PAR_REVIEW_ROLES.includes(role);
}

export function isValidParTransition(from, to) {
  if (from === to) return true;
  return (
    (from === "Creado" && ["Aprobado", "Rechazado"].includes(to)) ||
    (from === "Aprobado" && to === "Rechazado")
  );
}
