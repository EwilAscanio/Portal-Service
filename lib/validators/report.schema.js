import { z } from "zod";
import { REPORT_PAR_STATUSES } from "@/lib/reports";

const optionalId = z.union([z.uuid(), z.literal("")]).default("");
const date = z.union([z.iso.date(), z.literal("")]).default("");

export const reportFiltersSchema = z.object({
  type: z.enum(["pars", "technician-hours"]),
  clientId: optionalId,
  technicianId: optionalId,
  status: z.union([z.enum(REPORT_PAR_STATUSES), z.literal("")]).default(""),
  from: date,
  to: date,
}).strict().superRefine((value, context) => {
  if (value.from && value.to && value.from > value.to) context.addIssue({ code: "custom", path: ["to"], message: "La fecha final debe ser igual o posterior a la inicial." });
  if (value.type === "pars" && value.technicianId) context.addIssue({ code: "custom", path: ["technicianId"], message: "El filtro de técnico solo corresponde al reporte de horas." });
  if (value.type === "technician-hours" && value.status) context.addIssue({ code: "custom", path: ["status"], message: "El reporte de horas incluye únicamente órdenes cerradas." });
});
