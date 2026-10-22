import { NextResponse } from "next/server";
import { auth } from "@/auth";
import * as parRepo from "@/lib/repositories/par.repository";
import { parEquipmentSchema } from "@/lib/validators";
import { getParErrorResponse } from "@/lib/par-errors";

export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();

    const parsed = parEquipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const equipmentId = await parRepo.addEquipment(Number(id), parsed.data, { role: session.user.role });
    const equipment = await parRepo.findEquipmentById(equipmentId);

    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    console.error("Error al agregar equipo al PAR:", error);
    const parError = getParErrorResponse(error);
    if (parError) return NextResponse.json({ error: parError.error }, { status: parError.status });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
