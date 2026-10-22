import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isSuperAdmin } from "@/lib/permissions";
import { analyzeRows } from "@/lib/import/analyzer";
import { ImportFileError, MAX_IMPORT_BYTES, parseWorkbook } from "@/lib/import/workbook";
import { createBatch } from "@/lib/repositories/data-import.repository";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (!isSuperAdmin(session.user.role)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") return NextResponse.json({ error: "Selecciona un archivo Excel." }, { status: 400 });
    if (!String(file.name).toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "Solo se permiten archivos .xlsx." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_IMPORT_BYTES) return NextResponse.json({ error: "El archivo debe pesar como máximo 5 MB." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const sourceRows = await parseWorkbook(buffer);
    const analysis = await analyzeRows(sourceRows);
    const batch = await createBatch({
      fileName: String(file.name).slice(0, 255),
      fileHash: createHash("sha256").update(buffer).digest("hex"),
      userId: session.user.id,
      summary: analysis.summary,
      rows: analysis.rows,
    });
    return NextResponse.json({ batch, ...analysis }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/import/preview]", error);
    if (error instanceof ImportFileError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (/reading 'comments'/.test(error?.message ?? "")) {
      return NextResponse.json(
        {
          error: "No se pudo leer el archivo porque contiene comentarios o notas que ExcelJS no puede procesar. Quita las notas del .xlsx (o descarga de nuevo la plantilla) e inténtalo otra vez.",
          detail: error.message,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "No se pudo analizar el archivo.", detail: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
