"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { revenuePerMonth } from "@/data/dashboard";
import { useChartTheme } from "@/hooks/useChartTheme";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend } from "./ChartLegend";
import { formatCompact } from "@/lib/format";

/** Ingresos vs. egresos del año (líneas) */
export default function RevenueLineChart() {
  const theme = useChartTheme();

  return (
    <div>
      <ChartLegend
        className="mb-4"
        items={[
          { label: "Ingresos", color: "#3b82f6" },
          { label: "Egresos", color: "#f97316" },
        ]}
      />
      <div className="h-[290px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={revenuePerMonth}
            margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
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
              tickFormatter={(value) => `$${formatCompact(value)}`}
            />
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(value) => `$${formatCompact(value)}`}
                />
              }
              cursor={{ stroke: theme.grid, strokeWidth: 1.5 }}
            />
            <Line
              type="monotone"
              dataKey="ingresos"
              name="Ingresos"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
              animationDuration={1400}
            />
            <Line
              type="monotone"
              dataKey="egresos"
              name="Egresos"
              stroke="#f97316"
              strokeWidth={2.5}
              strokeDasharray="6 6"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              animationDuration={1400}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
