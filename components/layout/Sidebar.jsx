"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Cog, LogOut, X } from "lucide-react";
import {
  NAV_SECTIONS,
  ACCOUNT_ITEMS,
} from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { notify } from "@/lib/toast";
import { useSidebarStore } from "@/stores/sidebarStore";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ */
/*  Sidebar hooks (compat layer with sidebarStore)                     */
/* ------------------------------------------------------------------ */
export function useSidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggle);
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);
  return { collapsed, toggleCollapsed, mobileOpen, setMobileOpen };
}

export function SidebarProvider({ children }) {
  useEffect(() => {
    useSidebarStore.getState().init();
  }, []);

  return children;
}

/* ------------------------------------------------------------------ */
/*  Ítem de navegación                                                 */
/* ------------------------------------------------------------------ */
function NavItem({ item, collapsed, active, onNavigate, indicatorId }) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors duration-200",
        collapsed ? "justify-center px-0" : "px-3",
        active
          ? "bg-blue-600/10 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
          : "text-muted hover:bg-surface-2 hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId={indicatorId}
          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-600 dark:bg-blue-400"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  return (
    <li>
      {collapsed ? (
        <Tooltip label={item.label} side="right" className="flex">
          {link}
        </Tooltip>
      ) : (
        link
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Contenido compartido (desktop + móvil)                             */
/* ------------------------------------------------------------------ */
function SidebarContent({ collapsed = false, indicatorId, onNavigate }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const userRole = user?.role;

  const visibleHrefs = [
    ...NAV_SECTIONS.flatMap((section) =>
      section.items
        .filter((item) => !item.roles || item.roles.includes(userRole))
        .map((item) => item.href)
    ),
    ...ACCOUNT_ITEMS.map((item) => item.href),
  ];

  const activeHref =
    visibleHrefs
      .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((a, b) => b.length - a.length)[0] ?? null;

  const isActive = (href) => href === activeHref;

  const handleLogout = async () => {
    await logout();
    notify.success("Sesión cerrada", {
      description: "Has salido del panel de forma segura.",
    });
    router.replace("/login");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Marca */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 border-b border-border",
          collapsed ? "justify-center px-2" : "px-5"
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-md shadow-orange-500/25">
          <Cog className="h-5 w-5 text-white" />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-foreground">
              Maquitech
            </p>
            <p className="truncate text-xs text-muted">Panel Administrativo</p>
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(userRole)
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label}>
              {collapsed ? (
                <div className="mx-2 mb-2 h-px bg-border" />
              ) : (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">
                  {section.label}
                </p>
              )}
              <ul className="space-y-1">
                {visibleItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    active={isActive(item.href)}
                    onNavigate={onNavigate}
                    indicatorId={indicatorId}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Cuenta */}
      <div className="shrink-0 space-y-1 border-t border-border p-3">
        <ul className="space-y-1">
          {ACCOUNT_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              collapsed={collapsed}
              active={isActive(item.href)}
              onNavigate={onNavigate}
              indicatorId={indicatorId}
            />
          ))}
        </ul>
        {collapsed ? (
          <Tooltip label="Cerrar Sesión" side="right" className="flex">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-medium text-muted transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Cerrar Sesión
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar: fijo en desktop, drawer animado en móvil                  */
/* ------------------------------------------------------------------ */
export function Sidebar() {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-border bg-surface transition-[width] duration-300 ease-in-out lg:block print:hidden",
          collapsed ? "w-20" : "w-66"
        )}
      >
        <SidebarContent collapsed={collapsed} indicatorId="nav-active-desktop" />
      </aside>

      {/* Móvil / tablet */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[80] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="absolute left-0 top-0 h-full w-72 border-r border-border bg-surface"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
                className="absolute right-3 top-[1.35rem] z-10 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent
                indicatorId="nav-active-mobile"
                onNavigate={() => setMobileOpen(false)}
              />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
