import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isSuperAdmin } from "@/lib/permissions";
import { createTemplateWorkbook } from "@/lib/import/workbook";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (!isSuperAdmin(session.user.role)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const buffer = await createTemplateWorkbook();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="plantilla-importacion-maquitech.xlsx"',
      },
    });
  } catch (error) {
    console.error("[GET /api/import/template]", error);
    return NextResponse.json({ error: "No se pudo generar la plantilla." }, { status: 500 });
  }
}
