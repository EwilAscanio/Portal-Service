import { NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { syncBatch } from "@/lib/repositories/client-visit.repository";
import { mobileSyncSchema } from "@/lib/validators/mobile.schema";

const PRIVATE = { "Cache-Control": "private, no-store" };

function syncError(error) {
  const known = {
    PROSPECT_NOT_FOUND: 400,
    CLIENT_NOT_FOUND: 400,
    PLANT_INVALID: 400,
  };
  if (known[error.code]) return NextResponse.json({ error: error.message }, { status: known[error.code], headers: PRIVATE });
  if (error.code === "23514" || error.code === "23503") {
    return NextResponse.json({ error: "Los datos no cumplen las reglas de la visita." }, { status: 400, headers: PRIVATE });
  }
  return null;
}

export async function POST(request) {
  try {
    const authResult = await requireMobileUser(request);
    if (authResult.response) return authResult.response;
    const body = await request.json().catch(() => null);
    const parsed = mobileSyncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400, headers: PRIVATE });
    }
    const result = await syncBatch(authResult.user, parsed.data);
    return NextResponse.json(result, { headers: PRIVATE });
  } catch (error) {
    const response = syncError(error);
    if (response) return response;
    console.error("[POST /api/mobile/sync]", error);
    return NextResponse.json({ error: "Error al sincronizar el lote." }, { status: 500, headers: PRIVATE });
  }
}
