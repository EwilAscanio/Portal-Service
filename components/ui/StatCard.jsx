"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "./Card";
import { CountUp } from "./CountUp";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/lib/format";

const TONES = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
};

/**
 * Tarjeta KPI: icono, valor animado, delta porcentual y contexto.
 * `invert: true` → una caída del delta se considera positiva (p. ej. pendientes).
 */
export function StatCard({
  label,
  value,
  format = "number",
  delta = 0,
  invert = false,
  icon: Icon,
  tone = "blue",
  hint,
}) {
  const flat = delta === 0;
  const positive = invert ? delta < 0 : delta > 0;
  const DeltaIcon = flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;

  const formatter =
    format === "currency"
      ? (v) => formatCurrency(Math.round(v))
      : (v) => Math.round(v).toLocaleString("en-US");

  return (
    <Card className="group p-5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-600/5 dark:hover:shadow-black/30">
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
            TONES[tone]
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
            flat
              ? "bg-slate-500/10 text-slate-500 dark:text-slate-400"
              : positive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
          )}
        >
          <DeltaIcon className="h-3.5 w-3.5" />
          {Math.abs(delta)}%
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-foreground">
        <CountUp value={value} format={formatter} />
      </p>
      <p className="mt-1 text-sm font-medium text-muted">
        {label}
        {hint && <span className="text-muted/60"> · {hint}</span>}
      </p>
    </Card>
  );
}
