/**
 * Role-based access map. Each entry: path prefix -> roles allowed.
 * The proxy (middleware) enforces these on every request; pages must never
 * rely on UI-only protection.
 *
 * Roles: Administrador, Supervisor, Coordinador, Técnico, Usuario
 */

export const ROLES = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  COORDINADOR: "Coordinador",
  TECNICO: "Técnico",
  USUARIO: "Usuario",
};

const ALL = Object.values(ROLES);

/** Page routes (order matters: first matching prefix wins). */
export const PAGE_PERMISSIONS = [
  { prefix: "/usuarios", roles: [ROLES.ADMIN] },
  { prefix: "/configuracion", roles: [ROLES.ADMIN, ROLES.SUPERVISOR] },
  { prefix: "/reportes", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/ordenes", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO] },
  { prefix: "/equipos", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR, ROLES.TECNICO] },
  { prefix: "/tecnicos", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/calendario-tecnicos", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/vendedores", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/par", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/productos", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/clientes", roles: ALL },
  { prefix: "/dashboard", roles: ALL },
  { prefix: "/perfil", roles: ALL },
];

/** API routes (order matters: first matching prefix wins). */
export const API_PERMISSIONS = [
  { prefix: "/api/user", roles: [ROLES.ADMIN] },
  { prefix: "/api/roles", roles: [ROLES.ADMIN] },
  { prefix: "/api/technical", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/api/product", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/api/par", roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDINADOR] },
  { prefix: "/api/ubicacion", roles: [ROLES.ADMIN, ROLES.SUPERVISOR] },
  { prefix: "/api/configuration", roles: [ROLES.ADMIN, ROLES.SUPERVISOR] },
  { prefix: "/api/client", roles: ALL },
];

/** Routes that never require authentication. */
export const PUBLIC_PATHS = ["/login"];

/**
 * Resolve the roles allowed for a pathname against a permission list.
 * Returns null when no rule matches (meaning: any authenticated user).
 */
export function rolesFor(pathname, permissions) {
  const match = permissions.find((entry) => pathname.startsWith(entry.prefix));
  return match ? match.roles : null;
}

export function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
