import {
  ClipboardList,
  Building2,
  HardHat,
  Cog,
  Wrench,
  Wallet,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { daysFromNow } from "./helpers";

/* KPIs principales del dashboard (datos simulados) */
export const kpis = [
  {
    id: "ordenes",
    label: "Órdenes de Servicio",
    value: 128,
    delta: 8.2,
    icon: ClipboardList,
    tone: "blue",
    hint: "vs. mes anterior",
  },
  {
    id: "clientes",
    label: "Clientes Activos",
    value: 342,
    delta: 4.6,
    icon: Building2,
    tone: "violet",
    hint: "vs. mes anterior",
  },
  {
    id: "tecnicos",
    label: "Técnicos Activos",
    value: 24,
    delta: 0,
    icon: HardHat,
    tone: "cyan",
    hint: "sin cambios este mes",
  },
  {
    id: "equipos",
    label: "Equipos Registrados",
    value: 1254,
    delta: 2.1,
    icon: Cog,
    tone: "orange",
    hint: "vs. mes anterior",
  },
  {
    id: "mantenimientos",
    label: "Mantenimientos Prog.",
    value: 36,
    delta: 12.0,
    icon: Wrench,
    tone: "amber",
    hint: "próximos 30 días",
  },
  {
    id: "facturacion",
    label: "Facturación del Mes",
    value: 542800,
    format: "currency",
    delta: 12.5,
    icon: Wallet,
    tone: "emerald",
    hint: "vs. mes anterior",
  },
  {
    id: "pendientes",
    label: "Servicios Pendientes",
    value: 18,
    delta: -5.4,
    invert: true, // una bajada de pendientes es positiva
    icon: Clock,
    tone: "red",
    hint: "vs. mes anterior",
  },
  {
    id: "completados",
    label: "Servicios Completados",
    value: 96,
    delta: 9.8,
    icon: CheckCircle2,
    tone: "teal",
    hint: "vs. mes anterior",
  },
];

/* Servicios por mes — gráfico de barras */
export const servicesPerMonth = [
  { month: "Ene", completados: 62, pendientes: 14 },
  { month: "Feb", completados: 58, pendientes: 12 },
  { month: "Mar", completados: 71, pendientes: 16 },
  { month: "Abr", completados: 66, pendientes: 11 },
  { month: "May", completados: 78, pendientes: 15 },
  { month: "Jun", completados: 84, pendientes: 13 },
  { month: "Jul", completados: 96, pendientes: 18 },
  { month: "Ago", completados: 88, pendientes: 12 },
  { month: "Sep", completados: 74, pendientes: 10 },
  { month: "Oct", completados: 81, pendientes: 14 },
  { month: "Nov", completados: 69, pendientes: 9 },
  { month: "Dic", completados: 90, pendientes: 16 },
];

/* Facturación mensual — gráfico de líneas */
export const revenuePerMonth = [
  { month: "Ene", ingresos: 328000, egresos: 198000 },
  { month: "Feb", ingresos: 342000, egresos: 205000 },
  { month: "Mar", ingresos: 385000, egresos: 221000 },
  { month: "Abr", ingresos: 371000, egresos: 214000 },
  { month: "May", ingresos: 412000, egresos: 238000 },
  { month: "Jun", ingresos: 438000, egresos: 246000 },
  { month: "Jul", ingresos: 486000, egresos: 262000 },
  { month: "Ago", ingresos: 459000, egresos: 255000 },
  { month: "Sep", ingresos: 428000, egresos: 241000 },
  { month: "Oct", ingresos: 472000, egresos: 258000 },
  { month: "Nov", ingresos: 445000, egresos: 249000 },
  { month: "Dic", ingresos: 542000, egresos: 289000 },
];

/* Estado de las órdenes — gráfico circular (donut) */
export const ordersByStatus = [
  { name: "Completadas", value: 82, color: "#10b981" },
  { name: "En Proceso", value: 22, color: "#3b82f6" },
  { name: "Pendientes", value: 18, color: "#f59e0b" },
  { name: "Canceladas", value: 6, color: "#ef4444" },
];

/* Rendimiento operativo — gráfico de área */
export const performancePerMonth = [
  { month: "Ene", eficiencia: 78, satisfaccion: 84 },
  { month: "Feb", eficiencia: 80, satisfaccion: 85 },
  { month: "Mar", eficiencia: 83, satisfaccion: 87 },
  { month: "Abr", eficiencia: 81, satisfaccion: 86 },
  { month: "May", eficiencia: 85, satisfaccion: 89 },
  { month: "Jun", eficiencia: 88, satisfaccion: 90 },
  { month: "Jul", eficiencia: 91, satisfaccion: 93 },
  { month: "Ago", eficiencia: 89, satisfaccion: 92 },
  { month: "Sep", eficiencia: 87, satisfaccion: 91 },
  { month: "Oct", eficiencia: 90, satisfaccion: 94 },
  { month: "Nov", eficiencia: 92, satisfaccion: 95 },
  { month: "Dic", eficiencia: 94, satisfaccion: 96 },
];

/* Productividad de técnicos — gráfico radial */
export const techniciansProductivity = [
  { name: "Andrés R.", value: 96 },
  { name: "Camila H.", value: 94 },
  { name: "Valentina D.", value: 93 },
  { name: "Fernanda L.", value: 92 },
  { name: "Sebastián T.", value: 91 },
];

/* Próximos mantenimientos programados */
export const upcomingMaintenances = [
  {
    id: "MNT-01",
    equipment: "Chiller 30RB",
    client: "Alimentos del Valle Ltda.",
    type: "Preventivo",
    date: daysFromNow(1),
  },
  {
    id: "MNT-02",
    equipment: "Torno CNC TL-2",
    client: "Industrias Andinas S.A.",
    type: "Calibración",
    date: daysFromNow(2),
  },
  {
    id: "MNT-03",
    equipment: "Bomba Hidráulica HP-80",
    client: "Minerales del Norte S.A.S.",
    type: "Correctivo",
    date: daysFromNow(4),
  },
  {
    id: "MNT-04",
    equipment: "Prensa Hidráulica 200T",
    client: "AutoPartes Santander",
    type: "Overhaul",
    date: daysFromNow(6),
  },
];
