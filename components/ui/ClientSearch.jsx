"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, ChevronDown, Pencil, Search, SearchX, X } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn } from "@/utils/cn";

function matchClient(client, q) {
  const value = q.trim().toLowerCase();
  return (
    (client.codclie && client.codclie.toLowerCase().includes(value)) ||
    (client.description && client.description.toLowerCase().includes(value)) ||
    (client.rif && client.rif.toLowerCase().includes(value))
  );
}

/**
 * Selector de cliente con búsqueda: escribe para filtrar (mín. 2 caracteres),
 * selecciona un resultado y muestra el cliente elegido con opción "Cambiar".
 * `value` es el clientId; `onChange` recibe el id seleccionado (o "" al cambiar).
 */
export function ClientSearch({
  clients = [],
  value = "",
  onChange,
  label = "Cliente *",
  placeholder = "Buscar por nombre, código o RIF...",
  disabled = false,
  autoFocus = false,
  error,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const containerRef = useClickOutside(() => setOpen(false), [dropdownRef]);

  const selected = useMemo(
    () => clients.find((client) => client.id === value) ?? null,
    [clients, value]
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    return clients.filter((client) => matchClient(client, q)).slice(0, 8);
  }, [clients, query]);

  const showResults = open && query.trim().length >= 2 && !disabled;

  useEffect(() => {
    if (!showResults) return undefined;
    const update = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDropdownStyle({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [showResults, containerRef]);

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- foco solo al montar
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset al cerrar el dropdown
    if (!open) setHighlighted(-1);
  }, [open]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset al escribir
    setHighlighted(-1);
  }, [query]);

  function handleSelect(client) {
    onChange(client.id);
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlighted((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && highlighted >= 0 && results[highlighted]) {
      event.preventDefault();
      handleSelect(results[highlighted]);
    }
  }

  if (selected) {
    return (
      <div className="w-full">
        {label && <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>}
        <div
          className={cn(
            "flex h-11 items-center justify-between gap-2 rounded-xl border border-border bg-surface px-2.5",
            disabled && "cursor-not-allowed opacity-70"
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Building2 className="h-4 w-4" />
            </span>
            <p className="truncate text-sm font-semibold text-foreground">
              {selected.description || "—"}
            </p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setQuery("");
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              aria-label="Cambiar"
              title="Cambiar"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {label && <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(event) => {
            if (disabled) return;
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-9 text-sm text-foreground placeholder:text-muted/60 transition-colors duration-200 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-blue-500/15 dark:hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-70"
        />
        {!disabled && query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpiar búsqueda"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        )}
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showResults && dropdownStyle && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                style={{
                  position: "fixed",
                  top: dropdownStyle.top,
                  left: dropdownStyle.left,
                  width: dropdownStyle.width,
                  zIndex: 90,
                }}
                className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-black/5 dark:shadow-black/40"
              >
                {results.length === 0 ? (
                  <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted">
                    <SearchX className="h-4 w-4 shrink-0" />
                    Sin resultados para “{query.trim()}”
                  </div>
                ) : (
                  <ul className="max-h-72 overflow-y-auto p-1.5">
                    {results.map((client, index) => {
                      const active = index === highlighted;
                      return (
                        <li key={client.id}>
                          <button
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleSelect(client);
                            }}
                            onMouseEnter={() => setHighlighted(index)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                              active ? "bg-surface-2" : "hover:bg-surface-2"
                            )}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              <Building2 className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {client.description || "—"}
                              </span>
                              <span className="block truncate text-xs text-muted">
                                {client.codclie}
                              </span>
                            </span>
                            {active && (
                              <Check className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
      {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}
