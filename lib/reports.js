export const REPORT_TIME_ZONE = "America/Caracas";
export const REPORT_ROW_LIMIT = 2000;
export const REPORT_TYPES = [
  {
    value: "pars",
    label: "PAR por cliente",
    description: "PAR registrados, estados, horas presupuestadas e importes.",
    origin: "PAR",
    filterSummary: ["Cliente", "Estado visible", "Finalidad", "Fecha de creación"],
  },
  {
    value: "technician-hours",
    label: "Horas estimadas y reales por técnico",
    description: "Comparación de horas confirmadas en órdenes cerradas.",
    origin: "Horas y cierre",
    filterSummary: ["Cliente", "Técnico", "Clasificación", "Fecha de cierre"],
  },
  {
    value: "service-orders",
    label: "Órdenes de servicio",
    description: "Órdenes con su PAR, estado, clasificación, técnicos y programación.",
    origin: "Órdenes de servicio",
    filterSummary: ["Cliente", "Estado", "Clasificación", "Técnico", "Inicio programado"],
  },
  {
    value: "clients",
    label: "Clientes",
    description: "Código Saint, estado y conteo actual de plantas, contactos y equipos.",
    origin: "Clientes",
    filterSummary: ["Estado Saint"],
  },
  {
    value: "par-monthly",
    label: "PAR por mes",
    description: "Totales comerciales agrupados por mes de creación.",
    origin: "PAR",
    filterSummary: ["Cliente", "Estado visible", "Finalidad", "Fecha de creación"],
  },
];
export const REPORT_PAR_STATUSES = ["Creado", "Aprobado", "En Servicio", "Finalizado", "Rechazado"];
export const REPORT_ORDER_STATUSES = ["Pendiente", "Aprobada", "En Proceso", "Completada", "Cancelada"];
export const REPORT_CLIENT_STATUSES = [
  { value: "1", label: "Activo" },
  { value: "0", label: "Inactivo" },
];
export const EMPTY_REPORT_FILTERS = { type: "pars", clientId: "", technicianId: "", status: "", orderKind: "", parPurpose: "", from: "", to: "" };

const REPORT_FILE_SLUGS = {
  pars: "par-por-cliente",
  "technician-hours": "horas-por-tecnico",
  "service-orders": "ordenes-de-servicio",
  clients: "clientes",
  "par-monthly": "par-por-mes",
};

export function reportTypeMeta(type) {
  return REPORT_TYPES.find((report) => report.value === type) || REPORT_TYPES[0];
}

export function emptyReportFilters(type = "pars") {
  return { ...EMPTY_REPORT_FILTERS, type };
}

/** Claves que el reporte realmente consulta. El resto debe viajar vacío. */
export function reportFilterKeys(type) {
  if (type === "clients") return ["status"];
  if (type === "technician-hours") return ["clientId", "technicianId", "orderKind", "from", "to"];
  if (type === "service-orders") return ["clientId", "technicianId", "status", "orderKind", "from", "to"];
  return ["clientId", "status", "parPurpose", "from", "to"];
}

export function reportActiveFilterCount(filters) {
  return reportFilterKeys(filters.type).filter((key) => filters[key]).length;
}

export function reportUsesClient(type) {
  return type !== "clients";
}

export function reportUsesTechnician(type) {
  return type === "technician-hours" || type === "service-orders";
}

export function reportUsesPurpose(type) {
  return type === "pars" || type === "par-monthly";
}

export function reportUsesOrderKind(type) {
  return type === "technician-hours" || type === "service-orders";
}

export function reportUsesDates(type) {
  return type !== "clients";
}

export function reportDateLabel(type) {
  if (type === "technician-hours") return "Fecha de cierre";
  if (type === "service-orders") return "Inicio programado";
  return "Fecha de creación";
}

export function reportClientStatusLabel(status) {
  if (status === "1") return "Activo";
  if (status === "0") return "Inactivo";
  return "Todos";
}

export function reportFileSlug(type) {
  return REPORT_FILE_SLUGS[type] || "reporte";
}

export function reportFiltersFromSearch(search) {
  const filters = Object.fromEntries(Object.entries(EMPTY_REPORT_FILTERS).map(([key, fallback]) => [key, search.get(key) ?? fallback]));
  if (!REPORT_TYPES.some((report) => report.value === filters.type)) filters.type = "pars";
  const allowed = new Set(reportFilterKeys(filters.type));
  for (const key of Object.keys(EMPTY_REPORT_FILTERS)) {
    if (key !== "type" && !allowed.has(key)) filters[key] = "";
  }
  return filters;
}

export function reportSearch(filters) {
  const search = new URLSearchParams();
  const allowed = new Set(["type", ...reportFilterKeys(filters.type)]);
  for (const key of Object.keys(EMPTY_REPORT_FILTERS)) {
    if (!allowed.has(key) || !filters[key]) continue;
    search.set(key, filters[key]);
  }
  return search.toString();
}

export function reportRowCountLabel(type, count) {
  if (type === "technician-hours") return `${count} renglones de mano de obra`;
  if (type === "service-orders") return `${count} órdenes`;
  if (type === "clients") return `${count} clientes`;
  if (type === "par-monthly") return `${count} meses`;
  return `${count} PAR`;
}

export function reportEmptyDescription(type) {
  if (type === "technician-hours") return "No hay órdenes cerradas con horas reales confirmadas que coincidan con la selección.";
  if (type === "service-orders") return "No hay órdenes de servicio que coincidan con la selección.";
  if (type === "clients") return "No hay clientes que coincidan con la selección.";
  if (type === "par-monthly") return "No hay PAR en los meses que coinciden con la selección.";
  return "No hay PAR que coincidan con la selección.";
}

export function reportInteger(value) {
  return new Intl.NumberFormat("es-VE").format(Number(value) || 0);
}

/** `YYYY-MM` del agrupado mensual, sin desplazar el mes por la zona local del servidor. */
export function reportMonth(monthKey) {
  const [year, month] = String(monthKey || "").split("-").map(Number);
  if (!year || !month) return "Sin mes";
  const label = new Intl.DateTimeFormat("es-VE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function reportDate(value, withTime = false) {
  if (!value) return "Sin registro";
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: REPORT_TIME_ZONE, dateStyle: "short", ...(withTime ? { timeStyle: "short" } : {}),
  }).format(new Date(value));
}

// Los NUMERIC de PostgreSQL llegan como texto. Sumar centésimas enteras evita
// redondeos binarios y pérdida de precisión en totales monetarios grandes.
export function reportUnits(value) {
  const text = String(value ?? "0");
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace(/^-/, "").split(".");
  return (BigInt(whole || "0") * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2))) * (negative ? -1n : 1n);
}

export function reportDecimal(units) {
  const absolute = units < 0n ? -units : units;
  return `${units < 0n ? "-" : ""}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

export function reportNumber(value, signed = false) {
  const units = reportUnits(value);
  const absolute = units < 0n ? -units : units;
  const prefix = units < 0n ? "-" : signed && units > 0n ? "+" : "";
  return `${prefix}${new Intl.NumberFormat("es-VE").format(absolute / 100n)},${String(absolute % 100n).padStart(2, "0")}`;
}

export function reportHistoricalNotes({ undatedHistoryCount = 0, incompleteCount = 0 } = {}) {
  const notes = [];
  if (undatedHistoryCount) notes.push(`${undatedHistoryCount} O/S históricas completadas, de los clientes/técnicos seleccionados, no tienen fecha de cierre ni horas reales confirmadas. No pueden asignarse al período y quedan fuera de los totales.`);
  if (incompleteCount) notes.push(`${incompleteCount} O/S cerradas dentro del período no tienen un reparto de horas confirmado completo. Quedan fuera de la comparación; los datos faltantes no equivalen a cero.`);
  return notes;
}
