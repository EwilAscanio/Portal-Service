import { NextResponse } from "next/server";
import { fetchCiudadesFromSaint } from "@/lib/saint-api";
import { findAllCities, upsertCity } from "@/lib/repositories/location.repository";

export async function GET() {
  try {
    const ciudades = await findAllCities();
    return NextResponse.json(ciudades);
  } catch (error) {
    console.error("[GET /api/ubicaciones/ciudades]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const saintCiudades = await fetchCiudadesFromSaint();
    const count = await upsertCity(saintCiudades);
    return NextResponse.json({ message: `Se sincronizaron ${count} ciudades.`, count });
  } catch (error) {
    console.error("[POST /api/ubicaciones/ciudades]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
