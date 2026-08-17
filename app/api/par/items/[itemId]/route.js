import { NextResponse } from "next/server";
import * as parRepo from "@/lib/repositories/par.repository";
import { parItemSchema } from "@/lib/validators";

export async function PUT(request, { params }) {
  try {
    const { itemId } = await params;
    const existing = await parRepo.findItemById(Number(itemId));

    if (!existing) {
      return NextResponse.json({ error: "Ítem del PAR no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = parItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    await parRepo.updateItem(Number(itemId), parsed.data);
    const item = await parRepo.findItemById(Number(itemId));

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error al actualizar ítem del PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { itemId } = await params;
    const removed = await parRepo.removeItem(Number(itemId));

    if (!removed) {
      return NextResponse.json({ error: "Ítem del PAR no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ message: "Ítem del PAR eliminado" });
  } catch (error) {
    console.error("Error al eliminar ítem del PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
