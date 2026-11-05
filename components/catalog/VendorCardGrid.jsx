"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, IdCard, Inbox, Mail, MapPin, Phone, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Stagger, FadeInUp } from "@/components/ui/animated";
import { CLIENT_STATUS_VARIANTS } from "@/lib/status";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 12;

const pageButton =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-surface px-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

function vendorStatusLabel(status) {
  return status === "1" ? "Activo" : "Inactivo";
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/3" />
      <div className="mt-3 space-y-1.5 border-t border-border pt-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function FieldLine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3 w-3 shrink-0 text-blue-500" />
      <span className="w-20 shrink-0 text-muted">{label}</span>
      <span className="truncate font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

export function VendorCardGrid({ vendors, loading, onSelect }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(vendors.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = useMemo(
    () => vendors.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [vendors, currentPage]
  );
  const pageNumbers = [];
  let start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  for (let number = start; number <= end; number += 1) pageNumbers.push(number);
  const from = vendors.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, vendors.length);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No se encontraron vendedores"
        description="Ajusta la búsqueda o sincroniza el catálogo desde Configuración."
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
              onClick={() => onSelect(row)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(row);
                }
              }}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-label={`Ver información de ${row.description || row.codvend}`}
            >
              <CardContent className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Users className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium text-foreground">
                        {row.description || "—"}
                      </p>
                      <p className="truncate text-xs text-muted">{row.codvend}</p>
                    </div>
                  </div>
                  <StatusBadge status={vendorStatusLabel(row.status)} variants={CLIENT_STATUS_VARIANTS} />
                </div>
                <div className="space-y-1.5 border-t border-border pt-3 text-xs">
                  <FieldLine icon={IdCard} label="Cédula" value={row.cedula} />
                  <FieldLine icon={Phone} label="Teléfono" value={row.phone} />
                  <FieldLine icon={Mail} label="Correo" value={row.email} />
                  <FieldLine icon={MapPin} label="País" value={row.country_name} />
                  <FieldLine icon={MapPin} label="Estado" value={row.state_name} />
                  <FieldLine icon={MapPin} label="Ciudad" value={row.city_name} />
                </div>
              </CardContent>
            </Card>
          </FadeInUp>
        ))}
      </Stagger>

      <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-border px-2 pt-4 sm:flex-row">
        <p className="text-xs text-muted">
          Mostrando <span className="font-semibold text-foreground">{from}–{to}</span> de{" "}
          <span className="font-semibold text-foreground">{vendors.length}</span> registros
        </p>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} aria-label="Página anterior" className={pageButton}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageNumbers.map((number) => (
            <button
              key={number}
              type="button"
              onClick={() => setPage(number)}
              aria-current={number === currentPage ? "page" : undefined}
              className={cn(pageButton, number === currentPage && "border-blue-600 bg-blue-600 text-black dark:text-white")}
            >
              {number}
            </button>
          ))}
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage === totalPages} aria-label="Página siguiente" className={pageButton}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
