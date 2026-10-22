"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Eye, FileText, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ClientSearch } from "@/components/ui/ClientSearch";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { usePageTitle } from "@/hooks/usePageTitle";
import { getReportCatalogs } from "@/lib/api";
import { EMPTY_REPORT_FILTERS, REPORT_PAR_STATUSES, REPORT_TYPES, reportFiltersFromSearch, reportSearch } from "@/lib/reports";
import { reportFiltersSchema } from "@/lib/validators/report.schema";

export default function ReportFilters() {
  const search = useSearchParams();
  return <ReportForm key={search.toString()} initial={reportFiltersFromSearch(search)} />;
}

function ReportForm({ initial }) {
  usePageTitle("Reportes");
  const router = useRouter();
  const [filters, setFilters] = useState(initial);
  const [catalogs, setCatalogs] = useState({ clients: [], technicians: [] });
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const isHours = filters.type === "technician-hours";

  useEffect(() => {
    const controller = new AbortController();
    getReportCatalogs(controller.signal).then((data) => {
      if (!controller.signal.aborted) { setCatalogs(data); setLoading(false); }
    }).catch((cause) => {
      if (!controller.signal.aborted) { setCatalogError(cause.response?.data?.error || "No se pudieron cargar los filtros."); setLoading(false); }
    });
    return () => controller.abort();
  }, [retry]);

  function change(key, value) {
    setError("");
    setFilters((previous) => ({ ...previous, [key]: value, ...(key === "type" ? { technicianId: "", status: "" } : {}) }));
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
      <PageHeader title="Reportes" description="Selecciona un reporte, define sus filtros y consulta el documento antes de descargarlo." />
      <div className="grid gap-4 md:grid-cols-2" role="group" aria-label="Tipo de reporte">
        {REPORT_TYPES.map((report, index) => {
          const Icon = index === 0 ? FileText : BarChart3;
          const selected = filters.type === report.value;
          return <button key={report.value} type="button" aria-pressed={selected} onClick={() => change("type", report.value)} className={`rounded-2xl border p-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 ${selected ? "border-blue-500 bg-blue-500/5" : "border-border bg-surface hover:bg-surface-2"}`}>
            <Icon className={`mb-3 h-6 w-6 ${selected ? "text-blue-600" : "text-muted"}`} />
            <span className="block font-semibold text-foreground">{report.label}</span>
            <span className="mt-1 block text-sm text-muted">{report.description}</span>
          </button>;
        })}
      </div>

      <form onSubmit={showReport} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="mb-5 text-base font-semibold text-foreground">Filtros del reporte</h2>
        {catalogError ? <div role="alert" className="mb-5 space-y-3 text-sm text-red-600"><p>{catalogError}</p><Button type="button" variant="secondary" onClick={() => { setLoading(true); setCatalogError(""); setRetry((value) => value + 1); }}>Reintentar</Button></div> : null}
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <ClientSearch clients={catalogs.clients} value={filters.clientId} onChange={(value) => change("clientId", value)} label="Cliente (opcional)" disabled={loading || Boolean(catalogError)} />
            <p className="mt-1.5 text-xs text-muted">Sin selección: todos los clientes. Puedes consultar clientes inactivos con historial.</p>
          </div>
          {isHours ? (
            <Select label="Técnico" value={filters.technicianId} onChange={(event) => change("technicianId", event.target.value)} disabled={loading || Boolean(catalogError)} options={[
              { value: "", label: "Todos los técnicos" },
              ...catalogs.technicians.map((technician) => ({ value: technician.id, label: `${technician.name}${technician.status === "Activo" ? "" : " (inactivo)"}` })),
            ]} />
          ) : (
            <Select label="Estado del PAR" value={filters.status} onChange={(event) => change("status", event.target.value)} options={[
              { value: "", label: "Todos los estados" }, ...REPORT_PAR_STATUSES.map((status) => ({ value: status, label: status })),
            ]} />
          )}
          <Input label={`${isHours ? "Fecha de cierre" : "Fecha de creación"} desde`} type="date" value={filters.from} max={filters.to || "9999-12-31"} onChange={(event) => change("from", event.target.value)} />
          <Input label={`${isHours ? "Fecha de cierre" : "Fecha de creación"} hasta`} type="date" value={filters.to} min={filters.from || "0001-01-01"} onChange={(event) => change("to", event.target.value)} />
        </div>
        <div className="mt-6 rounded-xl bg-surface-2 p-4 text-sm leading-relaxed text-muted">
          {isHours ? "Se comparan las horas estimadas y reales de las mismas órdenes cerradas. Las órdenes antiguas sin horas reales confirmadas se identifican y quedan fuera del cálculo." : "Incluye los PAR registrados en el período de creación seleccionado. El estado corresponde al que se muestra en la ventana de PAR."}
          <p className="mt-1">Las fechas incluyen el día inicial y final, en horario de Venezuela. Dejar ambas vacías permite consultar todo el historial.</p>
        </div>
        {error && <p role="alert" className="mt-4 text-sm font-medium text-red-600">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-border pt-5">
          <Button type="button" variant="secondary" icon={RotateCcw} onClick={() => { setFilters({ ...EMPTY_REPORT_FILTERS, type: filters.type }); setError(""); }}>Limpiar filtros</Button>
          <Button type="submit" icon={Eye} loading={loading} disabled={Boolean(catalogError)}>Mostrar Reporte</Button>
        </div>
      </form>
    </div>
  );
}
