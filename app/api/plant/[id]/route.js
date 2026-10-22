import { NextResponse } from "next/server";
import * as plantRepo from "@/lib/repositories/plant.repository";
import { plantSchema } from "@/lib/validators";

export async function GET(_request, { params }) {
  const { id } = await params;
  const plant = await plantRepo.findById(id);
  return plant
    ? NextResponse.json(plant)
    : NextResponse.json({ error: "Planta no encontrada." }, { status: 404 });
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const parsed = plantSchema.partial().safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos invalidos" }, { status: 400 });
    const plant = await plantRepo.update(id, parsed.data);
    return plant
      ? NextResponse.json(plant)
      : NextResponse.json({ error: "Planta no encontrada." }, { status: 404 });
  } catch (error) {
    if (error.code === "23505") return NextResponse.json({ error: error.constraint === "plant_client_code_uidx" ? "Ya existe una planta con ese código para el cliente." : "Ya existe una planta con ese nombre para el cliente." }, { status: 409 });
    if (error.code === "23503") return NextResponse.json({ error: "El cliente seleccionado no existe." }, { status: 400 });
    if (error.code === "CLIENT_INACTIVE") return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "No se pudo actualizar la planta." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const removed = await plantRepo.remove(id);
    return removed
      ? NextResponse.json({ message: "Planta eliminada." })
      : NextResponse.json({ error: "Planta no encontrada." }, { status: 404 });
  } catch (error) {
    if (error.code === "23503") return NextResponse.json({ error: "La planta esta siendo utilizada y no se puede eliminar." }, { status: 409 });
    return NextResponse.json({ error: "No se pudo eliminar la planta." }, { status: 500 });
  }
}
