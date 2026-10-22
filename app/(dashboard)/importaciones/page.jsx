"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, History, Upload } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { notify } from "@/lib/toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/tables/DataTable";
import { FadeInUp } from "@/components/ui/animated";

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "La solicitud no pudo completarse.");
    error.detail = data.detail;
    throw error;
  }
  return data;
}

const operationVariant = { Crear: "success", Actualizar: "info", Error: "danger" };

export default function ImportacionesPage() {
  usePageTitle("Importación de datos");
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [commitError, setCommitError] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await requestJson("/api/import"));
    } catch (error) {
      notify.error("No se pudo cargar el historial", { description: error.message });
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde API
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const analyze = async () => {
    if (!file) return notify.warning("Selecciona un archivo .xlsx");
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await requestJson("/api/import/preview", { method: "POST", body: formData });
      setPreview(data);
      notify.success("Archivo analizado", { description: data.summary.errors ? "Revisa los errores antes de continuar." : "La importación está lista para confirmar." });
      await loadHistory();
    } catch (error) {
      setPreview(null);
      setAnalyzeError({ message: error.message, detail: error.detail });
      notify.error("No se pudo analizar el archivo", { description: error.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const commit = async () => {
    if (!preview?.batch?.id || preview.summary.errors) return;
    setCommitting(true);
    setCommitError(null);
    try {
      const result = await requestJson(`/api/import/${preview.batch.id}/commit`, { method: "POST" });
      notify.success("Importación completada", { description: `${result.imported} registros procesados.` });
      setPreview(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await loadHistory();
    } catch (error) {
      setCommitError({ message: error.message, detail: error.detail });
      notify.error("La importación no se completó", { description: error.message });
    } finally {
      setCommitting(false);
    }
  };

  const previewColumns = useMemo(() => [
    { key: "sheetName", header: "Hoja" },
    { key: "rowNumber", header: "Fila" },
    { key: "entityName", header: "Entidad" },
    { key: "operation", header: "Resultado", render: (row) => <Badge variant={operationVariant[row.operation] || "neutral"}>{row.operation}</Badge> },
    { key: "messages", header: "Detalle", sortable: false, render: (row) => [...row.errors, ...row.warnings].join(" ") || "Sin observaciones" },
  ], []);

  const historyColumns = useMemo(() => [
    { key: "original_file_name", header: "Archivo" },
    { key: "created_by_name", header: "Usuario", className: "hidden md:table-cell" },
    { key: "created_at", header: "Fecha", render: (row) => new Date(row.created_at).toLocaleString("es-VE") },
    { key: "total_count", header: "Filas" },
    { key: "status", header: "Estado", render: (row) => <Badge variant={row.status === "Completado" ? "success" : row.status === "Fallido" ? "danger" : "info"}>{row.status}</Badge> },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader title="Importación de datos" description="Carga Productos, Plantas, Contactos y Equipos desde una plantilla Excel validada." />

      <FadeInUp>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>1. Descarga y completa la plantilla</CardTitle>
              <CardDescription>Los clientes deben existir previamente y estar activos en Saint.</CardDescription>
            </div>
            <a href="/api/import/template" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2">
              <Download className="h-4 w-4" /> Descargar plantilla
            </a>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-dashed border-border bg-surface-2/40 p-6 text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-blue-600" />
              <p className="mt-3 font-medium text-foreground">Selecciona el archivo completado</p>
              <p className="mt-1 text-sm text-muted">Formato .xlsx, máximo 5 MB y 5.000 filas.</p>
              <input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="mx-auto mt-4 block max-w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setAnalyzeError(null); }} />
              <Button className="mt-4" icon={Upload} loading={analyzing} disabled={!file} onClick={analyze}>Analizar archivo</Button>
              {analyzeError && (
                <div className="mt-4 flex gap-3 rounded-xl bg-red-500/10 p-4 text-left">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">{analyzeError.message}</p>
                    {analyzeError.detail && <p className="font-mono text-xs text-red-700/80 dark:text-red-300/80">{analyzeError.detail}</p>}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </FadeInUp>

      {preview && (
        <FadeInUp>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>2. Revisa la previsualización</CardTitle>
                <CardDescription>Ningún dato se ha escrito todavía en los catálogos.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral">{preview.summary.total} filas</Badge>
                <Badge variant="success">{preview.summary.create} nuevas</Badge>
                <Badge variant="info">{preview.summary.update} actualizaciones</Badge>
                {preview.summary.errors > 0 && <Badge variant="danger">{preview.summary.errors} errores</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {preview.summary.errors > 0 ? (
                <div className="flex flex-col gap-3 rounded-xl bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" /><p className="text-sm text-red-700 dark:text-red-300">Corrige todas las filas con error y vuelve a cargar el archivo.</p></div>
                  <a href={`/api/import/${preview.batch.id}/errors`} className="text-sm font-semibold text-red-700 underline dark:text-red-300">Descargar errores</a>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-5 w-5" /> El archivo está listo para importar.</div>
              )}
              <DataTable columns={previewColumns} data={preview.rows} searchKeys={["sheetName", "entityName", "operation"]} pageSize={12} />
              {commitError && (
                <div className="flex gap-3 rounded-xl bg-red-500/10 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">{commitError.message}</p>
                    {commitError.detail && <p className="font-mono text-xs text-red-700/80 dark:text-red-300/80">{commitError.detail}</p>}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button loading={committing} disabled={preview.summary.errors > 0} onClick={commit}>Confirmar importación</Button>
              </div>
            </CardContent>
          </Card>
        </FadeInUp>
      )}

      <FadeInUp>
        <Card>
          <CardHeader><div><CardTitle>Historial</CardTitle><CardDescription>Importaciones analizadas y ejecutadas recientemente.</CardDescription></div><History className="h-5 w-5 text-muted" /></CardHeader>
          <CardContent><DataTable columns={historyColumns} data={history} loading={loadingHistory} searchable={false} pageSize={10} emptyTitle="Sin importaciones" emptyDescription="Todavía no se han procesado archivos Excel." /></CardContent>
        </Card>
      </FadeInUp>
    </div>
  );
}
