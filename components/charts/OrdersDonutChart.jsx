"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "./ChartTooltip";

const DEFAULT_DATA = [
  { name: "Completadas", value: 0, color: "#10b981" },
  { name: "En Proceso", value: 0, color: "#3b82f6" },
  { name: "Pendientes", value: 0, color: "#f59e0b" },
  { name: "Canceladas", value: 0, color: "#ef4444" },
];

/** Distribución del estado de las órdenes (donut con total al centro) */
export default function OrdersDonutChart({ data = DEFAULT_DATA }) {
  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <div>
      <div className="relative h-[230px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={66}
              outerRadius={94}
              paddingAngle={4}
              strokeWidth={0}
              animationDuration={1200}
            >
              {data.map((status) => (
                <Cell key={status.name} fill={status.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Total al centro */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight text-foreground">
            {total}
          </span>
          <span className="text-xs font-medium text-muted">Órdenes</span>
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2.5">
        {data.map((status) => (
          <li
            key={status.name}
            className="flex items-center gap-2.5 rounded-xl bg-surface-2/60 px-3 py-2"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: status.color }}
            />
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted">
              {status.name}
            </span>
            <span className="text-xs font-bold text-foreground">{status.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
