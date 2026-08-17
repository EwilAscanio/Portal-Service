import { NextResponse } from "next/server";
import { fetchEstadosFromSaint } from "@/lib/saint-api";
import { findAllStates, upsertState } from "@/lib/repositories/location.repository";

export async function GET() {
  try {
    const estados = await findAllStates();
    return NextResponse.json(estados);
  } catch (error) {
    console.error("[GET /api/ubicaciones/estados]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const saintEstados = await fetchEstadosFromSaint();
    const count = await upsertState(saintEstados);
    return NextResponse.json({ message: `Se sincronizaron ${count} estados.`, count });
  } catch (error) {
    console.error("[POST /api/ubicaciones/estados]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
