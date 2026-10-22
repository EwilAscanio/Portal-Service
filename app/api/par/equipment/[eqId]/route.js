import { NextResponse } from "next/server";
import { auth } from "@/auth";
import * as parRepo from "@/lib/repositories/par.repository";
import { parEquipmentSchema } from "@/lib/validators";
import { getParErrorResponse } from "@/lib/par-errors";

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
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

    const parId = await parRepo.updateEquipment(Number(eqId), parsed.data, { role: session.user.role });
    if (!parId) {
      return NextResponse.json({ error: "Equipo del PAR no encontrado" }, { status: 404 });
    }
    const equipment = await parRepo.findEquipmentById(Number(eqId));

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error al actualizar equipo del PAR:", error);
    const parError = getParErrorResponse(error);
    if (parError) return NextResponse.json({ error: parError.error }, { status: parError.status });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const { eqId } = await params;
    const removed = await parRepo.removeEquipment(Number(eqId), { role: session.user.role });

    if (!removed) {
      return NextResponse.json({ error: "Equipo del PAR no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ message: "Equipo del PAR eliminado" });
  } catch (error) {
    console.error("Error al eliminar equipo del PAR:", error);
    const parError = getParErrorResponse(error);
    if (parError) return NextResponse.json({ error: parError.error }, { status: parError.status });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
