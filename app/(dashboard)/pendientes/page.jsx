"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getPendingItems, completePendingItem } from "@/lib/api";
import { notify } from "@/lib/toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { FadeInUp } from "@/components/ui/animated";
import { PendingCardGrid } from "@/components/pending/PendingCardGrid";
import { cn } from "@/utils/cn";
import { PENDING_STATUS_VARIANTS as variants, PENDING_EMPTY_TITLE, PENDING_EMPTY_DESCRIPTION, formatPendingDate as date, pendingActionLabel } from "@/components/pending/pendingPresentation";

const initialFilters = { status: "Pendiente", clientId: "", plantId: "", order: "", search: "" };
const message = (error) => error?.response?.data?.error || "No se pudo consultar la lista de pendientes.";
const pageButton = "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-surface px-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

export default function PendingPage() {
  usePageTitle("Lista de pendientes");
  const [view, setView, viewHydrated] = useLocalStorage("mq-pendientes-view", "table");
  const effectiveView = viewHydrated && view === "cards" ? "cards" : "table";
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [resolution, setResolution] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const debouncedSearch = useDebounce(filters.search, 200);

  useEffect(() => {
    setApplied((current) => current.search === debouncedSearch ? current : { ...current, search: debouncedSearch });
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getPendingItems({ ...applied, clientId: applied.clientId || undefined, plantId: applied.plantId || undefined, page });
        if (active) setData(result);
      } catch (failure) {
        if (active) setError(message(failure));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [applied, page, reload]);

  const catalog = data?.catalog || [];
  const clients = [...new Map(catalog.map((row) => [row.client_id, row])).values()];
  const plants = [...new Map(catalog.filter((row) => !filters.clientId || row.client_id === filters.clientId).map((row) => [row.plant_id, row])).values()];
  const open = (row) => {
    if (loading) return;
    setSelected(row);
    setResolution("");
    setSaveError("");
  };
  const applySelection = (patch) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    setPage(1);
    setApplied({ ...next, search: debouncedSearch });
  };
  const pageSize = data?.pageSize || 20;
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageNumbers = [];
  let start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  for (let number = start; number <= end; number += 1) pageNumbers.push(number);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const columns = [
    { key: "order_code", header: "O/S / PAR", render: (row) => <><Link href={`/ordenes/${row.service_order_id}`} className="font-semibold text-blue-600 dark:text-blue-400" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>{row.order_code}</Link><span className="block text-xs text-muted">PAR {row.par_number}</span></> },
    { key: "client_name", header: "Cliente", render: (row) => <span>{row.client_code}<span className="block text-muted">{row.client_name}</span></span> },
    { key: "plant_name", header: "Planta" },
    { key: "description", header: "Pendiente", render: (row) => <p className="min-w-48 max-w-lg whitespace-pre-wrap break-words">{row.description}</p> },
    { key: "status", header: "Estado", render: (row) => <StatusBadge status={row.status} variants={variants} /> },
    { key: "published_at", header: "Publicado", render: (row) => date(row.published_at) },
    { key: "actions", header: "", sortable: false, className: "w-36", render: (row) => <Button size="sm" variant="secondary" disabled={loading} onClick={(event) => { event.stopPropagation(); open(row); }} onKeyDown={(event) => event.stopPropagation()}>{pendingActionLabel(row, data?.canComplete)}</Button> },
  ].map((column) => ({ ...column, sortable: false }));
  const complete = async () => {
    if (saving || resolution.trim().length < 5) return;
    setSaving(true);
    setSaveError("");
    try {
      await completePendingItem(selected.id, { revision: selected.revision, resolution: resolution.trim() });
      setSelected(null);
      setPage(1);
      setReload((value) => value + 1);
      notify.success("Pendiente completado.");
    } catch (failure) {
      setSaveError(message(failure));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Lista de pendientes" description="Seguimiento de los pendientes publicados al cerrar las órdenes de servicio." />
      <FadeInUp>
        <Card>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <SearchInput
                value={filters.search}
                onChange={(value) => setFilters((current) => ({ ...current, search: value }))}
                placeholder="Buscar por pendiente u orden…"
                className="w-56 shrink-0"
              />
              <div className="w-52 shrink-0">
                <Select
                  aria-label="Cliente"
                  value={filters.clientId}
                  onChange={(event) => applySelection({ clientId: event.target.value, plantId: "" })}
                >
                  <option value="">Todos los clientes</option>
                  {clients.map((row) => <option key={row.client_id} value={row.client_id}>{row.client_code} · {row.client_name}</option>)}
                </Select>
              </div>
              <div className="w-44 shrink-0">
                <Select
                  aria-label="Planta"
                  value={filters.plantId}
                  onChange={(event) => applySelection({ plantId: event.target.value })}
                >
                  <option value="">Todas las plantas</option>
                  {plants.map((row) => <option key={row.plant_id} value={row.plant_id}>{row.plant_name}</option>)}
                </Select>
              </div>
              <div className="w-36 shrink-0">
                <Select
                  aria-label="Estado"
                  value={filters.status}
                  onChange={(event) => applySelection({ status: event.target.value })}
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Completado">Completado</option>
                  <option value="">Todos</option>
                </Select>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-3">
                <Badge variant="info" className="text-xs">{total} {total === 1 ? "pendiente" : "pendientes"}</Badge>
                <ViewToggle view={effectiveView} onChange={setView} />
              </div>
            </div>
            {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : (
              <div aria-busy={loading}>
                {effectiveView === "cards"
                  ? <PendingCardGrid items={data?.items || []} loading={loading} canComplete={data?.canComplete} onOpen={open} />
                  : <DataTable columns={columns} data={data?.items || []} loading={loading} searchable={false} paginate={false} onRowClick={open} emptyTitle={PENDING_EMPTY_TITLE} emptyDescription={PENDING_EMPTY_DESCRIPTION} />}
                <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-border px-2 pt-4 sm:flex-row">
                  <p className="text-xs text-muted">
                    Mostrando <span className="font-semibold text-foreground">{from}–{to}</span> de{" "}
                    <span className="font-semibold text-foreground">{total}</span> registros
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button type="button" className={pageButton} aria-label="Página anterior" disabled={loading || page === 1} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {pageNumbers.map((number) => (
                      <button
                        key={number}
                        type="button"
                        onClick={() => setPage(number)}
                        disabled={loading}
                        aria-current={number === page ? "page" : undefined}
                        className={cn(pageButton, number === page && "border-blue-600 bg-blue-600 text-black dark:text-white")}
                      >
                        {number}
                      </button>
                    ))}
                    <button type="button" className={pageButton} aria-label="Página siguiente" disabled={loading || page * pageSize >= total} onClick={() => setPage(page + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeInUp>
      <Modal
        open={!!selected}
        onClose={() => !saving && setSelected(null)}
        title={selected?.status === "Pendiente" && data?.canComplete ? "Resolver pendiente" : "Detalle del pendiente"}
        size="xl"
        scrollable
        footer={<><Button variant="secondary" disabled={saving} onClick={() => setSelected(null)}>Volver</Button>{selected?.status === "Pendiente" && data?.canComplete && <Button variant="success" icon={CheckCircle2} loading={saving} disabled={resolution.trim().length < 5} onClick={complete}>Marcar completado</Button>}</>}
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <p>{selected.client_code} · {selected.client_name} · {selected.plant_name}</p>
            <Link className="text-blue-600 underline" href={`/ordenes/${selected.service_order_id}`}>Abrir {selected.order_code} · PAR {selected.par_number}</Link>
            <p className="whitespace-pre-wrap break-words">{selected.description}</p>
            <p>Reportado por {selected.created_by_name} · Publicado {date(selected.published_at)}</p>
            {selected.status === "Completado" ? (
              <div>
                <p className="whitespace-pre-wrap">Solución: {selected.resolution}</p>
                <p>{selected.completed_by_name} · {date(selected.completed_at)}</p>
              </div>
            ) : data?.canComplete && (
              <Textarea label="Solución realizada *" value={resolution} maxLength={2000} disabled={saving} onChange={(event) => setResolution(event.target.value)} hint="Registrar la solución completa este pendiente; la O/S conserva su cierre." />
            )}
            {saveError && <p role="alert" className="text-red-600">{saveError}</p>}
            <details>
              <summary className="cursor-pointer font-semibold">Historial</summary>
              <div className="mt-2 space-y-2">
                {selected.events.map((event, index) => (
                  <div key={index}>
                    <p>{event.action} · {event.actor_name} · {date(event.created_at)}</p>
                    {event.details?.resolution && <p className="whitespace-pre-wrap">{event.details.resolution}</p>}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </Modal>
    </div>
  );
}
