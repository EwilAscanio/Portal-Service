"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Globe,
  Inbox,
  MapPin,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Stagger, FadeInUp } from "@/components/ui/animated";
import { CLIENT_STATUS_VARIANTS } from "@/lib/status";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 12;

const pageButton =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-surface px-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

function getActiveLabel(status) {
  return status === "1" ? "Activo" : "Inactivo";
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-3.5 w-3/4" />
      <div className="mt-3 space-y-1.5 border-y border-border py-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="mt-3 h-8 w-full" />
    </div>
  );
}

/**
 * Vista de tarjetas para clientes.
 * Recibe la lista ya filtrada y pagina 12 por página.
 */
export function ClientCardGrid({ clients, loading, onView }) {
  const [page, setPage] = useState(1);

  const [prevClients, setPrevClients] = useState(clients);
  if (clients !== prevClients) {
    setPage(1);
    setPrevClients(clients);
  }

  const totalPages = Math.max(1, Math.ceil(clients.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = clients.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const pageNumbers = [];
  let start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  for (let i = start; i <= end; i += 1) pageNumbers.push(i);

  const from = clients.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, clients.length);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No se encontraron clientes"
        description="Haz clic en 'Sincronizar con Saint' para importar clientes."
      />
    );
  }

  const handleKeyDown = (event, client) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onView(client);
    }
  };

  return (
    <div>
      <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pageData.map((client) => (
          <FadeInUp key={client.id} className="h-full">
            <Card
              className="flex h-full cursor-pointer flex-col transition-colors hover:border-blue-500/40"
              onClick={() => onView(client)}
              onKeyDown={(event) => handleKeyDown(event, client)}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-label={`Ver información de ${client.description}`}
            >
              <CardContent className="flex flex-1 flex-col gap-2 p-4">
                {/* Header: avatar + código + estado */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={client.codclie} size="sm" />
                    <span className="flex h-7 items-center rounded-lg bg-blue-500/10 px-2 font-mono text-[11px] font-bold text-blue-600 ring-1 ring-inset ring-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400">
                      {client.codclie}
                    </span>
                  </div>
                  <StatusBadge
                    status={getActiveLabel(client.status)}
                    variants={CLIENT_STATUS_VARIANTS}
                  />
                </div>
                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  {client.description || "—"}
                </p>

                {/* Detalles */}
                <div className="space-y-1.5 border-y border-border py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">RIF</span>
                    <span className="truncate font-medium text-foreground">
                      {client.rif || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">País</span>
                    <span className="truncate font-medium text-foreground">
                      {client.country_name || client.country || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">Ubicación</span>
                    <span className="truncate font-medium text-foreground">
                      {client.state_name || client.state || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">Teléfono</span>
                    <span className="truncate font-medium text-foreground">
                      {client.phone || "—"}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onView(client);
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver detalle
                </button>
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
            {clients.length}
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
