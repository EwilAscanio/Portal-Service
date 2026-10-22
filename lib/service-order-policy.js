import { ROLES } from "./permissions.js";

export const ORDER_APPROVAL_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.SUPERVISOR,
];

export function canApproveServiceOrder(role) {
  return ORDER_APPROVAL_ROLES.includes(role);
}

export function canEditServiceOrder(status) {
  return status === "Pendiente";
}

// El total estimado es derivado. Las horas reales solo se escriben mediante el expediente de cierre.
export function canUpdateWorkedHours() {
  return false;
}

export function isValidServiceOrderTransition(from, to) {
  if (from === to) return true;
  const transitions = {
    Pendiente: ["Aprobada", "Cancelada"],
    Aprobada: ["En Proceso", "Cancelada"],
    "En Proceso": ["Completada", "Cancelada"],
    Completada: [],
    Cancelada: [],
  };
  return transitions[from]?.includes(to) ?? false;
}
