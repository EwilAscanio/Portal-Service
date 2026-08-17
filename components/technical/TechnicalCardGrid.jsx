"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Mail,
  Pencil,
  Phone,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { Stagger, FadeInUp } from "@/components/ui/animated";
import { formatDate } from "@/lib/format";
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
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  );
}

/**
 * Vista de tarjetas para técnicos.
 * Recibe la lista ya filtrada y pagina 12 por página.
 */
export function TechnicalCardGrid({
  technicians,
  loading,
  onView,
  onEdit,
  onToggleStatus,
}) {
  const [page, setPage] = useState(1);

  const [prevTechnicians, setPrevTechnicians] = useState(technicians);
  if (technicians !== prevTechnicians) {
    setPage(1);
    setPrevTechnicians(technicians);
  }

  const totalPages = Math.max(1, Math.ceil(technicians.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = technicians.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const pageNumbers = [];
  let start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  for (let i = start; i <= end; i += 1) pageNumbers.push(i);

  const from = technicians.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, technicians.length);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (technicians.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No se encontraron técnicos"
        description="Registra el primer técnico para comenzar."
      />
    );
  }

  const handleKeyDown = (event, technician) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onView(technician);
    }
  };

  return (
    <div>
      <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pageData.map((technician) => (
          <FadeInUp key={technician.id} className="h-full">
            <Card
              className="flex h-full cursor-pointer flex-col transition-colors hover:border-blue-500/40"
              onClick={() => onView(technician)}
              onKeyDown={(event) => handleKeyDown(event, technician)}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-label={`Ver información de ${technician.name}`}
            >
              <CardContent className="flex flex-1 flex-col gap-2 p-4">
                {/* Header: cédula + estado */}
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-7 items-center rounded-lg bg-blue-500/10 px-2 font-mono text-[11px] font-bold text-blue-600 ring-1 ring-inset ring-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400">
                    {technician.cedula}
                  </span>
                  <Badge
                    variant={
                      technician.status === "Activo" ? "success" : "danger"
                    }
                    dot
                  >
                    {technician.status}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  {technician.name}
                </p>

                {/* Detalles */}
                <div className="space-y-1.5 border-y border-border py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">Teléfono</span>
                    <span className="truncate font-medium text-foreground">
                      {technician.phone || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">Email</span>
                    <span className="truncate font-medium text-foreground">
                      {technician.email || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">Registro</span>
                    <span className="truncate font-medium text-foreground">
                      {technician.created_at
                        ? formatDate(technician.created_at)
                        : "—"}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(technician);
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <Tooltip
                  label={
                    technician.status === "Activo" ? "Desactivar" : "Activar"
                  }
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleStatus(technician);
                    }}
                    aria-label={
                      technician.status === "Activo"
                        ? `Desactivar ${technician.name}`
                        : `Activar ${technician.name}`
                    }
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-colors hover:bg-surface-2",
                      technician.status === "Activo"
                        ? "hover:text-red-600 dark:hover:text-red-400"
                        : "hover:text-emerald-600 dark:hover:text-emerald-400"
                    )}
                  >
                    {technician.status === "Activo" ? (
                      <ToggleLeft className="h-4 w-4" />
                    ) : (
                      <ToggleRight className="h-4 w-4" />
                    )}
                  </button>
                </Tooltip>
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
            {technicians.length}
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
