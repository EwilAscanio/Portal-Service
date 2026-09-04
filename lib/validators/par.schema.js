import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  EQUIPOS (incluye el equipo principal is_main)                      */
/* ------------------------------------------------------------------ */

export const parEquipmentSchema = z.object({
  id: z.number().int().positive().optional(),
  itemNo: z.coerce.number().int().min(1, "El número de ítem debe ser mayor a 0.").optional(),
  isMain: z.boolean().optional(),
  equipmentId: z.string().uuid("Seleccione un equipo válido.").nullable().optional(),
  tipo: z.string().trim().max(120).nullable().optional().or(z.literal("")),
  marca: z.string().trim().max(100).nullable().optional().or(z.literal("")),
  serial: z.string().trim().max(50).nullable().optional().or(z.literal("")),
  modelo: z.string().trim().max(100).nullable().optional().or(z.literal("")),
  observaciones: z.string().trim().nullable().optional().or(z.literal("")),
});

/* ------------------------------------------------------------------ */
/*  ÍTEMS (productos adicionales)                                      */
/* ------------------------------------------------------------------ */

export const parItemSchema = z.object({
  id: z.number().int().positive().optional(),
  itemNo: z.coerce.number().int().min(1, "El número de ítem debe ser mayor a 0.").optional(),
  productId: z.string().uuid("Seleccione un producto válido.").nullable().optional(),
  descripcion: z.string().trim().min(1, "La descripción es obligatoria."),
  qty: z.coerce.number().min(0, "La cantidad no puede ser negativa.").nullable().optional(),
  categoria: z.string().trim().nullable().optional().or(z.literal("")),
  ccn: z.string().trim().nullable().optional().or(z.literal("")),
  usList: z.string().trim().nullable().optional().or(z.literal("")),
  multiplicador: z.coerce.number().min(0, "El multiplicador no puede ser negativo.").optional(),
  valorUnitUsd: z.coerce.number().min(0, "El valor unitario no puede ser negativo.").nullable().optional(),
  valorPercent: z.coerce.number().min(0).nullable().optional(),
  lineTotalUsd: z.coerce.number().min(0).optional(),
});

/* ------------------------------------------------------------------ */
/*  CABECERA                                                          */
/* ------------------------------------------------------------------ */

export const parHeaderSchema = z.object({
  clientId: z.string().uuid("Seleccione un cliente válido."),
  atencion: z.string().trim().max(200).nullable().optional().or(z.literal("")),
  fechaEmision: z.string().nullable().optional().or(z.literal("")),
  exchangeRate: z.coerce.number().min(0, "La tasa no puede ser negativa."),
  observations: z.string().trim().nullable().optional().or(z.literal("")),
  elaboradoPor: z.string().trim().max(120).nullable().optional().or(z.literal("")),
  equipment: z.array(parEquipmentSchema).optional(),
  items: z.array(parItemSchema).optional(),
});

/** Actualización tras la creación: solo se permiten cambios en los ítems. */
export const parItemsUpdateSchema = z.object({
  items: z.array(parItemSchema),
});

export const parStatusSchema = z.object({
  status: z.enum(
    ["Creado", "Aprobado", "En Servicio", "Finalizado", "Rechazado"],
    { message: "Estado inválido." }
  ),
});

/* ------------------------------------------------------------------ */
/*  BÚSQUEDA / LISTADO                                                */
/* ------------------------------------------------------------------ */

export const parSearchSchema = z.object({
  status: z
    .enum(["Creado", "Aprobado", "En Servicio", "Finalizado", "Rechazado"])
    .optional(),
  clientId: z.string().uuid().optional(),
  search: z.string().optional().or(z.literal("")),
});
