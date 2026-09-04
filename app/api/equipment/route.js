import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import * as equipmentRepo from "@/lib/repositories/equipment.repository";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const clientId = searchParams.get("clientId") || undefined;

    const equipment = await equipmentRepo.findAll({ status, search, clientId });
    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error al listar equipos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

async function clientExists(clientId) {
  const { rows } = await query("SELECT 1 FROM client WHERE id = $1", [clientId]);
  return rows.length > 0;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, brand, model, serial, clientId, location, status, lastMaintenance, nextMaintenance } = body;

    if (!name || !brand || !model || !serial) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ error: "El cliente es obligatorio" }, { status: 400 });
    }

    const exists = await clientExists(clientId);
    if (!exists) {
      return NextResponse.json({ error: "El cliente seleccionado no existe" }, { status: 400 });
    }

    const equipment = await equipmentRepo.create({
      name,
      brand,
      model,
      serial,
      clientId,
      location,
      status,
      lastMaintenance,
      nextMaintenance,
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
