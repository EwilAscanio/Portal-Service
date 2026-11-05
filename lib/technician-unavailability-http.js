import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { schedulingErrorResponse } from "@/lib/scheduling-http";
import { canReadUnavailability, canManageUnavailability } from "@/lib/technician-unavailability";

export async function unavailabilityRequest(context, manage, action) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    if (!(manage ? canManageUnavailability(session.user.role) : canReadUnavailability(session.user.role))) return NextResponse.json({ error: "No tiene permiso para esta acción." }, { status: 403 });
    const params = await context.params;
    if (!z.string().uuid().safeParse(params.id).success || (params.unavailabilityId && !z.string().uuid().safeParse(params.unavailabilityId).success)) return NextResponse.json({ error: "Identificador no válido." }, { status: 400 });
    return NextResponse.json(await action(params, { userId: session.user.id, role: session.user.role }), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const response = schedulingErrorResponse(error);
    if (response) return response;
    if (error instanceof SyntaxError || error.code === "22P02") return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
    console.error("Error en no disponibilidad:", error.code || error.name);
    return NextResponse.json({ error: "No se pudo procesar la solicitud de no disponibilidad." }, { status: 500 });
  }
}
