import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isSuperAdmin } from "@/lib/permissions";
import { listBatches } from "@/lib/repositories/data-import.repository";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (!isSuperAdmin(session.user.role)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    return NextResponse.json(await listBatches());
  } catch (error) {
    console.error("[GET /api/import]", error);
    return NextResponse.json({ error: "No se pudo cargar el historial de importaciones." }, { status: 500 });
  }
}
