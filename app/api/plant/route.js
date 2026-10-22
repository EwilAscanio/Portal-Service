import { NextResponse } from "next/server";
import * as plantRepo from "@/lib/repositories/plant.repository";
import { plantSchema } from "@/lib/validators";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const plants = await plantRepo.findAll({
      clientId: searchParams.get("clientId") || undefined,
      search: searchParams.get("search") || undefined,
    });
    return NextResponse.json(plants);
  } catch (error) {
    console.error("Error al listar plantas:", error);
    return NextResponse.json({ error: "No se pudieron cargar las plantas." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const parsed = plantSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos invalidos" }, { status: 400 });
    }
    return NextResponse.json(await plantRepo.create(parsed.data), { status: 201 });
  } catch (error) {
    console.error("Error al crear planta:", error);
    if (error.code === "23505") return NextResponse.json({ error: error.constraint === "plant_client_code_uidx" ? "Ya existe una planta con ese código para el cliente." : "Ya existe una planta con ese nombre para el cliente." }, { status: 409 });
    if (error.code === "23503") return NextResponse.json({ error: "El cliente seleccionado no existe." }, { status: 400 });
    if (error.code === "CLIENT_INACTIVE") return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "No se pudo crear la planta." }, { status: 500 });
  }
}
