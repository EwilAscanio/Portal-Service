"use client";

import { ChevronsLeft, ChevronsRight, Menu } from "lucide-react";
import { useSidebar } from "./Sidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { GlobalSearch } from "./GlobalSearch";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";

const iconButton =
  "inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground";

/** Barra superior fija: navegación, búsqueda, tema, notificaciones y cuenta */
export function Topbar() {
  const { collapsed, toggleCollapsed, setMobileOpen } = useSidebar();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl print:hidden">
      <div className="flex h-16 items-center gap-1.5 px-4 sm:gap-2 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú lateral"
          className={`${iconButton} lg:hidden`}
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
          className={`${iconButton} hidden lg:inline-flex`}
        >
          {collapsed ? (
            <ChevronsRight className="h-5 w-5" />
          ) : (
            <ChevronsLeft className="h-5 w-5" />
          )}
        </button>

        <Breadcrumbs className="hidden md:flex" />

        <div className="flex-1" />

        <GlobalSearch className="hidden w-80 lg:block xl:w-96" />
        <ThemeToggle />
        <NotificationsMenu />
        <span className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />
        <UserMenu />
      </div>

      {/* Búsqueda visible en móvil/tablet */}
      <div className="border-t border-border px-4 py-2.5 lg:hidden">
        <GlobalSearch className="w-full" />
      </div>
    </header>
  );
}
