import { NextResponse } from "next/server";
import * as parRepo from "@/lib/repositories/par.repository";
import { parEquipmentSchema } from "@/lib/validators";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = parEquipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const equipmentId = await parRepo.addEquipment(Number(id), parsed.data);
    const equipment = await parRepo.findEquipmentById(equipmentId);

    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    console.error("Error al agregar equipo al PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
