import {
  LayoutDashboard,
  Building2,
  Cog,
  ClipboardList,
  HardHat,
  BarChart3,
  UserCog,
  Settings,
  User,
  Users,
  FileText,
  CalendarDays,
  PackageCheck,
  LayoutTemplate,
} from "lucide-react";
import { ROLES } from "./permissions";

const ALL_ROLES = Object.values(ROLES);

export const APP_NAME = "Maquitech";
export const APP_TAGLINE = "Gestión Industrial Inteligente";

/* Claves de persistencia en localStorage */
export const THEME_KEY = "mq-theme";
export const SIDEBAR_KEY = "mq-sidebar";
export const REMEMBER_KEY = "mq-remember";

/* Navegación principal del sidebar, agrupada por secciones */
export const NAV_SECTIONS = [
  {
    label: "Principal",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
      { label: "Clientes", href: "/clientes", icon: Building2, roles: ALL_ROLES },
      { label: "Productos", href: "/productos", icon: PackageCheck, roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
      { label: "Técnicos", href: "/tecnicos", icon: HardHat, roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
      { label: "Órdenes de Servicio", href: "/ordenes", icon: ClipboardList, roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO] },
      { label: "Calendario de Técnicos", href: "/calendario-tecnicos", icon: CalendarDays, roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
      { label: "Vendedores", href: "/vendedores", icon: Users, roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
    ],
  },
  {
    label: "Gestión",
    items: [
      { label: "Par", href: "/par", icon: FileText, roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
      { label: "Plantillas", href: "/par/plantillas", icon: LayoutTemplate, roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
      { label: "Reportes", href: "/reportes", icon: BarChart3, roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
      { label: "Usuarios", href: "/usuarios", icon: UserCog, roles: [ROLES.ADMIN] },
      { label: "Configuración", href: "/configuracion", icon: Settings, roles: [ROLES.ADMIN, ROLES.SUPERVISOR] },
      { label: "Equipos", href: "/equipos", icon: Cog, roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO] },
    ],
  },
];

export const ACCOUNT_ITEMS = [
  { label: "Perfil", href: "/perfil", icon: User },
];

/* Etiquetas legibles para breadcrumbs y títulos de página */
export const ROUTE_LABELS = {
  dashboard: "Dashboard",
  clientes: "Clientes",
  equipos: "Equipos",
  ordenes: "Órdenes de Servicio",
  tecnicos: "Técnicos",
  "calendario-tecnicos": "Calendario de Técnicos",
  vendedores: "Vendedores",
  par: "Par",
  productos: "Productos",
  reportes: "Reportes",
  usuarios: "Usuarios",
  configuracion: "Configuración",
  perfil: "Perfil",
};
