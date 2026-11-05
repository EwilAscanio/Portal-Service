import { z } from "zod";
import { validUnavailabilityDate, UNAVAILABILITY_REASONS } from "../technician-unavailability.js";

const date = z.string().refine(validUnavailabilityDate, "Ingrese una fecha válida (AAAA-MM-DD).");
const reason = z.string().trim().min(5, "Explique el motivo (mínimo 5 caracteres).").max(2000);
const period = { reasonType: z.enum(UNAVAILABILITY_REASONS.map((reason) => reason.value), { error: "Seleccione un motivo de no disponibilidad válido." }), startDate: date, endDate: date, note: z.string().trim().max(2000).optional().default("") };
const ordered = (value) => value.endDate >= value.startDate;
const message = { message: "El último día debe ser igual o posterior al inicio.", path: ["endDate"] };
const hasOtherDetail = (value) => value.reasonType !== "Otros" || value.note.length >= 5;
const otherMessage = { message: "Para Otros, explique el detalle administrativo (mínimo 5 caracteres).", path: ["note"] };
export const unavailabilityCreateSchema = z.object(period).strict().refine(ordered, message).refine(hasOtherDetail, otherMessage);
export const unavailabilityUpdateSchema = z.object({ ...period, revision: z.number().int().positive(), reason }).strict().refine(ordered, message).refine(hasOtherDetail, otherMessage);
export const unavailabilityCancelSchema = z.object({ revision: z.number().int().positive(), reason }).strict();
export const unavailabilityImpactSchema = z.object({ startDate: date, endDate: date }).strict().refine(ordered, message);
