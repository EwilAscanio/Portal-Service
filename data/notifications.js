import { minutesAgo } from "./helpers";

/**
 * type: order | equipment | billing | system | client
 * Se mapea a icono y color en el menú de notificaciones.
 */
export const notifications = [
  {
    id: "NTF-1",
    type: "order",
    title: "Nueva orden de servicio",
    description: "OS-2415 asignada a Andrés Rodríguez — Cinta Transportadora CT-12.",
    time: minutesAgo(8),
    read: false,
  },
  {
    id: "NTF-2",
    type: "equipment",
    title: "Equipo fuera de servicio",
    description: "La Bomba Hidráulica HP-80 reportó falla crítica en Mina El Paso.",
    time: minutesAgo(34),
    read: false,
  },
  {
    id: "NTF-3",
    type: "billing",
    title: "Pago recibido",
    description: "Industrias Andinas S.A. pagó la factura FAC-00892 por $7,380.",
    time: minutesAgo(120),
    read: false,
  },
  {
    id: "NTF-4",
    type: "system",
    title: "Mantenimiento programado",
    description: "El Torno CNC TL-2 tiene mantenimiento preventivo en 2 días.",
    time: minutesAgo(300),
    read: true,
  },
  {
    id: "NTF-5",
    type: "client",
    title: "Nuevo cliente registrado",
    description: "Naviera del Magdalena se registró como cliente activo.",
    time: minutesAgo(60 * 26),
    read: true,
  },
  {
    id: "NTF-6",
    type: "system",
    title: "Stock bajo de repuestos",
    description: "Quedan 3 unidades de rodamientos SKF-6208 en inventario.",
    time: minutesAgo(60 * 50),
    read: true,
  },
];
