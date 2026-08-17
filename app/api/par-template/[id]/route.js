import { NextResponse } from "next/server";
import * as parTemplateRepo from "@/lib/repositories/par-template.repository";
import { parTemplateSchema } from "@/lib/validators";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const template = await parTemplateRepo.findById(Number(id));

    if (!template) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error al obtener plantilla de PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = parTemplateSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Datos de plantilla inválidos";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const updated = await parTemplateRepo.update(Number(id), parsed.data);

    if (!updated) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error al actualizar plantilla de PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const removed = await parTemplateRepo.remove(Number(id));

    if (!removed) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ message: "Plantilla eliminada" });
  } catch (error) {
    console.error("Error al eliminar plantilla de PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
