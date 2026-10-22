import { NextResponse } from "next/server";
import { auth } from "@/auth";
import * as parRepo from "@/lib/repositories/par.repository";
import { parItemSchema } from "@/lib/validators";
import { getParErrorResponse } from "@/lib/par-errors";

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
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

    const parId = await parRepo.updateItem(Number(itemId), parsed.data, { role: session.user.role });
    if (!parId) {
      return NextResponse.json({ error: "Ítem del PAR no encontrado" }, { status: 404 });
    }
    const item = await parRepo.findItemById(Number(itemId));

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error al actualizar ítem del PAR:", error);
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
    const { itemId } = await params;
    const removed = await parRepo.removeItem(Number(itemId), { role: session.user.role });

    if (!removed) {
      return NextResponse.json({ error: "Ítem del PAR no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ message: "Ítem del PAR eliminado" });
  } catch (error) {
    console.error("Error al eliminar ítem del PAR:", error);
    const parError = getParErrorResponse(error);
    if (parError) return NextResponse.json({ error: parError.error }, { status: parError.status });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
