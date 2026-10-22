"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, ChevronDown, ClipboardList, Pencil, Search, SearchX, X } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn } from "@/utils/cn";

function matches(par, query) {
  const value = query.trim().toLocaleLowerCase("es");
  return [par.par_number, par.client_name, par.client_code, par.plant_name, par.contact_name]
    .some((field) => String(field || "").toLocaleLowerCase("es").includes(value));
}

export function ParSearch({ pars = [], value = "", selectedFallback, onChange, disabled = false, loading = false, error }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const containerRef = useClickOutside(() => setOpen(false), [dropdownRef]);

  const selected = useMemo(
    () => pars.find((par) => String(par.id) === String(value)) || (String(selectedFallback?.par_id ?? selectedFallback?.id) === String(value) ? selectedFallback : null),
    [pars, value, selectedFallback]
  );
  const results = useMemo(() => query.trim().length < 2 ? [] : pars.filter((par) => matches(par, query)).slice(0, 8), [pars, query]);
  const showResults = open && query.trim().length >= 2 && !disabled;

  useEffect(() => {
    if (!showResults) return undefined;
    const update = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;
      setDropdownStyle({ top: openUp ? undefined : rect.bottom + gap, bottom: openUp ? window.innerHeight - rect.top + gap : undefined, left: rect.left, width: rect.width, maxHeight: Math.max(160, Math.min(Math.max(spaceBelow, spaceAbove) - 4, 320)) });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [showResults, containerRef]);

  const select = (par) => { onChange(String(par.id)); setQuery(""); setOpen(false); };
  const handleKeyDown = (event) => {
    if (event.key === "Escape") { setOpen(false); return; }
    if (!results.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setHighlighted((index) => (index + 1) % results.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setHighlighted((index) => (index - 1 + results.length) % results.length); }
    if (event.key === "Enter" && highlighted >= 0) { event.preventDefault(); select(results[highlighted]); }
  };

  return <div ref={containerRef} className="relative w-full">
    <span className="mb-1.5 block text-sm font-medium text-foreground">PAR aprobado *</span>
    {selected ? <div className={cn("flex min-h-16 items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2", disabled && "opacity-80")}>
      <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600"><ClipboardList className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">PAR {selected.par_number}</p><p className="truncate text-xs text-muted">{selected.client_name || "—"} · {selected.plant_name || "—"}</p><p className="truncate text-xs text-muted">Contacto: {selected.contact_name || "—"}</p></div></div>
      {!disabled && <button type="button" onClick={() => { onChange(""); setTimeout(() => inputRef.current?.focus(), 0); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-foreground"><Pencil className="h-3.5 w-3.5" />Cambiar</button>}
    </div> : <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input ref={inputRef} type="text" value={query} disabled={disabled || loading} onChange={(event) => { setQuery(event.target.value); setOpen(true); setHighlighted(-1); }} onFocus={() => setOpen(true)} onKeyDown={handleKeyDown} placeholder={loading ? "Cargando PAR aprobados…" : "Buscar por PAR, cliente, planta o contacto…"} className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-9 text-sm text-foreground placeholder:text-muted/60 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-70" />{query ? <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-surface-2"><X className="h-3.5 w-3.5" /></button> : <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />}</div>}
    {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
    {typeof document !== "undefined" && createPortal(<AnimatePresence>{showResults && dropdownStyle && <motion.div ref={dropdownRef} initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} style={{ position: "fixed", top: dropdownStyle.top, bottom: dropdownStyle.bottom, left: dropdownStyle.left, width: dropdownStyle.width, zIndex: 90 }} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
      {results.length ? <ul className="overflow-y-auto p-1.5" style={{ maxHeight: dropdownStyle.maxHeight }}>{results.map((par, index) => <li key={par.id}><button type="button" onMouseDown={(event) => { event.preventDefault(); select(par); }} onMouseEnter={() => setHighlighted(index)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left", highlighted === index ? "bg-surface-2" : "hover:bg-surface-2")}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600"><Building2 className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">PAR {par.par_number}</span><span className="block truncate text-xs text-muted">{par.client_name} · {par.plant_name}</span><span className="block truncate text-xs text-muted">{par.contact_name || "Sin contacto"}{par.client_code ? ` · ${par.client_code}` : ""}</span></span>{highlighted === index && <Check className="h-4 w-4 text-blue-600" />}</button></li>)}</ul> : <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted"><SearchX className="h-4 w-4" />Sin resultados para “{query.trim()}”</div>}
    </motion.div>}</AnimatePresence>, document.body)}
  </div>;
}
