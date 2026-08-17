import { NextResponse } from "next/server";
import * as parTemplateRepo from "@/lib/repositories/par-template.repository";
import { parTemplateSchema } from "@/lib/validators";

export async function GET() {
  try {
    const templates = await parTemplateRepo.findAll();
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error al listar plantillas de PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = parTemplateSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Datos de plantilla inválidos";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const template = await parTemplateRepo.create(parsed.data);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error al crear plantilla de PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
