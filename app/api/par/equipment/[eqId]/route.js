import { NextResponse } from "next/server";
import * as parRepo from "@/lib/repositories/par.repository";
import { parEquipmentSchema } from "@/lib/validators";

export async function PUT(request, { params }) {
  try {
    const { eqId } = await params;
    const existing = await parRepo.findEquipmentById(Number(eqId));

    if (!existing) {
      return NextResponse.json({ error: "Equipo del PAR no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = parEquipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    await parRepo.updateEquipment(Number(eqId), parsed.data);
    const equipment = await parRepo.findEquipmentById(Number(eqId));

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error al actualizar equipo del PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { eqId } = await params;
    const removed = await parRepo.removeEquipment(Number(eqId));

    if (!removed) {
      return NextResponse.json({ error: "Equipo del PAR no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ message: "Equipo del PAR eliminado" });
  } catch (error) {
    console.error("Error al eliminar equipo del PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
