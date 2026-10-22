import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CLOSURE_READ_ROLES, canManageClosure } from "@/lib/service-order-closure";
import { closureErrorResponse } from "@/lib/service-order-errors";

export async function closureActor(write = false) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "Activo") return { response: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  const actor = { userId: session.user.id, role: session.user.role };
  if (!(write ? canManageClosure(actor.role) : CLOSURE_READ_ROLES.includes(actor.role))) return { response: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  return { actor };
}
export function closureApiError(error) {
  const response = closureErrorResponse(error);
  if (response) return response;
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  console.error("Error en expediente de cierre:", error);
  return NextResponse.json({ error: "No se pudo procesar el expediente de cierre." }, { status: 500 });
}
export function validOrderId(id) {
  return /^\d+$/.test(id) && Number(id) > 0 && Number(id) <= 2147483647;
}
