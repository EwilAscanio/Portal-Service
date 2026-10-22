import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { executeRows } from "@/lib/import/executor";
import { isSuperAdmin } from "@/lib/permissions";
import { findBatch, markBatchFailed, runBatchImport } from "@/lib/repositories/data-import.repository";

export async function POST(_request, { params }) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (!isSuperAdmin(session.user.role)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const batch = await findBatch(id, session.user.id);
    if (!batch) return NextResponse.json({ error: "Importación no encontrada." }, { status: 404 });
    if (batch.error_count > 0) return NextResponse.json({ error: "Corrige los errores antes de confirmar la importación." }, { status: 409 });
    if (batch.status !== "Validado") return NextResponse.json({ error: "Esta importación ya fue procesada." }, { status: 409 });
    const result = await runBatchImport(id, (client) => executeRows(client, id));
    if (!result) return NextResponse.json({ error: "La importación ya no está disponible para confirmar." }, { status: 409 });
    return NextResponse.json({ ...result, message: "La importación se completó correctamente." });
  } catch (error) {
    await markBatchFailed(id).catch(() => {});
    console.error("[POST /api/import/:id/commit]", error);
    return NextResponse.json({ error: "La importación falló y todos los cambios fueron revertidos." }, { status: 500 });
  }
}
