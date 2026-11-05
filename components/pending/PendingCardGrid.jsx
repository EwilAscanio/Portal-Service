"use client";

import Link from "next/link";
import { Building2, CalendarDays, ClipboardList, Factory, Hash } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Stagger, FadeInUp } from "@/components/ui/animated";
import { PENDING_STATUS_VARIANTS, PENDING_EMPTY_TITLE, PENDING_EMPTY_DESCRIPTION, formatPendingDate, pendingActionLabel } from "./pendingPresentation";

const gridClass = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

function FieldLine({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3 w-3 shrink-0 text-blue-500" aria-hidden="true" />
      <span className="w-20 shrink-0 text-muted">{label}</span>
      <span className="truncate font-medium text-foreground">{children}</span>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-4 w-3/4" />
      <div className="mt-3 space-y-1.5 border-t border-border pt-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/** Recibe únicamente la página del servidor; la página principal conserva filtros, paginación y modal. */
export function PendingCardGrid({ items, loading, canComplete, onOpen }) {
  if (loading) {
    return (
      <div role="status" aria-label="Cargando pendientes" className={gridClass}>
        {Array.from({ length: 8 }, (_, index) => <CardSkeleton key={index} />)}
      </div>
    );
  }

  if (!items.length) return <EmptyState title={PENDING_EMPTY_TITLE} description={PENDING_EMPTY_DESCRIPTION} />;

  return (
    <Stagger className={gridClass}>
      {items.map((item) => (
        <FadeInUp key={item.id} className="h-full">
          <Card
            className="flex h-full min-w-0 cursor-pointer flex-col transition-colors hover:border-blue-500/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            role="button"
            tabIndex={0}
            aria-haspopup="dialog"
            aria-label={`Ver pendiente de ${item.order_code}`}
            aria-describedby={`pending-description-${item.id}`}
            onClick={() => onOpen(item)}
            onKeyDown={(event) => {
              // Los enlaces y botones internos conservan su activación propia.
              if (event.target !== event.currentTarget) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(item);
              }
            }}
          >
            <CardContent className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                    <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p id={`pending-description-${item.id}`} className="line-clamp-2 text-sm font-medium text-foreground">
                      {item.description}
                    </p>
                    <p className="truncate text-xs text-muted">{item.order_code}</p>
                  </div>
                </div>
                <StatusBadge status={item.status} variants={PENDING_STATUS_VARIANTS} />
              </div>
              <div className="space-y-1.5 border-t border-border pt-3 text-xs">
                <FieldLine icon={Building2} label="Cliente">{item.client_code} · {item.client_name}</FieldLine>
                <FieldLine icon={Factory} label="Planta">{item.plant_name}</FieldLine>
                <FieldLine icon={Hash} label="PAR">{item.par_number}</FieldLine>
                <FieldLine icon={CalendarDays} label="Publicado">{formatPendingDate(item.published_at)}</FieldLine>
              </div>
            </CardContent>
            <CardFooter className="p-3">
              <Link
                href={`/ordenes/${item.service_order_id}`}
                className="inline-flex h-8 items-center rounded-xl border border-border px-3 text-[11px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {item.order_code}
              </Link>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(item);
                }}
                onKeyDown={(event) => event.stopPropagation()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-500"
              >
                {pendingActionLabel(item, canComplete)}
              </button>
            </CardFooter>
          </Card>
        </FadeInUp>
      ))}
    </Stagger>
  );
}
