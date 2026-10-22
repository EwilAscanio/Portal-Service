import { NextResponse } from "next/server";
import { findFirst } from "@/lib/repositories/configuration.repository";

export async function GET() {
  try {
    const configuration = await findFirst();
    if (!configuration) {
      return NextResponse.json({ error: "Configuración no encontrada." }, { status: 404 });
    }
    return NextResponse.json({ exchange_rate: configuration.exchange_rate });
  } catch (error) {
    console.error("[GET /api/configuration/exchange-rate]", error);
    return NextResponse.json({ error: "Error al cargar la tasa de cambio." }, { status: 500 });
  }
}
