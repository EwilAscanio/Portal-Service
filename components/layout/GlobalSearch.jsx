"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Building2, ClipboardList, Cog, Factory, HardHat, Search, SearchX, UserRound, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useClickOutside } from "@/hooks/useClickOutside";
import { getGlobalSearch } from "@/lib/api";
import { cn } from "@/utils/cn";

const EMPTY_RESULTS = { clients: [], plants: [], contacts: [], orders: [], equipment: [], technicians: [] };
const SOURCES = [
  { key: "orders", label: "Órdenes", icon: ClipboardList, href: "/ordenes", title: (item) => item.order_code, subtitle: (item) => `${item.client_name} · ${item.type}` },
  { key: "clients", label: "Clientes", icon: Building2, href: "/clientes", title: (item) => `${item.codclie} · ${item.description || ""}`, subtitle: (item) => item.rif || "" },
  { key: "plants", label: "Plantas", icon: Factory, href: "/plantas", title: (item) => item.name, subtitle: (item) => item.client_name },
  { key: "contacts", label: "Contactos", icon: UserRound, href: "/contactos", title: (item) => item.name, subtitle: (item) => `${item.client_name} · ${item.plant_name}` },
  { key: "equipment", label: "Equipos", icon: Cog, href: "/equipos", title: (item) => item.name, subtitle: (item) => `${item.brand} · ${item.client_name} · ${item.plant_name}` },
  { key: "technicians", label: "Técnicos", icon: HardHat, href: "/tecnicos", title: (item) => item.name, subtitle: (item) => item.cedula || "" },
];

export function GlobalSearch({ className }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState({ query: "", results: EMPTY_RESULTS });
  const debounced = useDebounce(query, 220);
  const inputRef = useRef(null);
  const containerRef = useClickOutside(() => setOpen(false));

  useEffect(() => {
    const search = debounced.trim();
    if (search.length < 2) return;
    let active = true;
    getGlobalSearch(search)
      .then((data) => active && setResponse({ query: search, results: data }))
      .catch(() => active && setResponse({ query: search, results: EMPTY_RESULTS }));
    return () => { active = false; };
  }, [debounced]);

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

  const normalizedQuery = debounced.trim();
  const currentResults = response.query === normalizedQuery ? response.results : EMPTY_RESULTS;
  const loading = normalizedQuery.length >= 2 && response.query !== normalizedQuery;
  const groups = useMemo(
    () => SOURCES.map((source) => ({ ...source, results: currentResults[source.key] || [] })).filter((group) => group.results.length),
    [currentResults]
  );
  const showPanel = open && debounced.trim().length >= 2;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input ref={inputRef} type="search" value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(event) => event.key === "Escape" && setOpen(false)} placeholder="Buscar clientes, plantas, contactos, órdenes…" aria-label="Búsqueda global" className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-16 text-sm text-foreground placeholder:text-muted/60 placeholder:text-xs transition-colors duration-200 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-blue-500/15 dark:hover:border-slate-600 [&::-webkit-search-cancel-button]:hidden" />
      {query ? <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"><X className="h-3.5 w-3.5" /></button> : <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted md:flex">Ctrl + K</kbd>}
      <AnimatePresence>
        {showPanel && <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }} transition={{ duration: 0.16, ease: "easeOut" }} className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-black/5 dark:shadow-black/40">
          {!loading && groups.length === 0 ? <div className="flex flex-col items-center gap-2 px-6 py-8 text-center"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted"><SearchX className="h-5 w-5" /></span><p className="text-sm font-semibold text-foreground">Sin resultados para “{debounced.trim()}”</p></div> : loading ? <p className="px-6 py-8 text-center text-sm text-muted">Buscando…</p> : <ul className="max-h-[22rem] overflow-y-auto p-1.5">
            {groups.map((group) => { const Icon = group.icon; return <li key={group.key} className="mb-1 last:mb-0"><p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{group.label}</p><ul className="space-y-0.5">{group.results.map((item) => <li key={`${group.key}-${item.id}`}><Link href={group.href} onClick={() => { setOpen(false); setQuery(""); }} className="group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-surface-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{group.title(item)}</span><span className="block truncate text-xs text-muted">{group.subtitle(item)}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" /></Link></li>)}</ul></li>; })}
          </ul>}
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}
