import { Badge } from "./Badge";

/**
 * Badge semántico: recibe el mapa de variantes de `lib/status.js`
 * y resuelve automáticamente el color según el estado.
 */
export function StatusBadge({ status, variants, dot = true }) {
  const variant = variants?.[status] ?? "neutral";
  return (
    <Badge variant={variant} dot={dot}>
      {status}
    </Badge>
  );
}
