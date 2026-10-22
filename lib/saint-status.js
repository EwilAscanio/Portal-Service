export const SAINT_CLIENT_STATUSES = ["0", "1"];

export function normalizeSaintClientStatus(value) {
  const status = String(value ?? "1");
  if (!SAINT_CLIENT_STATUSES.includes(status)) {
    const error = new Error(`Estado Saint inválido: ${status}`);
    error.code = "SAINT_INVALID_STATUS";
    throw error;
  }
  return status;
}
