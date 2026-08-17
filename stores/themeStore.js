import { create } from "zustand";

const THEME_KEY = "mq-theme";

function resolveTheme(theme) {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTheme() {
  return "system";
}

export const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),
  isDark: false,

  init: () => {
    if (typeof window === "undefined") return;
    const theme = localStorage.getItem(THEME_KEY) || "system";
    const resolved = resolveTheme(theme);
    document.documentElement.classList.toggle("dark", resolved === "dark");
    set({ theme, isDark: resolved === "dark" });

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => {
        const r = resolveTheme("system");
        document.documentElement.classList.toggle("dark", r === "dark");
        set({ isDark: r === "dark" });
      };
      media.addEventListener("change", onChange);
    }
  },

  setTheme: (next) => {
    localStorage.setItem(THEME_KEY, next);
    const resolved = resolveTheme(next);
    document.documentElement.classList.toggle("dark", resolved === "dark");
    set({ theme: next, isDark: resolved === "dark" });
  },

  toggleTheme: () => {
    const { isDark } = get();
    get().setTheme(isDark ? "light" : "dark");
  },
}));
