import { NextResponse } from "next/server";
import * as equipmentRepo from "@/lib/repositories/equipment.repository";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const equipment = await equipmentRepo.findAll({ status, search });
    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error al listar equipos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, brand, model, serial, clientDescription, location, status, lastMaintenance, nextMaintenance } = body;

    if (!name || !brand || !model || !serial) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const equipment = await equipmentRepo.create({
      name,
      brand,
      model,
      serial,
      clientDescription,
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
