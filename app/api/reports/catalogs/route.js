import { NextResponse } from "next/server";
import { getReportCatalogs } from "@/lib/repositories/report.repository";
import { REPORT_RESPONSE_HEADERS, reportActor, reportApiError } from "@/lib/reports/api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { response } = await reportActor();
    if (response) return response;
    return NextResponse.json(await getReportCatalogs(), { headers: REPORT_RESPONSE_HEADERS });
  } catch (error) { return reportApiError(error); }
}
