import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PAGE_PERMISSIONS, canAccessRole, rolesFor } from "@/lib/permissions";

export const REPORT_RESPONSE_HEADERS = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function reportActor() {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "Activo") return { response: NextResponse.json({ error: "No autenticado." }, { status: 401, headers: REPORT_RESPONSE_HEADERS }) };
  if (!canAccessRole(session.user.role, rolesFor("/reportes", PAGE_PERMISSIONS))) return { response: NextResponse.json({ error: "No autorizado." }, { status: 403, headers: REPORT_RESPONSE_HEADERS }) };
  return { actor: { id: session.user.id, name: session.user.name || "Usuario del sistema" } };
}

export function reportApiError(error) {
  const status = error.reportStatus || (error instanceof SyntaxError ? 400 : error.code === "57014" ? 422 : 500);
  const message = error.reportStatus ? error.message : status === 400 ? "Datos de reporte inválidos." : status === 422 ? "La consulta tardó demasiado. Reduce el período o selecciona un cliente o técnico." : "No se pudo generar el reporte. Intenta nuevamente.";
  if (status === 500) console.error("Error en reportes:", error);
  return NextResponse.json({ error: message }, { status, headers: REPORT_RESPONSE_HEADERS });
}
