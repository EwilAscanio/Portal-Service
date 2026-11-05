import { ROLES } from "./permissions.js";
import { canManageClosure } from "./service-order-closure.js";

export const MAX_ORDER_PHOTOS = 5;
export const MAX_PENDING_LINES = 200;
export const PENDING_READ_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO];
export const canCompletePending = canManageClosure;
export const canReadPending = (role) => PENDING_READ_ROLES.includes(role);


// getRandomValues también funciona en el portal servido por HTTP dentro de la LAN.
export function createPendingLineId() {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  const bytes=globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,(value)=>value.toString(16).padStart(2,"0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
