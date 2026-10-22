import { z } from "zod";

export const equipmentRowSchema = z.object({
  itemNo: z.coerce.number().optional(),
  isMain: z.boolean().optional(),
  equipmentId: z.string().optional().or(z.literal("")),
  tipo: z.string().optional().or(z.literal("")),
  marca: z.string().optional().or(z.literal("")),
  serial: z.string().optional().or(z.literal("")),
  modelo: z.string().optional().or(z.literal("")),
  observaciones: z.string().trim().min(1, "La descripción del trabajo a realizar es obligatoria."),
});

export const itemRowSchema = z.object({
  sourceItemId: z.number().int().positive().optional(),
  requiresTechnician: z.boolean().optional(),
  itemNo: z.coerce.number().optional(),
  productId: z.string().optional().or(z.literal("")),
  descripcion: z.string().optional().or(z.literal("")),
  qty: z.string().optional().or(z.literal("")),
  categoria: z.enum(["Servicio", "Repuestos"]),
  ccn: z.string().optional().or(z.literal("")),
  usList: z.string().optional().or(z.literal("")),
  multiplicador: z.string().optional().or(z.literal("")),
  valorUnitUsd: z.string().optional().or(z.literal("")),
  valorPercent: z.string().optional().or(z.literal("")),
});

export const parFormSchema = z.object({
  clientId: z.string().min(1, "Seleccione un cliente."),
  plantId: z.string().min(1, "Seleccione una planta."),
  contactId: z.string().min(1, "Seleccione un contacto."),
  fechaEmision: z.string().optional().or(z.literal("")),
  exchangeRate: z.string().optional().or(z.literal("")),
  observations: z.string().optional().or(z.literal("")),
  elaboradoPor: z.string().optional().or(z.literal("")),
  equipment: z.array(equipmentRowSchema).optional(),
  items: z.array(itemRowSchema).optional(),
});

export const FIELD_LABELS = {
  clientId: "Cliente",
  plantId: "Planta",
  contactId: "Contacto",
  fechaEmision: "Fecha de emisión",
  exchangeRate: "Tasa vigente",
  observations: "Observaciones generales",
  elaboradoPor: "Elaborado por",
  tipo: "Tipo",
  marca: "Marca",
  serial: "Serial",
  modelo: "Modelo",
  observaciones: "Descripción del trabajo a realizar",
  equipmentId: "Equipo (catálogo)",
  productId: "Producto",
  descripcion: "Descripción",
  qty: "Cantidad",
  categoria: "Categoría",
  ccn: "CCN",
  usList: "US List",
  multiplicador: "Multiplicador",
  valorUnitUsd: "Valor unitario $",
  valorPercent: "Valor %",
  itemNo: "N°",
  isMain: "Equipo principal",
};

export function formatIssues(issues) {
  return issues
    .map((issue) => {
      const [section, index, field] = issue.path;
      let label;
      if (section === "equipment" || section === "items") {
        const prefix = section === "equipment" ? "Equipo" : "Ítem";
        label = `${prefix} ${Number(index) + 1} · ${FIELD_LABELS[field] || field}`;
      } else {
        label = FIELD_LABELS[section] || section;
      }
      return `• ${label}: ${issue.message}`;
    })
    .join("\n");
}
