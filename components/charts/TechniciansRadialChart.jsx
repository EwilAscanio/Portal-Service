"use client";

import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { techniciansProductivity } from "@/data/dashboard";
import { CHART_COLORS } from "@/lib/charts";
import { useChartTheme } from "@/hooks/useChartTheme";
import { ChartTooltip } from "./ChartTooltip";

/** Productividad de los técnicos destacados (barras radiales) */
export default function TechniciansRadialChart() {
  const theme = useChartTheme();
  const data = techniciansProductivity.map((tech, index) => ({
    ...tech,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="h-[250px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="22%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              dataKey="value"
              name="Productividad"
              cornerRadius={8}
              background={{ fill: theme.track }}
              angleAxisId={0}
              animationDuration={1200}
            />
            <Tooltip
              content={<ChartTooltip formatter={(value) => `${value}%`} />}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2.5 sm:w-44">
        {data.map((tech) => (
          <li key={tech.name} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: tech.fill }}
            />
            <span className="min-w-0 flex-1 truncate text-muted">{tech.name}</span>
            <span className="font-bold text-foreground">{tech.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
