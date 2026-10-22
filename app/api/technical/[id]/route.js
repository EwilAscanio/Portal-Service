import { NextResponse } from "next/server";
import {
  findById,
  update,
  setStatus,
  existsByCedula,
} from "@/lib/repositories/technical.repository";
import { technicalSchema } from "@/lib/validators";

export async function GET(_request, { params }) {
  const { id } = await params;
  const technician = await findById(id);
  if (!technician) {
    return NextResponse.json({ error: "Técnico no encontrado." }, { status: 404 });
  }
  return NextResponse.json(technician);
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const existing = await findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Técnico no encontrado." }, { status: 404 });
    }

    const parsed = technicalSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    const { cedula, name, phone, email, status, userId } = parsed.data;

    const taken = await existsByCedula(cedula.trim(), id);
    if (taken) {
      return NextResponse.json(
        { error: "La cédula ya está registrada." },
        { status: 409 }
      );
    }

    const updated = await update(id, {
      cedula,
      name,
      phone: phone || null,
      email: email || null,
      status,
      userId: userId || null,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error.code === "23505") return NextResponse.json({ error: "El usuario seleccionado ya está asociado a otro técnico." }, { status: 409 });
    return NextResponse.json({ error: "Error al actualizar el técnico." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const existing = await findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Técnico no encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus || !["Activo", "Inactivo"].includes(newStatus)) {
      return NextResponse.json(
        { error: "El estado debe ser 'Activo' o 'Inactivo'." },
        { status: 400 }
      );
    }

    const updated = await setStatus(id, newStatus);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/technicians]", error);
    return NextResponse.json({ error: "Error al cambiar el estado." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const existing = await findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Técnico no encontrado." }, { status: 404 });
    }

    const updated = await setStatus(id, "Inactivo");
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[DELETE /api/technicians]", error);
    return NextResponse.json({ error: "Error al eliminar el técnico." }, { status: 500 });
  }
}
