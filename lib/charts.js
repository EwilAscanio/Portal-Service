/**
 * Paleta y tokens para Recharts según el tema activo.
 * Recharts necesita valores hex reales (SVG), por eso se resuelven aquí
 * en lugar de usar variables CSS.
 */
export const CHART_COLORS = [
  "#3b82f6", // azul (primario)
  "#f97316", // naranja (corporativo Maquitech)
  "#10b981", // esmeralda
  "#8b5cf6", // violeta
  "#f59e0b", // ámbar
  "#06b6d4", // cian
  "#ef4444", // rojo
];

export function getChartTheme(resolvedTheme) {
  const dark = resolvedTheme === "dark";
  return {
    colors: CHART_COLORS,
    grid: dark ? "#1e2a44" : "#e2e7ef",
    text: dark ? "#8d99b0" : "#5d6b82",
    cursor: dark ? "rgba(148, 163, 184, 0.08)" : "rgba(15, 23, 42, 0.05)",
    track: dark ? "#18223a" : "#edf0f5",
  };
}
