"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Inbox,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";

/** Comparación genérica: números, fechas ISO y texto (orden natural) */
function compareValues(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""), "es", {
    numeric: true,
    sensitivity: "base",
  });
}

const pageButton =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-surface px-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

/**
 * Tabla de datos del sistema de diseño.
 *
 * columns: [{ key, header, sortable?, className?, accessor?(row), render?(row) }]
 * Incluye: búsqueda (debounce), ordenamiento, paginación,
 * filas animadas, estado de carga y estado vacío.
 */
export function DataTable({
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Buscar...",
  searchKeys,
  pageSize = 8,
  paginate = true,
  loading = false,
  toolbar,
  emptyTitle = "Sin resultados",
  emptyDescription = "No se encontraron registros con los criterios actuales.",
  initialSort,
  onRowClick,
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(1);

  // Reiniciar paginación cuando cambian los datos o la búsqueda (render-time adjustment)
  const [prevQuery, setPrevQuery] = useState(debouncedQuery);
  const [prevData, setPrevData] = useState(data);
  if (debouncedQuery !== prevQuery || data !== prevData) {
    setPage(1);
    setPrevQuery(debouncedQuery);
    setPrevData(data);
  }

  const getValue = (row, column) =>
    column.accessor ? column.accessor(row) : row[column.key];

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return data;
    const keys =
      searchKeys ?? columns.filter((c) => c.key !== "actions").map((c) => c.key);
    return data.filter((row) =>
      keys.some((key) => {
        const column = columns.find((c) => c.key === key);
        const value = column?.accessor ? column.accessor(row) : row[key];
        return String(value ?? "").toLowerCase().includes(q);
      })
    );
  }, [data, debouncedQuery, columns, searchKeys]);

  const sorted = useMemo(() => {
    if (!sort?.key) return filtered;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return filtered;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort(
      (a, b) => direction * compareValues(getValue(a, column), getValue(b, column))
    );
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageData = paginate
    ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sorted;

  const toggleSort = (key) =>
    setSort((current) => {
      if (current?.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      return null;
    });

  const pageNumbers = useMemo(() => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  const from = sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, sorted.length);

  return (
    <div>
      {(searchable || toolbar) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {searchable ? (
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={searchPlaceholder}
              className="sm:max-w-xs"
            />
          ) : (
            <span />
          )}
          {toolbar && <div className="flex items-center gap-3">{toolbar}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted",
                    column.className
                  )}
                >
                  {column.sortable === false ? (
                    column.header
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="group inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-foreground"
                    >
                      {column.header}
                      {sort?.key === column.key ? (
                        sort.direction === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 6) }).map((_, index) => (
                <tr key={index} className="border-b border-border/60">
                  <td colSpan={columns.length} className="px-4 py-3">
                    <Skeleton className="h-8 w-full" />
                  </td>
                </tr>
              ))
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    icon={Inbox}
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              pageData.map((row, index) => (
                <motion.tr
                  key={row.id ?? index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
                  className={cn(
                    "group border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2/50",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-3.5 align-middle text-foreground/90",
                        column.className
                      )}
                    >
                      {column.render
                        ? column.render(row)
                        : String(row[column.key] ?? "—")}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paginate && !loading && sorted.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-2 pt-4 sm:flex-row">
          <p className="text-xs text-muted">
            Mostrando{" "}
            <span className="font-semibold text-foreground">
              {from}–{to}
            </span>{" "}
            de <span className="font-semibold text-foreground">{sorted.length}</span>{" "}
            registros
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Página anterior"
              className={pageButton}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageNumbers.map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                aria-current={number === currentPage ? "page" : undefined}
                className={cn(
                  pageButton,
                  number === currentPage &&
                    "border-blue-600 bg-blue-600 text-black dark:text-white"
                )}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Página siguiente"
              className={pageButton}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
