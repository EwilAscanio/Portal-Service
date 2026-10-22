import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLaborBudget } from "@/lib/repositories/service-order-labor.repository";
import { query } from "@/lib/db";

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const parId = Number(params.get("parId"));
  const orderId = params.has("orderId") ? Number(params.get("orderId")) : null;
  if (!Number.isSafeInteger(parId) || parId <= 0 || (orderId !== null && (!Number.isSafeInteger(orderId) || orderId <= 0))) {
    return NextResponse.json({ error: "PAR u orden inválidos." }, { status: 400 });
  }
  try {
    if (orderId) {
      const { rows } = await query("SELECT 1 FROM service_order WHERE id = $1 AND par_id = $2", [orderId, parId]);
      if (!rows.length) return NextResponse.json({ error: "La orden no pertenece a este PAR." }, { status: 400 });
    }
    return NextResponse.json(await getLaborBudget(parId, orderId));
  } catch (error) {
    if (error.code === "PAR_NOT_FOUND") return NextResponse.json({ error: error.message }, { status: 404 });
    console.error("Error al consultar horas del PAR:", error);
    return NextResponse.json({ error: "No se pudo cargar el saldo de horas." }, { status: 500 });
  }
}
