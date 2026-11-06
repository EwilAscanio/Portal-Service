"use client";

import { ORDER_KINDS, PAR_PURPOSES } from "@/lib/warranty";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, CalendarDays, CalendarRange, Eye, FileText, Filter, RotateCcw, SlidersHorizontal, Users, Wrench, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ClientSearch } from "@/components/ui/ClientSearch";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { usePageTitle } from "@/hooks/usePageTitle";
import { getReportCatalogs } from "@/lib/api";
import {
  REPORT_CLIENT_STATUSES, REPORT_ORDER_STATUSES, REPORT_PAR_STATUSES, REPORT_TYPES,
  emptyReportFilters, reportActiveFilterCount, reportDateLabel, reportFiltersFromSearch,
  reportSearch, reportUsesClient, reportUsesDates, reportUsesOrderKind, reportUsesPurpose, reportUsesTechnician,
} from "@/lib/reports";
import { reportFiltersSchema } from "@/lib/validators/report.schema";

const ICONS = {
  pars: FileText,
  "technician-hours": BarChart3,
  "service-orders": Wrench,
  clients: Users,
  "par-monthly": CalendarRange,
  "technician-calendar": CalendarDays,
};

function draftsFrom(initial) {
  return Object.fromEntries(REPORT_TYPES.map((report) => [
    report.value,
    report.value === initial.type ? initial : emptyReportFilters(report.value),
  ]));
}

export default function ReportFilters() {
  const search = useSearchParams();
  return <ReportForm key={search.toString()} initial={reportFiltersFromSearch(search)} />;
}

function ReportForm({ initial }) {
  usePageTitle("Reportes");
  const router = useRouter();
  const [activeType, setActiveType] = useState(initial.type);
  const [drafts, setDrafts] = useState(() => draftsFrom(initial));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catalogs, setCatalogs] = useState({ clients: [], technicians: [] });
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const filters = drafts[activeType];
  const activeReport = REPORT_TYPES.find((report) => report.value === activeType);
  const activeCount = reportActiveFilterCount(filters);

  useEffect(() => {
    const controller = new AbortController();
    getReportCatalogs(controller.signal).then((data) => {
      if (!controller.signal.aborted) { setCatalogs(data); setLoading(false); }
    }).catch((cause) => {
      if (!controller.signal.aborted) { setCatalogError(cause.response?.data?.error || "No se pudieron cargar los filtros."); setLoading(false); }
    });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  function selectReport(type) {
    setError("");
    setActiveType(type);
  }

  function openFilters(type) {
    selectReport(type);
    setDrawerOpen(true);
  }

  function change(key, value) {
    setError("");
    setDrafts((previous) => ({ ...previous, [activeType]: { ...previous[activeType], [key]: value } }));
  }

  function clearFilters() {
    setError("");
    setDrafts((previous) => ({ ...previous, [activeType]: emptyReportFilters(activeType) }));
  }

  function showReport(event) {
    event.preventDefault();
    const parsed = reportFiltersSchema.safeParse(filters);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Revisa los filtros seleccionados."); return; }
    if (filters.clientId && !catalogs.clients.some((client) => client.id === filters.clientId)) { setError("El cliente seleccionado ya no está disponible. Selecciona otro cliente o limpia los filtros."); return; }
    if (filters.technicianId && !catalogs.technicians.some((technician) => technician.id === filters.technicianId)) { setError("El técnico seleccionado ya no está disponible. Selecciona otro técnico o limpia los filtros."); return; }
    router.push(`/reportes/vista?${reportSearch(parsed.data)}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reportes" description="Elige un reporte, define sus filtros y abre el documento PDF." />
      <section aria-label="Catálogo de reportes" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORT_TYPES.map((report) => {
          const Icon = ICONS[report.value] || FileText;
          const selected = activeType === report.value;
          const count = reportActiveFilterCount(drafts[report.value]);
          return (
            <article key={report.value} className={`flex flex-col justify-between rounded-2xl border p-5 transition-colors ${selected ? "border-blue-500 bg-blue-500/5" : "border-border bg-surface"}`}>
              <div>
                <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="truncate">{report.origin}</span>
                  <span className="shrink-0 font-medium text-foreground">{count} filtros</span>
                </div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Icon className={`h-5 w-5 shrink-0 ${selected ? "text-blue-600" : "text-muted"}`} />
                  <span>{report.label}</span>
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{report.description}</p>
                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-1.5 text-xs font-semibold text-foreground">Filtros de este reporte</p>
                  <ul className="space-y-1 text-xs text-muted">
                    {report.filterSummary.map((item) => <li key={item}>· {item}</li>)}
                  </ul>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Button type="button" variant={selected ? "primary" : "secondary"} className="flex-1" aria-pressed={selected} onClick={() => selectReport(report.value)}>
                  {selected ? "Viendo reporte" : "Seleccionar"}
                </Button>
                <Button type="button" variant="secondary" icon={Filter} aria-label={`Configurar filtros de ${report.label}`} onClick={() => openFilters(report.value)}>
                  Filtros ({count})
                </Button>
              </div>
            </article>
          );
        })}
      </section>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-muted">{activeReport.origin}</p>
          <h2 className="mt-0.5 text-lg font-semibold text-foreground">{activeReport.label}</h2>
          <p className="mt-1 text-sm text-muted">
            {activeCount === 0 ? "Sin filtros adicionales: el PDF incluirá todo el alcance de este reporte." : `${activeCount} ${activeCount === 1 ? "filtro definido" : "filtros definidos"}. Revísalos antes de generar el PDF.`}
          </p>
        </div>
        <Button type="button" icon={SlidersHorizontal} onClick={() => setDrawerOpen(true)}>
          Abrir filtros ({activeCount})
        </Button>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-[85] flex justify-end bg-slate-900/40" role="dialog" aria-modal="true" aria-labelledby="report-drawer-title">
          <button type="button" className="flex-1 cursor-default" aria-label="Cerrar filtros" onClick={() => setDrawerOpen(false)} />
          <form onSubmit={showReport} className="flex h-full w-full max-w-md shrink-0 flex-col border-l border-border bg-surface shadow-xl">
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <p className="text-xs font-medium text-blue-600">Filtros del reporte</p>
                  <h3 id="report-drawer-title" className="mt-0.5 text-lg font-semibold text-foreground">{activeReport.label}</h3>
                </div>
                <Button type="button" variant="ghost" size="icon" icon={X} aria-label="Cerrar cajón de filtros" onClick={() => setDrawerOpen(false)} />
              </div>

              <Select label="Reporte activo" value={activeType} onChange={(event) => selectReport(event.target.value)} options={REPORT_TYPES.map((report) => ({ value: report.value, label: report.label }))} />

              {catalogError ? (
                <div role="alert" className="space-y-3 text-sm text-red-600">
                  <p>{catalogError}</p>
                  <Button type="button" variant="secondary" onClick={() => { setLoading(true); setCatalogError(""); setRetry((value) => value + 1); }}>Reintentar</Button>
                </div>
              ) : null}

              <div className="space-y-5 border-t border-border pt-4">
                {reportUsesClient(activeType) ? (
                  <div>
                    <ClientSearch clients={catalogs.clients} value={filters.clientId} onChange={(value) => change("clientId", value)} label="Cliente (opcional)" disabled={loading || Boolean(catalogError)} />
                    <p className="mt-1.5 text-xs text-muted">Sin selección: todos los clientes, incluidos los inactivos con historial.</p>
                  </div>
                ) : null}
                {reportUsesTechnician(activeType) ? (
                  <Select label="Técnico" value={filters.technicianId} onChange={(event) => change("technicianId", event.target.value)} disabled={loading || Boolean(catalogError)} options={[
                    { value: "", label: "Todos los técnicos" },
                    ...catalogs.technicians.map((technician) => ({ value: technician.id, label: `${technician.name}${technician.status === "Activo" ? "" : " (inactivo)"}` })),
                  ]} />
                ) : null}
                {reportUsesPurpose(activeType) ? (
                  <Select label="Estado del PAR" value={filters.status} onChange={(event) => change("status", event.target.value)} options={[
                    { value: "", label: "Todos los estados" }, ...REPORT_PAR_STATUSES.map((status) => ({ value: status, label: status })),
                  ]} />
                ) : null}
                {activeType === "service-orders" ? (
                  <Select label="Estado de la orden" value={filters.status} onChange={(event) => change("status", event.target.value)} options={[
                    { value: "", label: "Todos los estados" }, ...REPORT_ORDER_STATUSES.map((status) => ({ value: status, label: status })),
                  ]} />
                ) : null}
                {activeType === "clients" ? (
                  <Select label="Estado Saint" value={filters.status} onChange={(event) => change("status", event.target.value)} options={[
                    { value: "", label: "Todos" }, ...REPORT_CLIENT_STATUSES,
                  ]} />
                ) : null}
                {reportUsesPurpose(activeType) ? (
                  <Select label="Finalidad del PAR" value={filters.parPurpose} onChange={(event) => change("parPurpose", event.target.value)} options={[{ value: "", label: "Todas" }, ...PAR_PURPOSES]} />
                ) : null}
                {reportUsesOrderKind(activeType) ? (
                  <Select label="Clasificación de la O/S" value={filters.orderKind} onChange={(event) => change("orderKind", event.target.value)} options={[{ value: "", label: "Todas" }, ...ORDER_KINDS]} />
                ) : null}
                {reportUsesDates(activeType) ? (
                  <>
                    <Input label={`${reportDateLabel(activeType)} desde`} type="date" value={filters.from} max={filters.to || "9999-12-31"} onChange={(event) => change("from", event.target.value)} />
                    <Input label={`${reportDateLabel(activeType)} hasta`} type="date" value={filters.to} min={filters.from || "0001-01-01"} onChange={(event) => change("to", event.target.value)} />
                  </>
                ) : null}
              </div>

              <div className="rounded-xl bg-surface-2 p-4 text-sm leading-relaxed text-muted">
                <ReportHint type={activeType} />
              </div>
              {error ? <p role="alert" className="text-sm font-medium text-red-600">{error}</p> : null}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-2 p-5">
              <Button type="button" variant="secondary" icon={RotateCcw} onClick={clearFilters}>Limpiar</Button>
              <Button type="submit" icon={Eye} loading={loading} disabled={Boolean(catalogError)}>Mostrar reporte</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function ReportHint({ type }) {
  if (type === "technician-hours") {
    return <p>Se comparan las horas estimadas y reales de órdenes cerradas. Las órdenes antiguas sin horas reales confirmadas se identifican y quedan fuera del cálculo. Las fechas incluyen el día inicial y final, en horario de Venezuela.</p>;
  }
  if (type === "service-orders") {
    return <p>Cada orden sale una sola vez. El filtro de fechas usa el inicio programado e incluye canceladas cuando el estado queda en todos o en Cancelada. Las fechas incluyen el día inicial y final, en horario de Venezuela.</p>;
  }
  if (type === "clients") {
    return <p>Lista el código y el nombre actuales, el estado Saint y cuántas plantas, contactos y equipos tiene cada cliente. No incluye saldos ni facturas.</p>;
  }
  if (type === "technician-calendar") {
    return <p>Imprime la agenda como el calendario: una fila por técnico en cada orden aprobada, con horario, cliente, planta y conflicto. Las fechas cruzan el período programado. También lista la no disponibilidad, sin categoría ni notas. Pendientes y canceladas no aparecen.</p>;
  }
  if (type === "par-monthly") {
    return <p>Agrupa los PAR por mes de creación y suma horas, subtotales, descuentos y totales finales. No promedia el porcentaje de descuento. El estado es el visible en la ventana de PAR.</p>;
  }
  return <p>Incluye los PAR del período de creación seleccionado. El estado corresponde al que se muestra en la ventana de PAR. Las fechas incluyen el día inicial y final, en horario de Venezuela.</p>;
}
