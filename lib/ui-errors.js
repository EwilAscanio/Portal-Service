const PUBLIC_STATUS_MESSAGES = {
  401: "Tu sesión ya no es válida. Inicia sesión nuevamente.",
  403: "No tienes permisos para realizar esta acción.",
  404: "El recurso solicitado no existe.",
  409: "La operación entra en conflicto con datos existentes.",
};

export function getPublicError(error, fallback = "No se pudo completar la operación.") {
  const status = error?.response?.status ?? error?.status;
  if (PUBLIC_STATUS_MESSAGES[status]) return PUBLIC_STATUS_MESSAGES[status];
  const responseMessage = error?.response?.data?.error;
  return typeof responseMessage === "string" && responseMessage.length < 180
    ? responseMessage
    : fallback;
}

export function getHttpStatus(error) {
  return error?.response?.status ?? error?.status ?? null;
}
