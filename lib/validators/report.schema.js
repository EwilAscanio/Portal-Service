import { z } from "zod";
import { REPORT_CLIENT_STATUSES, REPORT_ORDER_STATUSES, REPORT_PAR_STATUSES } from "@/lib/reports";

const optionalId = z.union([z.uuid(), z.literal("")]).default("");
const date = z.union([z.iso.date(), z.literal("")]).default("");
const PAR_TYPES = new Set(["pars", "par-monthly"]);
const CLIENT_STATUS = new Set(REPORT_CLIENT_STATUSES.map((status) => status.value));

export const reportFiltersSchema = z.object({
  type: z.enum(["pars", "technician-hours", "service-orders", "clients", "par-monthly", "technician-calendar"]),
  clientId: optionalId,
  technicianId: optionalId,
  status: z.string().default(""),
  orderKind: z.enum(["", "Normal", "Garantia"]).default(""),
  parPurpose: z.enum(["", "Comercial", "ReferenciaGarantia"]).default(""),
  from: date,
  to: date,
}).strict().superRefine((value, context) => {
  const issue = (path, message) => context.addIssue({ code: "custom", path: [path], message });
  const usesTechnician = value.type === "technician-hours" || value.type === "service-orders" || value.type === "technician-calendar";
  const usesKind = value.type === "technician-hours" || value.type === "service-orders";
  if (!PAR_TYPES.has(value.type) && value.parPurpose) issue("parPurpose", "La finalidad solo corresponde a los reportes de PAR.");
  if (!usesKind && value.orderKind) issue("orderKind", "La clasificación no corresponde al reporte seleccionado.");
  if (!usesTechnician && value.technicianId) issue("technicianId", "El filtro de técnico no corresponde al reporte seleccionado.");
  if (value.type === "technician-hours" && value.status) issue("status", "El reporte de horas incluye únicamente órdenes cerradas.");
  if (value.type === "clients" && value.clientId) issue("clientId", "El reporte de clientes solo filtra por estado Saint.");
  if (value.type === "clients" && (value.from || value.to)) issue(value.from ? "from" : "to", "El reporte de clientes no filtra por fecha.");
  if (PAR_TYPES.has(value.type) && value.status && !REPORT_PAR_STATUSES.includes(value.status)) issue("status", "El estado no corresponde al reporte de PAR.");
  if (value.type === "service-orders" && value.status && !REPORT_ORDER_STATUSES.includes(value.status)) issue("status", "El estado no corresponde a una orden de servicio.");
  if (value.type === "clients" && value.status && !CLIENT_STATUS.has(value.status)) issue("status", "El estado del cliente debe ser activo o inactivo.");
  if (value.type === "technician-calendar" && value.clientId) issue("clientId", "El calendario solo filtra por técnico y fechas.");
  if (value.type === "technician-calendar" && value.status) issue("status", "El calendario no filtra por estado.");
  if (value.from && value.to && value.from > value.to) issue("to", "La fecha final debe ser igual o posterior a la inicial.");
});
