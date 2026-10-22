import { z } from "zod";

const userFields = z.object({
  login: z
    .string()
    .trim()
    .min(3, "El login debe tener al menos 3 caracteres.")
    .max(50, "El login no puede exceder 50 caracteres."),
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  roleId: z.coerce.number().int().min(1, "Seleccione un rol válido."),
  status: z.enum(["Activo", "Inactivo"], {
    message: "El estado debe ser Activo o Inactivo.",
  }),
});

const passwordSchema = z
  .string()
  .min(6, "La contraseña debe tener al menos 6 caracteres.")
  .max(200, "La contraseña es demasiado larga.");

export const userSchema = userFields.extend({
  password: passwordSchema,
});

export const userUpdateSchema = userFields.extend({
  status: userFields.shape.status.optional(),
  password: passwordSchema.optional(),
});

export const userStatusSchema = z.object({
  status: userFields.shape.status,
});
