import { NextResponse } from "next/server";
import { fetchPaisesFromSaint } from "@/lib/saint-api";
import { findAllCountries, upsertCountry } from "@/lib/repositories/location.repository";

export async function GET() {
  try {
    const paises = await findAllCountries();
    return NextResponse.json(paises);
  } catch (error) {
    console.error("[GET /api/ubicaciones/paises]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const saintPaises = await fetchPaisesFromSaint();
    const count = await upsertCountry(saintPaises);
    return NextResponse.json({ message: `Se sincronizaron ${count} países.`, count });
  } catch (error) {
    console.error("[POST /api/ubicaciones/paises]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
