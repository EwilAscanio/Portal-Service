import { z } from "zod";

export const userSchema = z.object({
  login: z
    .string()
    .trim()
    .min(3, "El login debe tener al menos 3 caracteres.")
    .max(50, "El login no puede exceder 50 caracteres."),
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  roleId: z.string().uuid("Seleccione un rol válido."),
  status: z.enum(["Activo", "Inactivo"], {
    message: "El estado debe ser Activo o Inactivo.",
  }),
});

export const userUpdateSchema = userSchema.partial();
