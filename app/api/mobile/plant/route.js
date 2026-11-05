import { NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { listForMobile } from "@/lib/repositories/plant.repository";
import { readUpdatedSince } from "@/lib/mobile-query";

const PRIVATE = { "Cache-Control": "private, no-store" };

export async function GET(request) {
  try {
    const authResult = await requireMobileUser(request);
    if (authResult.response) return authResult.response;
    const cursor = readUpdatedSince(request);
    if (cursor.response) return cursor.response;
    const plants = await listForMobile(cursor.updatedSince);
    return NextResponse.json(plants, { headers: PRIVATE });
  } catch (error) {
    console.error("[GET /api/mobile/plant]", error);
    return NextResponse.json({ error: "Error al descargar plantas." }, { status: 500, headers: PRIVATE });
  }
}
