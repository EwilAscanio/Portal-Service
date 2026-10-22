import { NextResponse } from "next/server";
import { reportFiltersSchema } from "@/lib/validators/report.schema";
import { readReport } from "@/lib/repositories/report.repository";
import { renderReportPdf } from "@/lib/reports/pdf";
import { REPORT_RESPONSE_HEADERS, reportActor, reportApiError } from "@/lib/reports/api";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { actor, response } = await reportActor();
    if (response) return response;
    const parsed = reportFiltersSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Filtros inválidos." }, { status: 400, headers: REPORT_RESPONSE_HEADERS });
    const report = await readReport(parsed.data, actor);
    if (!report.rows.length) return NextResponse.json({ empty: true, undatedHistoryCount: report.undatedHistoryCount || 0, incompleteCount: report.incompleteCount || 0 }, { headers: REPORT_RESPONSE_HEADERS });
    const pdf = await renderReportPdf(report);
    const filename = `${parsed.data.type === "pars" ? "par-por-cliente" : "horas-por-tecnico"}-${report.generatedAt.replace(/[:.]/g, "-")}.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...REPORT_RESPONSE_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(pdf.byteLength),
        "X-Report-Generated-At": report.generatedAt,
        "X-Report-Rows": String(report.rows.length),
        "X-Report-History": String(report.undatedHistoryCount || 0),
        "X-Report-Incomplete": String(report.incompleteCount || 0),
      },
    });
  } catch (error) { return reportApiError(error); }
}
