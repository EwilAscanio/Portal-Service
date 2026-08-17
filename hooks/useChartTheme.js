"use client";

import { useMemo } from "react";
import { getChartTheme } from "@/lib/charts";
import { useTheme } from "./useTheme";

/** Tokens de color para Recharts resueltos según el tema activo */
export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  return useMemo(() => getChartTheme(resolvedTheme), [resolvedTheme]);
}
