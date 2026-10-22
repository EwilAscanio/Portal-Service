import { Suspense } from "react";
import ReportPreview from "@/components/reports/ReportPreview";

export default function ReportPreviewPage() {
  return <Suspense fallback={<p role="status" className="p-6 text-muted">Cargando vista previa…</p>}><ReportPreview /></Suspense>;
}
