"use client";

import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code,
  Cog,
  Eye,
  Inbox,
  Trash2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Stagger, FadeInUp } from "@/components/ui/animated";
import { PAR_STATUS_VARIANTS } from "@/lib/status";
import { formatCurrency, formatVes, formatDate } from "@/lib/format";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 12;

const pageButton =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-surface px-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-3.5 w-3/4" />
      <div className="mt-3 space-y-1.5 border-y border-border py-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="mt-3 space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
      </div>
      <Skeleton className="mt-3 h-8 w-full" />
    </div>
  );
}

function effectiveStatus(row) {
  return row.display_status ?? row.status;
}

export function ParCardGrid({ pars, loading, onView, onNavigate, onApprove, onDelete, onReject }) {
  const [page, setPage] = useState(1);

  const [prevPars, setPrevPars] = useState(pars);
  if (pars !== prevPars) {
    setPage(1);
    setPrevPars(pars);
  }

  const totalPages = Math.max(1, Math.ceil(pars.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = pars.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const pageNumbers = [];
  let start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  for (let i = start; i <= end; i += 1) pageNumbers.push(i);

  const from = pars.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, pars.length);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (pars.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No se encontraron PARs"
        description="Crea una nueva planilla para comenzar."
      />
    );
  }

  const handleKeyDown = (event, par) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onView(par);
    }
  };

  return (
    <div>
      <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pageData.map((par) => (
          <FadeInUp key={par.id} className="h-full">
            <Card
              className="flex h-full cursor-pointer flex-col transition-colors hover:border-blue-500/40"
              onClick={() => onView(par)}
              onKeyDown={(event) => handleKeyDown(event, par)}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-label={`Ver PAR ${par.par_number}`}
            >
              <CardContent className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-7 items-center rounded-lg bg-blue-500/10 px-2 font-mono text-[11px] font-bold text-blue-600 ring-1 ring-inset ring-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400">
                    {par.par_number}
                  </span>
                  <StatusBadge
                    status={effectiveStatus(par)}
                    variants={PAR_STATUS_VARIANTS}
                  />
                </div>
                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  {par.client_name || "—"}
                </p>

                <div className="space-y-1.5 border-y border-border py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">Fecha</span>
                    <span className="truncate font-medium text-foreground">
                      {formatDate(par.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Code className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">Código</span>
                    <span className="truncate font-medium text-foreground">
                      {par.client_code || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cog className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">Equipo</span>
                    <span className="truncate font-medium text-foreground">
                      {par.main_equipment || "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-auto space-y-1 pt-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-muted">Total $</span>
                    <span className="text-sm font-bold tracking-tight text-blue-600 dark:text-blue-400">
                      {formatCurrency(par.total_usd)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-muted">Total Bs</span>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {formatVes(par.total_bs)}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onNavigate(par);
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver PAR
                </button>
                {effectiveStatus(par) === "Creado" && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onApprove(par);
                    }}
                    aria-label={`Aprobar ${par.par_number}`}
                    title="Aprobar"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
                {effectiveStatus(par) === "Creado" && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(par);
                    }}
                    aria-label={`Eliminar ${par.par_number}`}
                    title="Eliminar"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                {["Creado", "Aprobado"].includes(effectiveStatus(par)) && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onReject(par);
                    }}
                    aria-label={`Rechazar ${par.par_number}`}
                    title="Rechazar"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </CardFooter>
            </Card>
          </FadeInUp>
        ))}
      </Stagger>

      <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-border px-2 pt-4 sm:flex-row">
        <p className="text-xs text-muted">
          Mostrando{" "}
          <span className="font-semibold text-foreground">
            {from}–{to}
          </span>{" "}
          de{" "}
          <span className="font-semibold text-foreground">
            {pars.length}
          </span>{" "}
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
    </div>
  );
}
