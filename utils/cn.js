/**
 * Une nombres de clase condicionalmente.
 * Soporta strings, falsy (false, null, undefined) — los falsy se omiten.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
