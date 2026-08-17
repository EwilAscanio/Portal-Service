"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Cog,
  HardHat,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useClickOutside } from "@/hooks/useClickOutside";
import { getClients } from "@/lib/api";
import { cn } from "@/utils/cn";

/* Fuentes estáticas */
const STATIC_SOURCES = [
  {
    key: "orders",
    label: "Órdenes",
    icon: ClipboardList,
    href: "/ordenes",
    data: [],
    filter: (item, q) =>
      item.id.toLowerCase().includes(q) || item.client.toLowerCase().includes(q),
    title: (item) => `${item.id} · ${item.client}`,
    subtitle: (item) => item.type,
  },
  {
    key: "technicians",
    label: "Técnicos",
    icon: HardHat,
    href: "/tecnicos",
    data: [],
    filter: (item, q) =>
      item.name.toLowerCase().includes(q) ||
      (item.code && item.code.toLowerCase().includes(q)),
    title: (item) => item.name,
    subtitle: (item) => item.code || "",
  },
  {
    key: "equipment",
    label: "Equipos",
    icon: Cog,
    href: "/equipos",
    data: [],
    filter: (item, q) =>
      item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q),
    title: (item) => item.name,
    subtitle: (item) => `${item.brand} · ${item.client}`,
  },
];

const CLIENT_SOURCE = {
  key: "clients",
  label: "Clientes",
  icon: Building2,
  href: "/clientes",
  data: [],
  filter: (item, q) =>
    (item.codclie && item.codclie.toLowerCase().includes(q)) ||
    (item.description && item.description.toLowerCase().includes(q)) ||
    (item.rif && item.rif.toLowerCase().includes(q)),
  title: (item) => `${item.codclie} · ${item.description || ""}`,
  subtitle: (item) => item.rif || "",
};

/** Buscador global del topbar con resultados agrupados (Ctrl/⌘ + K) */
export function GlobalSearch({ className }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const debounced = useDebounce(query, 180);
  const inputRef = useRef(null);
  const containerRef = useClickOutside(() => setOpen(false));

  useEffect(() => {
    getClients()
      .then((data) => setClients(data))
      .catch(() => {});
  }, []);

  // Atajo de teclado Ctrl/⌘ + K
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const groups = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (q.length < 2) return [];
    const clientSource = { ...CLIENT_SOURCE, data: clients };
    const allSources = [...STATIC_SOURCES, clientSource];
    return allSources
      .map((source) => ({
        ...source,
        results: source.data.filter((item) => source.filter(item, q)).slice(0, 3),
      }))
      .filter((group) => group.results.length > 0);
  }, [debounced, clients]);

  const showPanel = open && debounced.trim().length >= 2;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
        placeholder="Buscar clientes, órdenes, equipos, tecnicos…"
        aria-label="Búsqueda global"
        className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-16 text-sm text-foreground placeholder:text-muted/60 placeholder:text-xs transition-colors duration-200 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-blue-500/15 dark:hover:border-slate-600 [&::-webkit-search-cancel-button]:hidden"
      />
      {query ? (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted md:flex">
          Ctrl + K
        </kbd>
      )}

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-black/5 dark:shadow-black/40"
          >
            {groups.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted">
                  <SearchX className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold text-foreground">
                  Sin resultados para “{debounced.trim()}”
                </p>
                <p className="text-xs text-muted">
                  Intenta con otro término de búsqueda.
                </p>
              </div>
            ) : (
              <ul className="max-h-[22rem] overflow-y-auto p-1.5">
                {groups.map((group) => {
                  const Icon = group.icon;
                  return (
                    <li key={group.key} className="mb-1 last:mb-0">
                      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                        {group.label}
                      </p>
                      <ul className="space-y-0.5">
                        {group.results.map((item, index) => (
                          <li key={`${group.key}-${index}`}>
                            <Link
                              href={group.href}
                              onClick={() => {
                                setOpen(false);
                                setQuery("");
                              }}
                              className="group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-surface-2"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  {group.title(item)}
                                </span>
                                <span className="block truncate text-xs text-muted">
                                  {group.subtitle(item)}
                                </span>
                              </span>
                              <ArrowRight className="h-4 w-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
