// Tabla y cards presentan el mismo estado, fecha y acción del registro publicado.
export const PENDING_STATUS_VARIANTS = { Pendiente: "warning", Completado: "success" };
export const PENDING_EMPTY_TITLE = "Sin pendientes para estos filtros";
export const PENDING_EMPTY_DESCRIPTION = "Ajusta los filtros. Los borradores se publican después de cerrar su O/S.";

export const formatPendingDate = (value) => value ? new Date(value).toLocaleString("es-VE") : "—";
export const pendingActionLabel = (item, canComplete) => canComplete && item.status === "Pendiente" ? "Resolver pendiente" : "Ver detalle";
