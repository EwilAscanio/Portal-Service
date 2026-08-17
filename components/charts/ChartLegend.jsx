/** Leyenda personalizada para gráficos: [{ label, color }] */
export function ChartLegend({ items, className }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${className ?? ""}`}>
      {items.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-2 text-xs font-medium text-muted"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
