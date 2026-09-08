import { NextResponse } from "next/server";
import * as equipmentRepo from "@/lib/repositories/equipment.repository";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const equipment = await equipmentRepo.findById(id);
    if (!equipment) {
      return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
    }
    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error al obtener equipo:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const current = await equipmentRepo.findById(id);
    if (!current) {
      return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
    }
    if (body.clientId && body.clientId !== current.client_id) {
      const refs = await equipmentRepo.findParRefs(id);
      if (refs.length > 0) {
        const lista = refs
          .map((ref) => `PAR-${ref.par_number} (${ref.status})`)
          .join(", ");
        return NextResponse.json(
          {
            error: `No se puede cambiar el cliente: el equipo está asociado a PAR(s): ${lista}. Elimina o termina el vínculo antes de reasignarlo.`,
          },
          { status: 409 }
        );
      }
    }
    const equipment = await equipmentRepo.update(id, body);
    if (!equipment) {
      return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
    }
    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error al actualizar equipo:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ya existe un equipo con ese serial" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const equipment = await equipmentRepo.updateStatus(id, "Fuera de Servicio");
    if (!equipment) {
      return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ message: "Equipo dado de baja" });
  } catch (error) {
    console.error("Error al eliminar equipo:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
