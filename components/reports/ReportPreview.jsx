"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePageTitle } from "@/hooks/usePageTitle";
import { generateReport } from "@/lib/api";
import { REPORT_TYPES, reportDate, reportFiltersFromSearch, reportHistoricalNotes, reportSearch } from "@/lib/reports";
import { reportFiltersSchema } from "@/lib/validators/report.schema";

export default function ReportPreview() {
  const search = useSearchParams();
  const router = useRouter();
  const [generation, setGeneration] = useState(0);
  const query = search.toString();
  const parsed = useMemo(() => reportFiltersSchema.safeParse(reportFiltersFromSearch(new URLSearchParams(query))), [query]);
  if (!parsed.success) return <EmptyState title="Filtros inválidos" description={parsed.error.issues[0]?.message} action={<Button onClick={() => router.push("/reportes")}>Volver a filtros</Button>} />;
  return <PreviewDocument key={`${query}:${generation}`} filters={parsed.data} onRefresh={() => setGeneration((value) => value + 1)} />;
}

function PreviewDocument({ filters, onRefresh }) {
  const router = useRouter();
  const title = REPORT_TYPES.find((type) => type.value === filters.type).label;
  usePageTitle(title);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    generateReport(filters, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      if (data.blob) objectUrl = URL.createObjectURL(data.blob);
      setResult({ ...data, url: objectUrl });
      setLoading(false);
    }).catch((cause) => {
      if (!controller.signal.aborted) { setError(cause.message || "No se pudo generar el reporte."); setLoading(false); }
    });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filters]);

  function download() {
    // La descarga reutiliza los mismos bytes del visor. Nunca vuelve a consultar
    // la base: un cambio posterior solo se refleja al pulsar Actualizar reporte.
    if (!result?.url) return;
    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = result.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  const notes = reportHistoricalNotes(result || {});
  return (
    <div className="space-y-5">
      <PageHeader title={title} description="Vista previa del documento PDF." actions={<>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push(`/reportes?${reportSearch(filters)}`)}>Volver a filtros</Button>
        <Button variant="secondary" icon={RefreshCw} disabled={loading} onClick={onRefresh}>Actualizar reporte</Button>
        <Button icon={Download} disabled={!result?.url || loading} onClick={download}>Descargar PDF</Button>
      </>} />
      {notes.length > 0 && <div role="status" className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground">{notes.map((note) => <p key={note}>{note}</p>)}</div>}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface" aria-label="Documento del reporte" aria-busy={loading}>
        {loading ? <div role="status" className="flex min-h-80 flex-col items-center justify-center gap-3 p-8 text-muted"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /><p>Generando reporte…</p></div> : error ? (
          <div role="alert"><EmptyState title="No se pudo generar el reporte" description={error} action={<Button onClick={onRefresh}>Reintentar</Button>} /></div>
        ) : result?.empty ? (
          <EmptyState icon={FileText} title="No hay resultados para estos filtros" description={filters.type === "technician-hours" ? "No hay órdenes cerradas con horas reales confirmadas que coincidan con la selección." : "No hay PAR que coincidan con la selección."} action={<Button variant="secondary" onClick={() => router.push(`/reportes?${reportSearch(filters)}`)}>Cambiar filtros</Button>} />
        ) : result?.url ? <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 text-xs text-muted">
            <span>Generado el {reportDate(result.generatedAt, true)} · {result.rowCount} {filters.type === "pars" ? "PAR" : "renglones de mano de obra"}</span>
            <span>La descarga contiene este mismo documento.</span>
          </div>
          <iframe src={result.url} title={`Vista previa: ${title}`} className="h-[75vh] min-h-[480px] w-full bg-slate-100" />
          <p className="px-4 py-3 text-xs text-muted">Si tu navegador no muestra la vista previa, usa Descargar PDF para abrir el documento.</p>
        </> : null}
      </section>
    </div>
  );
}
