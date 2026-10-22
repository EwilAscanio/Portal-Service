import { z } from "zod";
import { CLOSURE_DOCUMENTS } from "../service-order-closure.js";

export const equipmentIdsSchema = z.array(z.string().uuid()).min(1, "Seleccione al menos un equipo del PAR.").max(500)
  .refine((ids) => new Set(ids).size === ids.length, "No repita equipos.");
const revision = z.number().int().nonnegative();
const note = z.string().trim().max(2000);
// Vacío no equivale a cero: cada técnico debe reportar expresamente sus horas.
const actualHours = z.number().finite().min(0).max(999999.99).multipleOf(0.01, "Use como máximo dos decimales.");
export const closureActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("equipment"), revision, equipmentIds: equipmentIdsSchema }).strict(),
  z.object({ action: z.literal("hours"), revision,
    actuals: z.array(z.object({ allocationId: z.string().regex(/^\d+$/), hours: actualHours, note }).strict()).max(500),
    notes: note, excessReason: note,
  }).strict(),
  z.object({ action: z.literal("requirement"), revision, equipmentId: z.string().uuid(),
    category: z.enum(CLOSURE_DOCUMENTS.map((entry) => entry.value)), notApplicable: z.boolean(), justification: note,
  }).strict(),
  z.object({ action: z.literal("close"), revision }).strict(),
]);
export const retireFileSchema = z.object({ revision, reason: note.min(5, "Explique por qué retira el archivo (mínimo 5 caracteres).") }).strict();
