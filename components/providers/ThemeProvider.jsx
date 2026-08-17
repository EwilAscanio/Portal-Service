"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/stores/themeStore";

/**
 * Gestiona el tema (light / dark / system):
 * - Delega estado a useThemeStore (Zustand).
 * - Sincroniza la clase `dark` en <html>.
 */
export function ThemeProvider({ children }) {
  const init = useThemeStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return children;
}

export function useThemeContext() {
  const { theme, setTheme, toggleTheme } = useThemeStore();
  const isDark = useThemeStore((s) => s.isDark);
  const resolvedTheme = isDark ? "dark" : "light";
  return { theme, resolvedTheme, setTheme, toggleTheme };
}
