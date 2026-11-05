import { z } from "zod";

export const CLIENT_CLASSES = ["A", "B", "C", "Recuperado", "Gobierno", "Potencial (Cliente Nuevo)"];
export const VISIT_OBJECTIVES = ["Servicio", "Seguimiento", "Repuestos", "Máquinas", "Cliente Nuevo", "Renta"];
export const VISIT_TYPES = ["En Físico", "Por Telf", "Por Mail"];
export const OFFICE_ZONES = ["Valencia", "Caracas", "Otro"];

function emptyToNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

const optionalText = (max) => z.preprocess(emptyToNull, z.string().max(max).nullable());

const optionalEmail = z.preprocess(
  emptyToNull,
  z.string().email("Ingrese un correo electrónico válido.").max(150).nullable()
);

const optionalUuid = z.preprocess(
  emptyToNull,
  z.string().uuid("Identificador inválido.").nullable()
);

export const mobileLoginSchema = z.object({
  login: z.string().trim().min(1, "El usuario es obligatorio."),
  password: z.string().min(1, "La contraseña es obligatoria."),
}).strict();

export const mobileProspectSchema = z.object({
  local_id: z.string().uuid("El identificador local del posible cliente es inválido."),
  description: z.string().trim().min(2, "La razón social debe tener al menos 2 caracteres.").max(255),
  rif: z.string().trim().min(1, "El RIF es obligatorio.").max(30),
  contact_name: optionalText(150),
  phone: optionalText(30),
  email: optionalEmail,
  address1: optionalText(255),
}).strict();

export const mobileVisitSchema = z.object({
  local_id: z.string().uuid("El identificador local de la visita es inválido."),
  client_id: optionalUuid,
  client_prospect_id: optionalUuid,
  client_prospect_local_id: optionalUuid,
  plant_id: optionalUuid,
  plant_name: optionalText(200),
  visited_at: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "La fecha de visita no es válida."),
  client_class: z.enum(CLIENT_CLASSES, { message: "La clase de cliente no es válida." }),
  visit_objective: z.enum(VISIT_OBJECTIVES, { message: "El objetivo no es válido." }),
  visit_type: z.enum(VISIT_TYPES, { message: "El tipo de visita no es válido." }),
  contact_name: optionalText(150),
  contact_email: optionalEmail,
  will_quote: z.boolean({ message: "Indique si va a generar cotización." }),
  office_zone: z.enum(OFFICE_ZONES, { message: "La zona de oficina no es válida." }),
  observations: optionalText(4000),
}).strict().superRefine((data, ctx) => {
  const references = [data.client_id, data.client_prospect_id, data.client_prospect_local_id].filter(Boolean);
  if (references.length !== 1) {
    ctx.addIssue({ code: "custom", message: "La visita debe indicar un cliente o un posible cliente.", path: ["client_id"] });
  }
  if (data.client_id && data.plant_name) {
    ctx.addIssue({ code: "custom", message: "En un cliente registrado la planta se elige del catálogo.", path: ["plant_name"] });
  }
  if (!data.client_id && data.plant_id) {
    ctx.addIssue({ code: "custom", message: "Un posible cliente no tiene plantas del catálogo.", path: ["plant_id"] });
  }
});

export const mobileSyncSchema = z.object({
  prospects: z.array(mobileProspectSchema).max(200, "El lote admite hasta 200 posibles clientes.").default([]),
  visits: z.array(mobileVisitSchema).max(200, "El lote admite hasta 200 visitas.").default([]),
}).strict().superRefine((data, ctx) => {
  if (new Set(data.prospects.map((row) => row.local_id)).size !== data.prospects.length) {
    ctx.addIssue({ code: "custom", message: "Hay posibles clientes repetidos en el lote." });
  }
  if (new Set(data.visits.map((row) => row.local_id)).size !== data.visits.length) {
    ctx.addIssue({ code: "custom", message: "Hay visitas repetidas en el lote." });
  }
});
