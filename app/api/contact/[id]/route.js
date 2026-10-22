import { NextResponse } from "next/server";
import * as contactRepo from "@/lib/repositories/contact.repository";
import { contactSchema } from "@/lib/validators";

export async function GET(_request, { params }) {
  const { id } = await params;
  const contact = await contactRepo.findById(id);
  return contact
    ? NextResponse.json(contact)
    : NextResponse.json({ error: "Contacto no encontrado." }, { status: 404 });
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const parsed = contactSchema.partial().safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos invalidos" }, { status: 400 });
    const contact = await contactRepo.update(id, parsed.data);
    return contact
      ? NextResponse.json(contact)
      : NextResponse.json({ error: "Contacto no encontrado." }, { status: 404 });
  } catch (error) {
    if (error.code === "CONTACT_RELATION_INVALID") return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "No se pudo actualizar el contacto." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const removed = await contactRepo.remove(id);
    return removed
      ? NextResponse.json({ message: "Contacto eliminado." })
      : NextResponse.json({ error: "Contacto no encontrado." }, { status: 404 });
  } catch (error) {
    if (error.code === "23503") return NextResponse.json({ error: "El contacto esta asociado a una orden y no se puede eliminar." }, { status: 409 });
    return NextResponse.json({ error: "No se pudo eliminar el contacto." }, { status: 500 });
  }
}
