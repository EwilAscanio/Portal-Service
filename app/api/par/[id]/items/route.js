import { NextResponse } from "next/server";
import * as parRepo from "@/lib/repositories/par.repository";
import { parItemSchema } from "@/lib/validators";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = parItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const itemId = await parRepo.addItem(Number(id), parsed.data);
    const item = await parRepo.findItemById(itemId);

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error al agregar ítem al PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
