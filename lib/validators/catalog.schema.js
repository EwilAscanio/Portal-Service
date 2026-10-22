import { z } from "zod";

const optionalText = (max) =>
  z.string().trim().max(max).nullable().optional().or(z.literal(""));

export const plantSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la planta es obligatorio.").max(200),
  code: z.string().trim().min(1, "El código de la planta es obligatorio.").max(50),
  address: optionalText(255),
  clientId: z.string().uuid("Seleccione un cliente valido."),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, "El nombre del contacto es obligatorio.").max(150),
  department: optionalText(150),
  clientId: z.string().uuid("Seleccione un cliente valido."),
  plantId: z.string().uuid("Seleccione una planta valida."),
  phone: optionalText(30),
  email: z.string().trim().email("Ingrese un correo electronico valido.").max(150).nullable().optional().or(z.literal("")),
});
