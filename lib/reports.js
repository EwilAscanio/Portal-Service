export const REPORT_TIME_ZONE = "America/Caracas";
export const REPORT_ROW_LIMIT = 2000;
export const REPORT_TYPES = [
  { value: "pars", label: "PAR por cliente", description: "PAR registrados, estados, horas presupuestadas e importes." },
  { value: "technician-hours", label: "Horas estimadas y reales por técnico", description: "Comparación de horas confirmadas en órdenes cerradas." },
];
export const REPORT_PAR_STATUSES = ["Creado", "Aprobado", "En Servicio", "Finalizado", "Rechazado"];
export const EMPTY_REPORT_FILTERS = { type: "pars", clientId: "", technicianId: "", status: "", from: "", to: "" };

export function reportFiltersFromSearch(search) {
  return Object.fromEntries(Object.entries(EMPTY_REPORT_FILTERS).map(([key, fallback]) => [key, search.get(key) ?? fallback]));
}

export function reportSearch(filters) {
  const search = new URLSearchParams();
  for (const key of Object.keys(EMPTY_REPORT_FILTERS)) {
    if (key === "status" && filters.type !== "pars") continue;
    if (key === "technicianId" && filters.type !== "technician-hours") continue;
    if (filters[key]) search.set(key, filters[key]);
  }
  return search.toString();
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
