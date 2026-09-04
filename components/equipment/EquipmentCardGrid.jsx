"use client";

import { useState } from "react";
import {
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Cog,
  Factory,
  Hash,
  Inbox,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReadonlyField } from "@/components/ui/ReadonlyField";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Stagger, FadeInUp } from "@/components/ui/animated";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/format";
import { cn } from "@/utils/cn";
import { EQUIPMENT_STATUS_VARIANTS } from "@/lib/status";

const PAGE_SIZE = 12;

const pageButton =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-surface px-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-3.5 w-3/4" />
      <div className="mt-3 space-y-1.5 border-y border-border py-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/**
 * Vista de tarjetas para el inventario de equipos.
 * Recibe la lista ya filtrada por búsqueda/estado y pagina 12 por página.
 */
export function EquipmentCardGrid({
  equipment,
  loading,
  onEdit,
  onDelete,
}) {
  const [page, setPage] = useState(1);
  const [viewEquipment, setViewEquipment] = useState(null);

  const handleCardKeyDown = (event, row) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setViewEquipment(row);
    }
  };

  const [prevEquipment, setPrevEquipment] = useState(equipment);
  if (equipment !== prevEquipment) {
    setPage(1);
    setPrevEquipment(equipment);
  }

  const totalPages = Math.max(1, Math.ceil(equipment.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = equipment.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const pageNumbers = [];
  let start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  for (let i = start; i <= end; i += 1) pageNumbers.push(i);

  const from = equipment.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, equipment.length);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (equipment.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No se encontraron equipos"
        description="Ajusta la búsqueda o cambia el filtro de estado."
      />
    );
  }

  return (
    <div>
      <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pageData.map((row) => (
          <FadeInUp key={row.id} className="h-full">
            <Card
              className="flex h-full cursor-pointer flex-col transition-colors hover:border-blue-500/40"
              onClick={() => setViewEquipment(row)}
              onKeyDown={(event) => handleCardKeyDown(event, row)}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-label={`Ver información de ${row.name}`}
            >
              <CardContent className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                    <Cog className="h-4 w-4" />
                  </span>
                  <StatusBadge
                    status={row.status}
                    variants={EQUIPMENT_STATUS_VARIANTS}
                  />
                </div>
                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  {row.name}
                </p>

                <div className="space-y-1.5 border-y border-border py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Factory className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-16 shrink-0 text-muted">Marca</span>
                    <span className="truncate font-medium text-foreground">
                      {row.brand || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cog className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-16 shrink-0 text-muted">Modelo</span>
                    <span className="truncate font-medium text-foreground">
                      {row.model || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-16 shrink-0 text-muted">Serial</span>
                    <span className="truncate font-mono font-medium text-foreground">
                      {row.serial || "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-auto space-y-1 pt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-16 shrink-0 text-muted">Cliente</span>
                    <span className="truncate text-foreground">
                      {row.client_name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-16 shrink-0 text-muted">Ubicación</span>
                    <span className="truncate text-foreground">
                      {row.location || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-16 shrink-0 text-muted">
                      Próx. mto.
                    </span>
                    <span className="truncate text-foreground">
                      {row.next_maintenance
                        ? formatDate(row.next_maintenance)
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
                    onEdit(row);
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <Tooltip label="Dar de baja">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(row);
                    }}
                    aria-label={`Dar de baja ${row.name}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
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
          <span className="font-semibold text-foreground">{from}–{to}</span> de{" "}
          <span className="font-semibold text-foreground">{equipment.length}</span>{" "}
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

      {viewEquipment && (
        <Modal
          open={Boolean(viewEquipment)}
          onClose={() => setViewEquipment(null)}
          size="lg"
          title={viewEquipment.name}
          description={`Serial ${viewEquipment.serial}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setViewEquipment(null)}>
                Cerrar
              </Button>
              <Button
                icon={Pencil}
                onClick={() => {
                  setViewEquipment(null);
                  onEdit(viewEquipment);
                }}
              >
                Editar
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label="Marca">
                {viewEquipment.brand || "—"}
              </ReadonlyField>
              <ReadonlyField label="Modelo">
                {viewEquipment.model || "—"}
              </ReadonlyField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label="Serial">
                <span className="font-mono text-xs">
                  {viewEquipment.serial || "—"}
                </span>
              </ReadonlyField>
              <ReadonlyField label="Cliente">
                {viewEquipment.client_name || "—"}
              </ReadonlyField>
            </div>

            <ReadonlyField label="Ubicación">
              {viewEquipment.location || "—"}
            </ReadonlyField>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Estado
              </label>
              <StatusBadge
                status={viewEquipment.status}
                variants={EQUIPMENT_STATUS_VARIANTS}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label="Último mantenimiento">
                {viewEquipment.last_maintenance
                  ? formatDate(viewEquipment.last_maintenance)
                  : "—"}
              </ReadonlyField>
              <ReadonlyField label="Próximo mantenimiento">
                {viewEquipment.next_maintenance
                  ? formatDate(viewEquipment.next_maintenance)
                  : "—"}
              </ReadonlyField>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
