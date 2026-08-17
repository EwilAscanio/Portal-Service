import { NextResponse } from "next/server";
import { auth } from "@/auth";
import * as parRepo from "@/lib/repositories/par.repository";
import { parItemsUpdateSchema, parStatusSchema } from "@/lib/validators";

const MANUAL_STATUSES = ["Creado", "Aprobado", "Rechazado"];
const ITEM_EDITABLE_STATUSES = ["Creado", "Aprobado"];

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const header = await parRepo.findById(Number(id));

    if (!header) {
      return NextResponse.json({ error: "PAR no encontrado" }, { status: 404 });
    }

    return NextResponse.json(header);
  } catch (error) {
    console.error("Error al obtener PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const existing = await parRepo.findById(Number(id));

    if (!existing) {
      return NextResponse.json({ error: "PAR no encontrado" }, { status: 404 });
    }

    if (!ITEM_EDITABLE_STATUSES.includes(existing.status)) {
      return NextResponse.json(
        { error: "Solo se pueden editar los ítems de un PAR en estado Creado o Aprobado" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = parItemsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    await parRepo.update(Number(id), { items: parsed.data.items });
    const updated = await parRepo.findById(Number(id));
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error al actualizar PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await parRepo.findById(Number(id));

    if (!existing) {
      return NextResponse.json({ error: "PAR no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = parStatusSchema.safeParse(body);
    if (!parsed.success || !MANUAL_STATUSES.includes(parsed.data.status)) {
      return NextResponse.json(
        { error: "Solo se puede pasar manualmente a Creado, Aprobado o Rechazado" },
        { status: 400 }
      );
    }

    const { status } = parsed.data;

    if (status === existing.status) {
      return NextResponse.json(existing);
    }

    if (existing.status === "Creado" && status === "Aprobado") {
      const updated = await parRepo.updateStatus(Number(id), "Aprobado", {
        approvedBy: session.user.id,
        approvedAt: new Date().toISOString(),
      });
      return NextResponse.json(updated);
    }

    if (
      (existing.status === "Creado" && status === "Rechazado") ||
      (existing.status === "Aprobado" && status === "Rechazado")
    ) {
      const updated = await parRepo.updateStatus(Number(id), "Rechazado");
      return NextResponse.json(updated);
    }

    return NextResponse.json(
      { error: `Transición de ${existing.status} a ${status} no permitida` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error al actualizar estado del PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const existing = await parRepo.findById(Number(id));

    if (!existing) {
      return NextResponse.json({ error: "PAR no encontrado" }, { status: 404 });
    }

    if (existing.status !== "Creado") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar PAR en estado Creado" },
        { status: 403 }
      );
    }

    await parRepo.remove(Number(id));
    return NextResponse.json({ message: "PAR eliminado" });
  } catch (error) {
    console.error("Error al eliminar PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
