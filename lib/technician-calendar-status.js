export const CALENDAR_ORDER_STATUS = {
  Aprobada: {
    label: "Programada",
    detail: "Pendiente de iniciar",
    badgeVariant: "info",
    backgroundColor: "#2563eb",
    borderColor: "#1d4ed8",
    textColor: "#ffffff",
  },
  "En Proceso": {
    label: "En ejecución",
    detail: "Servicio iniciado",
    badgeVariant: "brand",
    backgroundColor: "#f97316",
    borderColor: "#ea580c",
    textColor: "#ffffff",
  },
  Completada: {
    label: "Completada",
    detail: "Servicio finalizado",
    badgeVariant: "success",
    backgroundColor: "#059669",
    borderColor: "#047857",
    textColor: "#ffffff",
  },
};

export function getCalendarOrderStatus(status) {
  return CALENDAR_ORDER_STATUS[status] || {
    label: status,
    detail: status,
    badgeVariant: "neutral",
    backgroundColor: "#64748b",
    borderColor: "#475569",
    textColor: "#ffffff",
  };
}

export function getFullCalendarEventStyle(status, hasConflict = false) {
  const presentation = getCalendarOrderStatus(status);

  return {
    color: presentation.backgroundColor,
    contrastColor: presentation.textColor,
    className: hasConflict ? "mq-calendar-conflict" : "",
  };
}
