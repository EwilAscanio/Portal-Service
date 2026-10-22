import { Suspense } from "react";
import ReportFilters from "@/components/reports/ReportFilters";

export default function ReportesPage() {
  return <Suspense fallback={<p role="status" className="p-6 text-muted">Cargando reportes…</p>}><ReportFilters /></Suspense>;
}
