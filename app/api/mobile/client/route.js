import { NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { listForMobile } from "@/lib/repositories/client.repository";
import { readUpdatedSince } from "@/lib/mobile-query";

const PRIVATE = { "Cache-Control": "private, no-store" };

export async function GET(request) {
  try {
    const authResult = await requireMobileUser(request);
    if (authResult.response) return authResult.response;
    const cursor = readUpdatedSince(request);
    if (cursor.response) return cursor.response;
    const clients = await listForMobile(cursor.updatedSince);
    return NextResponse.json(clients, { headers: PRIVATE });
  } catch (error) {
    console.error("[GET /api/mobile/client]", error);
    return NextResponse.json({ error: "Error al descargar clientes." }, { status: 500, headers: PRIVATE });
  }
}
