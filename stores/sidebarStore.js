import { create } from "zustand";

const SIDEBAR_KEY = "mq-sidebar";

export const useSidebarStore = create((set, get) => ({
  collapsed: false,
  mobileOpen: false,

  init: () => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored !== null) set({ collapsed: stored === "true" });
  },

  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
  open: () => set({ collapsed: false }),
  close: () => set({ collapsed: true }),

  setMobileOpen: (open) => set({ mobileOpen: open }),
  toggleMobile: () => set((s) => ({ mobileOpen: !s.mobileOpen })),
  closeMobile: () => set({ mobileOpen: false }),
}));

// Persist collapsed state
useSidebarStore.subscribe((state, prev) => {
  if (state.collapsed !== prev.collapsed) {
    localStorage.setItem(SIDEBAR_KEY, String(state.collapsed));
  }
});
