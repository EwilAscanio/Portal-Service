import { z } from "zod";
import { parItemSchema } from "./par.schema";

export const parTemplateTypeSchema = z.enum(["Servicio", "Ventas"]);

export const parTemplateSchema = z.object({
  type: parTemplateTypeSchema,
  name: z
    .string()
    .trim()
    .min(1, "El nombre de la plantilla es obligatorio.")
    .max(150, "El nombre no puede superar 150 caracteres."),
  description: z.string().trim().nullable().optional().or(z.literal("")),
  items: z.array(parItemSchema).optional(),
});
