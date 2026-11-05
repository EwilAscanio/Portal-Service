import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canManageUnavailability } from "@/lib/technician-unavailability";
import { schedulingErrorResponse } from "@/lib/scheduling-http";
import { laborErrorResponse } from "@/lib/service-order-errors";
import { readScheduleHistory, reschedule } from "@/lib/repositories/service-order.repository";

async function handle(request, context, write) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    if (!canManageUnavailability(session.user.role)) return NextResponse.json({ error: "No tiene permiso para gestionar reprogramaciones." }, { status: 403 });
    const { id } = await context.params;
    if (!/^\d+$/.test(id) || Number(id) < 1 || Number(id) > 2147483647) return NextResponse.json({ error: "Orden no válida." }, { status: 400 });
    const actor = { userId: session.user.id, role: session.user.role };
    return NextResponse.json(write ? await reschedule(Number(id), await request.json(), actor) : await readScheduleHistory(Number(id), actor), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const response = schedulingErrorResponse(error) || laborErrorResponse(error);
    if (response) return response;
    if (error.code === "ORDER_TECHNICIANS_INVALID" || error instanceof SyntaxError) return NextResponse.json({ error: error.code ? error.message : "Solicitud no válida." }, { status: 400 });
    console.error("Error de reprogramación:", error.code || error.name);
    return NextResponse.json({ error: "No se pudo procesar la programación." }, { status: 500 });
  }
}
export const GET = (request, context) => handle(request, context, false);
export const POST = (request, context) => handle(request, context, true);
