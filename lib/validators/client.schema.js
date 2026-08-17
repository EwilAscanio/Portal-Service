import { z } from "zod";

export const clientSchema = z.object({
  codclie: z.string().trim().min(1, "El código del cliente es obligatorio."),
  description: z.string().trim().min(2, "La descripción debe tener al menos 2 caracteres."),
  rif: z.string().trim().min(1, "El RIF es obligatorio."),
  email: z.string().email("Ingrese un correo electrónico válido.").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  mobile: z.string().optional().or(z.literal("")),
  address1: z.string().optional().or(z.literal("")),
  address2: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  status: z.enum(["Activo", "Inactivo"], {
    message: "El estado debe ser Activo o Inactivo.",
  }),
});

export const clientSearchSchema = z.object({
  query: z.string().optional().or(z.literal("")),
  status: z.enum(["Activo", "Inactivo"]).optional(),
  page: z.coerce.number().min(1, "La página debe ser mayor a 0.").default(1),
  limit: z.coerce.number().min(1).max(100, "El límite máximo es 100.").default(20),
});
