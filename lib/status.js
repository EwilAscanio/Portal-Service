/**
 * Mapas de estado → variante de Badge.
 * Centraliza la semántica visual de cada entidad del sistema.
 */
export const ORDER_STATUS_VARIANTS = {
  Completada: "success",
  "En Proceso": "info",
  Pendiente: "warning",
  Cancelada: "danger",
};

export const EQUIPMENT_STATUS_VARIANTS = {
  Operativo: "success",
  "En Mantenimiento": "warning",
  "Fuera de Servicio": "danger",
};

export const TECHNICIAN_STATUS_VARIANTS = {
  Activo: "success",
  Inactivo: "danger",
};

export const CLIENT_STATUS_VARIANTS = {
  Activo: "success",
  Inactivo: "neutral",
};

export const USER_STATUS_VARIANTS = {
  Activo: "success",
  Inactivo: "danger",
};

export const PRIORITY_VARIANTS = {
  Alta: "danger",
  Media: "warning",
  Baja: "neutral",
};

export const ROLE_VARIANTS = {
  Administrador: "brand",
  Supervisor: "info",
  Coordinador: "purple",
  Técnico: "warning",
  Usuario: "neutral",
};

export const ROLE_BADGE = {
  Administrador: "danger",
  Supervisor: "info",
  Coordinador: "purple",
  Técnico: "warning",
  Usuario: "neutral",
};

export const PAR_STATUS_VARIANTS = {
  Creado: "neutral",
  Aprobado: "success",
  "En Servicio": "info",
  Finalizado: "brand",
  Rechazado: "danger",
};

/** Tipos predefinidos de plantillas de PAR (solo clasificación). */
export const PAR_TEMPLATE_TYPES = ["Servicio", "Ventas"];

export const PAR_TEMPLATE_TYPE_VARIANTS = {
  Servicio: "purple",
  Ventas: "success",
};
