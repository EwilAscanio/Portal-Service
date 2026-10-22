import { NextResponse } from "next/server";
import * as equipmentRepo from "@/lib/repositories/equipment.repository";
import { equipmentSchema } from "@/lib/validators";
import { query } from "@/lib/db";

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
    const parsed = equipmentSchema.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    const validatedBody = parsed.data;
    const current = await equipmentRepo.findById(id);
    if (!current) {
      return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
    }
    const nextClientId = validatedBody.clientId ?? current.client_id;
    const nextPlantId = validatedBody.plantId !== undefined ? validatedBody.plantId : current.plant_id;
    if (nextPlantId) {
      const { rows } = await query("SELECT 1 FROM plant p JOIN client c ON c.id = p.client_id WHERE p.id = $1 AND p.client_id = $2 AND c.status = '1'", [nextPlantId, nextClientId]);
      if (!rows.length) {
        return NextResponse.json({ error: "La planta no pertenece al cliente seleccionado." }, { status: 400 });
      }
    }
    if (validatedBody.clientId && validatedBody.clientId !== current.client_id) {
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
    const equipment = await equipmentRepo.update(id, validatedBody);
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
