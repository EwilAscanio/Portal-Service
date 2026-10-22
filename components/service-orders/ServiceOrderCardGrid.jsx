"use client";

import { useState } from "react";
import { Building2, CalendarClock, ChevronLeft, ChevronRight, ClipboardList, Clock3, Factory, Inbox, Users } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FadeInUp, Stagger } from "@/components/ui/animated";
import { ORDER_STATUS_VARIANTS, PRIORITY_VARIANTS } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 12;
const SERVICE_TYPES = { Inspection: "Revisión", Maintenance: "Mantenimiento", Emergency: "Emergencia", Other: "Otro" };
const pageButton = "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-surface px-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

function CardSkeleton() {
  return <div className="rounded-2xl border border-border bg-surface p-4"><div className="flex justify-between"><Skeleton className="h-9 w-9 rounded-xl" /><Skeleton className="h-5 w-24 rounded-full" /></div><Skeleton className="mt-3 h-4 w-2/3" /><div className="mt-3 space-y-2 border-y border-border py-3"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" /><Skeleton className="h-3 w-3/4" /></div></div>;
}

export function ServiceOrderCardGrid({ orders, loading, onNavigate }) {
  const [page, setPage] = useState(1);
  const [previousOrders, setPreviousOrders] = useState(orders);
  if (orders !== previousOrders) { setPage(1); setPreviousOrders(orders); }

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = orders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = orders.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(currentPage * PAGE_SIZE, orders.length);
  const pageNumbers = [];
  let start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  for (let number = start; number <= end; number += 1) pageNumbers.push(number);

  if (loading) return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <CardSkeleton key={index} />)}</div>;
  if (!orders.length) return <EmptyState icon={Inbox} title="No se encontraron órdenes" description="Ajusta la búsqueda o cambia los filtros aplicados." />;

  return <div>
    <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {pageData.map((row) => <FadeInUp key={row.id} className="h-full">
        <Card className="flex h-full cursor-pointer flex-col transition-colors hover:border-blue-500/40" onClick={() => onNavigate(row)} onKeyDown={(event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); onNavigate(row); } }} role="button" tabIndex={0} aria-label={`Abrir orden ${row.order_code}`}>
          <CardContent className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600"><ClipboardList className="h-4 w-4" /></span><StatusBadge status={row.status} variants={ORDER_STATUS_VARIANTS} /></div>
            <div><p className="truncate text-sm font-semibold text-foreground">{row.order_code}</p><p className="text-xs text-muted">PAR {row.par_number || "—"}</p></div>
            <div className="space-y-1.5 border-y border-border py-2 text-xs">
              <Line icon={Building2} label="Cliente" value={row.client_name} />
              <Line icon={Factory} label="Planta" value={row.plant_name} />
              <Line icon={Users} label="Técnicos" value={row.technician_display_name} />
            </div>
            <div className="mt-auto space-y-1.5 pt-2 text-xs">
              <Line icon={CalendarClock} label="Programada" value={row.scheduled_start ? formatDate(row.scheduled_start) : "—"} wide />
              <Line icon={Clock3} label={row.labor_review_required ? (row.status === "Cancelada" ? "Horas anteriores" : "Horas anteriores · revisar") : "Horas estimadas"} value={row.worked_hours ?? 0} wide />
              {row.closed_at && <Line icon={Clock3} label="Horas reales" value={row.actual_hours ?? 0} wide />}
              <div className="flex items-center justify-between gap-2 pt-1"><span className="text-muted">{SERVICE_TYPES[row.service_type] || row.service_type || "—"}</span><StatusBadge status={row.priority} variants={PRIORITY_VARIANTS} dot={false} /></div>
            </div>
          </CardContent>
          <CardFooter className="p-3"><button type="button" onClick={(event) => { event.stopPropagation(); onNavigate(row); }} className="flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-500">Abrir orden</button></CardFooter>
        </Card>
      </FadeInUp>)}
    </Stagger>
    <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-border px-2 pt-4 sm:flex-row"><p className="text-xs text-muted">Mostrando <span className="font-semibold text-foreground">{from}–{to}</span> de <span className="font-semibold text-foreground">{orders.length}</span> registros</p><div className="flex items-center gap-1.5"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} aria-label="Página anterior" className={pageButton}><ChevronLeft className="h-4 w-4" /></button>{pageNumbers.map((number) => <button key={number} type="button" onClick={() => setPage(number)} aria-current={number === currentPage ? "page" : undefined} className={cn(pageButton, number === currentPage && "border-blue-600 bg-blue-600 text-white")}>{number}</button>)}<button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} aria-label="Página siguiente" className={pageButton}><ChevronRight className="h-4 w-4" /></button></div></div>
  </div>;
}

function Line({ icon: Icon, label, value, wide = false }) {
  return <div className="flex items-center gap-2"><Icon className="h-3 w-3 shrink-0 text-blue-500" /><span className={cn("shrink-0 text-muted", wide ? "w-20" : "w-16")}>{label}</span><span className="truncate font-medium text-foreground">{value === "" || value == null ? "—" : value}</span></div>;
}
