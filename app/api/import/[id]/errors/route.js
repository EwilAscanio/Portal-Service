import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createErrorsWorkbook } from "@/lib/import/workbook";
import { isSuperAdmin } from "@/lib/permissions";
import { findBatch, findRows } from "@/lib/repositories/data-import.repository";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (!isSuperAdmin(session.user.role)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const { id } = await params;
    const batch = await findBatch(id);
    if (!batch) return NextResponse.json({ error: "Importación no encontrada." }, { status: 404 });
    const rows = await findRows(id, { errorsOnly: true });
    if (!rows.length) return NextResponse.json({ error: "La importación no contiene errores." }, { status: 404 });
    const buffer = await createErrorsWorkbook(batch, rows);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="errores-importacion-${id}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/import/:id/errors]", error);
    return NextResponse.json({ error: "No se pudo generar el archivo de errores." }, { status: 500 });
  }
}
