import { NextResponse } from "next/server";
import * as contactRepo from "@/lib/repositories/contact.repository";
import { contactSchema } from "@/lib/validators";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const contacts = await contactRepo.findAll({
      clientId: searchParams.get("clientId") || undefined,
      plantId: searchParams.get("plantId") || undefined,
      search: searchParams.get("search") || undefined,
    });
    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error al listar contactos:", error);
    return NextResponse.json({ error: "No se pudieron cargar los contactos." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const parsed = contactSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos invalidos" }, { status: 400 });
    return NextResponse.json(await contactRepo.create(parsed.data), { status: 201 });
  } catch (error) {
    console.error("Error al crear contacto:", error);
    if (error.code === "CONTACT_RELATION_INVALID") return NextResponse.json({ error: error.message }, { status: 400 });
    if (error.code === "23503") return NextResponse.json({ error: "El cliente o la planta no existe." }, { status: 400 });
    return NextResponse.json({ error: "No se pudo crear el contacto." }, { status: 500 });
  }
}
