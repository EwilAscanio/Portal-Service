/**
 * Role-based access map. Each entry: path prefix -> roles allowed.
 * The proxy (middleware) enforces these on every request; pages must never
 * rely on UI-only protection.
 *
 * Roles: Administrador, Supervisor, Coordinador, Técnico, Usuario
 */

export const ROLES = {
  SUPER_ADMIN: "Superadministrador",
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  COORDINADOR: "Coordinador",
  TECNICO: "Técnico",
  USUARIO: "Usuario",
};

const ALL = Object.values(ROLES);

/** Page routes (order matters: first matching prefix wins). */
export const PAGE_PERMISSIONS = [
  { prefix: "/importaciones", roles: [ROLES.SUPER_ADMIN] },
  { prefix: "/usuarios", roles: [ROLES.ADMIN] },
  { prefix: "/configuracion", roles: [ROLES.SUPERVISOR] },
  { prefix: "/reportes", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/ordenes", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO] },
  { prefix: "/plantas", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/contactos", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/equipos", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO] },
  { prefix: "/tecnicos", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/calendario-tecnicos", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO] },
  { prefix: "/vendedores", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/par", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/productos", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/clientes", roles: ALL },
  { prefix: "/dashboard", roles: ALL },
  { prefix: "/perfil", roles: ALL },
];

/** API routes (order matters: first matching prefix wins). */
export const API_PERMISSIONS = [
  { prefix: "/api/reports", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/api/import", roles: [ROLES.SUPER_ADMIN] },
  { prefix: "/api/client/sync", roles: [ROLES.ADMIN, ROLES.SUPERVISOR] },
  { prefix: "/api/user", roles: [ROLES.ADMIN] },
  { prefix: "/api/roles", roles: [ROLES.ADMIN] },
  { prefix: "/api/dashboard", roles: ALL },
  { prefix: "/api/search", roles: ALL },
  { prefix: "/api/technician-calendar", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO] },
  { prefix: "/api/notification", roles: ALL },
  { prefix: "/api/service-order", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO] },
  { prefix: "/api/plant", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/api/contact", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/api/equipment", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO] },
  { prefix: "/api/technical", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/api/product", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/api/par-template", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/api/par", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/api/ubicacion", roles: [ROLES.ADMIN, ROLES.SUPERVISOR] },
  { prefix: "/api/configuration/exchange-rate", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/api/configuration", roles: [ROLES.SUPERVISOR] },
  { prefix: "/api/client", roles: ALL },
];

/** Routes that never require authentication. */
export const PUBLIC_PATHS = ["/login"];

/**
 * Resolve the roles allowed for a pathname against a permission list.
 * Returns an empty array when no rule matches, so unknown routes are denied.
 */
export function rolesFor(pathname, permissions) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const match = permissions.find((entry) => {
    const prefix = entry.prefix.replace(/\/$/, "");
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
  });
  return match ? match.roles : [];
}

export function isSuperAdmin(role) {
  return role === ROLES.SUPER_ADMIN;
}

export function canAccessRole(role, allowedRoles) {
  return allowedRoles.length > 0 && (isSuperAdmin(role) || allowedRoles.includes(role));
}

export function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
