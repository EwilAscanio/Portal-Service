import { ROLES } from "./permissions.js";

export const ORDER_KINDS = [{ value: "Normal", label: "Normal" }, { value: "Garantia", label: "Garantía" }];
export const PAR_PURPOSES = [{ value: "Comercial", label: "Comercial" }, { value: "ReferenciaGarantia", label: "Referencia de garantía" }];
export const WARRANTY_MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR];
export const canManageWarranty = (role) => WARRANTY_MANAGER_ROLES.includes(role);
export const orderKindLabel = (kind) => kind === "Garantia" ? "Garantía" : "Normal";
export const parPurposeLabel = (purpose) => purpose === "ReferenciaGarantia" ? "Referencia de garantía" : "Comercial";
export function warrantyError(message, forbidden = false) {
  return Object.assign(new Error(message), { code: forbidden ? "WARRANTY_FORBIDDEN" : "WARRANTY_INVALID" });
}
