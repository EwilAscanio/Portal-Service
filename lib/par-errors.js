export function getParErrorResponse(error) {
  if (error?.code === "PAR_NOT_FOUND") {
    return { error: "PAR no encontrado", status: 404 };
  }
  if (["PAR_LOCKED", "PAR_EDIT_FORBIDDEN", "PAR_HAS_ACTIVE_ORDERS"].includes(error?.code)) {
    return { error: error.message, status: 403 };
  }
  if (error?.code === "PAR_INVALID_TRANSITION") {
    return { error: error.message, status: 400 };
  }
  if (["PAR_RELATION_INVALID", "PAR_PRODUCT_INVALID", "PAR_PRODUCT_INACTIVE"].includes(error?.code)) {
    return { error: error.message, status: 400 };
  }
  return null;
}
