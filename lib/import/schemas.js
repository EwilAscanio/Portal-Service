import { z } from "zod";
import { EQUIPMENT_STATUSES } from "../equipment-status.js";

const EQUIPMENT_STATUS_ALIASES = {
  operativo: "Operativo",
  "en mantenimiento": "En Mantenimiento",
  "fuera de servicio": "Fuera de Servicio",
  mudado: "Mudado",
  mudada: "Mudado",
  desechado: "Desechado",
  desechada: "Desechado",
  validar: "Validar",
};

const normalizeEquipmentStatus = (value) => {
  if (typeof value !== "string") return value;
  const key = value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return EQUIPMENT_STATUS_ALIASES[key] ?? value;
};

const toText = (value) => (typeof value === "number" ? String(value) : value);

const optionalText = (max) => z.preprocess(toText, z.string().trim().max(max).nullable().optional());
const requiredText = (label, max) => z.preprocess(toText, z.string().trim().min(1, `${label} es obligatorio.`).max(max));
const nonNegative = (label) => z.preprocess(
  (value) => value === null || value === "" ? undefined : Number(value),
  z.number({ error: `${label} es obligatorio y debe ser numérico.` }).finite().min(0, `${label} no puede ser negativo.`)
);

export const importSchemas = {
  Producto: z.object({
    code: requiredText("El código", 30),
    description: requiredText("La descripción", 255),
    brand: optionalText(100),
    serial: optionalText(50),
    modelo: optionalText(100),
    cost: nonNegative("El costo"),
    price: nonNegative("El precio"),
    category: z.enum(["Servicio", "Repuestos"], { error: "La categoría no es válida." }),
    stock: z.coerce.number({ error: "El stock debe ser numérico." }).int().min(0),
    status: z.enum(["Activo", "Inactivo"], { error: "El estado no es válido." }),
  }),
  Planta: z.object({
    clientCode: requiredText("El código de cliente", 20),
    code: requiredText("El código de la planta", 50),
    name: requiredText("El nombre de la planta", 200),
    address: optionalText(255),
  }),
  Contacto: z.object({
    clientCode: requiredText("El código de cliente", 20),
    plantCode: requiredText("El código de la planta", 50),
    plantName: optionalText(200),
    name: requiredText("El nombre del contacto", 150),
    phone: optionalText(30),
    email: z.string().trim().email("El correo no es válido.").max(150).nullable().optional(),
    department: optionalText(150),
  }),
  Equipo: z.object({
    clientCode: requiredText("El código de cliente", 20),
    plantCode: requiredText("El código de la planta", 50),
    plantName: optionalText(200),
    name: requiredText("El nombre del equipo", 200),
    brand: requiredText("La marca", 100),
    model: requiredText("El modelo", 100),
    serial: requiredText("El serial", 50),
    location: optionalText(200),
    consortium: optionalText(150),
    hp: z.coerce.number().finite().min(0).nullable().optional(),
    pressure: z.coerce.number().finite().min(0).nullable().optional(),
    status: z.preprocess(normalizeEquipmentStatus, z.enum(EQUIPMENT_STATUSES, { error: "El estado no es válido." })),
  }),
};
