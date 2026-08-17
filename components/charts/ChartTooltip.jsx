/**
 * Tooltip personalizado para Recharts.
 * Usa clases del sistema de diseño → se adapta a ambos temas.
 */
export function ChartTooltip({ active, payload, label, formatter = (v) => v }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-xl shadow-black/5 dark:shadow-black/40">
      {label != null && (
        <p className="mb-1.5 text-xs font-semibold text-foreground">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                background: entry.color ?? entry.payload?.fill ?? entry.fill,
              }}
            />
            <span className="capitalize text-muted">{entry.name}:</span>
            <span className="font-semibold text-foreground">
              {formatter(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
