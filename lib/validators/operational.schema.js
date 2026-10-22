import { z } from "zod";
import { EQUIPMENT_STATUSES } from "../equipment-status.js";
import { equipmentIdsSchema } from "./service-order-closure.schema.js";

const optionalText = (max) => z.string().trim().max(max).nullable().optional().or(z.literal(""));
const dateInput = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Ingrese una fecha válida.");

const maxMessage = (label, max) => `${label} no puede exceder ${max} caracteres.`;
const optionalNumber = (label) =>
  z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.coerce.number({ error: `Ingrese un valor válido para ${label}.` }).finite().min(0, `El valor de ${label} no puede ser negativo.`).nullable()
  );

export const equipmentSchema = z.object({
  name: z.string().trim().min(1, "El tipo de equipo es obligatorio.").max(200, maxMessage("El tipo de equipo", 200)),
  brand: z.string().trim().min(1, "La marca es obligatoria.").max(100, maxMessage("La marca", 100)),
  model: z.string().trim().min(1, "El modelo es obligatorio.").max(100, maxMessage("El modelo", 100)),
  serial: z.string().trim().min(1, "El serial es obligatorio.").max(50, maxMessage("El serial", 50)),
  clientId: z.string().uuid("Seleccione un cliente válido."), plantId: z.string().uuid("Seleccione una planta válida.").nullable().optional(), location: optionalText(200),
  consortium: optionalText(150), hp: optionalNumber("la potencia"), pressure: optionalNumber("la presión"),
  status: z.enum(EQUIPMENT_STATUSES, { error: "Seleccione un estado válido." }).optional(),
});

export const equipmentFormSchema = equipmentSchema.extend({
  plantId: z.string().uuid("Seleccione una planta válida."),
});

export const productSchema = z.object({
  requiresTechnician: z.boolean().optional(),
  code: z.string().trim().min(1, "El código es obligatorio.").max(30, maxMessage("El código", 30)),
  description: z.string().trim().min(1, "La descripción es obligatoria.").max(255, maxMessage("La descripción", 255)),
  brand: optionalText(100), serial: optionalText(50), modelo: optionalText(100),
  cost: z.coerce.number({ error: "El costo es obligatorio y debe ser numérico." }).finite().min(0, "El costo no puede ser negativo."),
  price: z.coerce.number({ error: "El precio es obligatorio y debe ser numérico." }).finite().min(0, "El precio no puede ser negativo."),
  category: z.enum(["Servicio", "Repuestos"], { error: "Seleccione una categoría válida." }), stock: z.coerce.number().finite().int().min(0, "La existencia no puede ser negativa.").optional().default(0), status: z.enum(["Activo", "Inactivo"], { error: "Seleccione un estado válido." }).optional().default("Activo"),
});

export const technicalSchema = z.object({
  cedula: z.string().trim().min(1).max(20), name: z.string().trim().min(2).max(120), phone: optionalText(30),
  email: z.string().email("Ingrese un correo electrónico válido.").nullable().optional().or(z.literal("")), status: z.enum(["Activo", "Inactivo"]).optional().default("Activo"),
  userId: z.string().uuid("Seleccione un usuario válido.").nullable().optional().or(z.literal("")),
});

const serviceOrderFields = {
  purchaseOrderNumber: optionalText(50),
  quotationNumber: optionalText(50),
  parId: z.coerce.number().int().positive("Seleccione un PAR válido."),
  equipmentIds: equipmentIdsSchema,
  workType: z.enum(["Internal", "External"]),
  serviceType: z.enum(["Inspection", "Maintenance", "Emergency", "Other"]),
  callDate: dateInput,
  scheduledStart: dateInput,
  scheduledEnd: dateInput,
  laborAllocations: z.array(z.object({
    parItemId: z.coerce.number().int().positive(),
    technicalId: z.string().uuid("Seleccione un técnico válido."),
    hours: z.coerce.number().finite().positive("Las horas deben ser mayores a cero.").max(999999.99).multipleOf(0.01, "Use como máximo dos decimales."),
  })).max(500),
  leadTechnicianId: z.string().uuid().optional(),
  reviewLabor: z.boolean().optional(),
  laborReviewNote: z.string().trim().min(5, "Explique la distribución de las horas anteriores.").max(2000).optional(),
  priority: z.enum(["Alta", "Media", "Baja"]).optional(),
  status: z.enum(["Pendiente", "Aprobada", "En Proceso", "Completada", "Cancelada"]).optional(),
  confirmScheduleConflict: z.boolean().optional(),
};

function validSchedule(data, context) {
  if (data.scheduledStart && data.scheduledEnd && new Date(data.scheduledEnd) <= new Date(data.scheduledStart)) {
    context.addIssue({ code: "custom", path: ["scheduledEnd"], message: "La fecha hasta debe ser posterior a la fecha desde." });
  }
}

export const serviceOrderSchema = z.object(serviceOrderFields).strict().superRefine(validSchedule);
export const serviceOrderUpdateSchema = z.object(serviceOrderFields).partial().strict().superRefine(validSchedule);

export const configurationSchema = z.object({
  company_name: z.string().trim().max(200).optional().or(z.literal("")), rif: optionalText(30), phone: optionalText(30), email: z.string().email("Ingrese un correo electrónico válido.").nullable().optional().or(z.literal("")), address: optionalText(255), website: optionalText(150), city: optionalText(100), country: optionalText(100), logo: optionalText(255), facebook: optionalText(150), instagram: optionalText(150), linkedin: optionalText(150), exchange_rate: z.coerce.number().finite().min(0).optional(),
}).refine((data) => Boolean(data.company_name?.trim()) || data.exchange_rate != null, { message: "El nombre de la empresa o la tasa de cambio es obligatorio." });
