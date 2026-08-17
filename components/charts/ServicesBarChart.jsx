"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { servicesPerMonth } from "@/data/dashboard";
import { useChartTheme } from "@/hooks/useChartTheme";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend } from "./ChartLegend";

/** Servicios completados vs. pendientes por mes (barras agrupadas) */
export default function ServicesBarChart() {
  const theme = useChartTheme();

  return (
    <div>
      <ChartLegend
        className="mb-4"
        items={[
          { label: "Completados", color: "#3b82f6" },
          { label: "Pendientes", color: "#f97316" },
        ]}
      />
      <div className="h-[290px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={servicesPerMonth}
            margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
            barGap={3}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: theme.text, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fill: theme.text, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: theme.cursor }} />
            <Bar
              dataKey="completados"
              name="Completados"
              fill="#3b82f6"
              radius={[5, 5, 0, 0]}
              maxBarSize={20}
              animationDuration={1200}
            />
            <Bar
              dataKey="pendientes"
              name="Pendientes"
              fill="#f97316"
              radius={[5, 5, 0, 0]}
              maxBarSize={20}
              animationDuration={1200}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
