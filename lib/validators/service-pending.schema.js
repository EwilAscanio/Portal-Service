import { z } from "zod";
import { MAX_PENDING_LINES } from "../service-pending.js";

export const pendingLinesSchema = z.array(z.object({ id: z.string().uuid(), description: z.string().trim().min(1, "Escriba el pendiente o retire la línea vacía.").max(2000) }).strict())
  .max(MAX_PENDING_LINES).refine((rows) => new Set(rows.map((row) => row.id)).size === rows.length, "No repita identificadores de pendientes.");
export const completePendingSchema = z.object({ revision: z.number().int().nonnegative(), resolution: z.string().trim().min(5, "Explique la solución con al menos 5 caracteres.").max(2000) }).strict();
export const pendingFiltersSchema = z.object({
  status: z.enum(["Pendiente", "Completado", ""]).default("Pendiente"),
  clientId: z.string().uuid().optional(), plantId: z.string().uuid().optional(),
  order: z.string().trim().max(80).default(""), search: z.string().trim().max(200).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).strict();
