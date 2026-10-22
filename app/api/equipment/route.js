import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import * as equipmentRepo from "@/lib/repositories/equipment.repository";
import { equipmentSchema } from "@/lib/validators";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const clientId = searchParams.get("clientId") || undefined;
    const plantId = searchParams.get("plantId") || undefined;

    const equipment = await equipmentRepo.findAll({ status, search, clientId, plantId });
    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error al listar equipos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

async function clientAndPlantExist(clientId, plantId) {
  const { rows } = await query(
    `SELECT 1 FROM client c
     LEFT JOIN plant p ON p.client_id = c.id AND p.id = $2
     WHERE c.id = $1 AND c.status = '1' AND ($2::uuid IS NULL OR p.id IS NOT NULL)`,
    [clientId, plantId || null]
  );
  return rows.length > 0;
}

export async function POST(request) {
  try {
    const parsed = equipmentSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    const { name, brand, model, serial, clientId, plantId, location, consortium, hp, pressure, status } = parsed.data;

    const exists = await clientAndPlantExist(clientId, plantId);
    if (!exists) {
      return NextResponse.json({ error: "El cliente no existe o la planta no le pertenece." }, { status: 400 });
    }

    const equipment = await equipmentRepo.create({
      name,
      brand,
      model,
      serial,
      clientId,
      plantId,
      location,
      consortium,
      hp,
      pressure,
      status,
    });

    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    console.error("Error al crear equipo:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ya existe un equipo con ese serial" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
