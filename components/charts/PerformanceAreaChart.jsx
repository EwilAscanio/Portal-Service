"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { performancePerMonth } from "@/data/dashboard";
import { useChartTheme } from "@/hooks/useChartTheme";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend } from "./ChartLegend";

/** Eficiencia operativa y satisfacción del cliente (áreas con gradiente) */
export default function PerformanceAreaChart() {
  const theme = useChartTheme();

  return (
    <div>
      <ChartLegend
        className="mb-4"
        items={[
          { label: "Eficiencia operativa", color: "#3b82f6" },
          { label: "Satisfacción del cliente", color: "#10b981" },
        ]}
      />
      <div className="h-[290px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={performancePerMonth}
            margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
          >
            <defs>
              <linearGradient id="perf-eficiencia" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="perf-satisfaccion" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: theme.text, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              domain={[60, 100]}
              tick={{ fill: theme.text, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              content={<ChartTooltip formatter={(value) => `${value}%`} />}
              cursor={{ stroke: theme.grid, strokeWidth: 1.5 }}
            />
            <Area
              type="monotone"
              dataKey="eficiencia"
              name="Eficiencia"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#perf-eficiencia)"
              animationDuration={1400}
            />
            <Area
              type="monotone"
              dataKey="satisfaccion"
              name="Satisfacción"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#perf-satisfaccion)"
              animationDuration={1400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
