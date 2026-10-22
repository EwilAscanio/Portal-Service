import { NextResponse } from "next/server";
import { findAll, create, existsByCedula } from "@/lib/repositories/technical.repository";
import { technicalSchema } from "@/lib/validators";

export async function GET() {
  try {
    const technicians = await findAll();
    return NextResponse.json(technicians);
  } catch (error) {
    console.error("[GET /api/technicians]", error);
    return NextResponse.json({ error: "Error al cargar técnicos." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const parsed = technicalSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    const { cedula, name, phone, email, status, userId } = parsed.data;

    const taken = await existsByCedula(cedula.trim());
    if (taken) {
      return NextResponse.json(
        { error: "La cédula ya está registrada." },
        { status: 409 }
      );
    }

    const technician = await create({
      cedula,
      name,
      phone: phone || null,
      email: email || null,
      status,
      userId: userId || null,
    });

    return NextResponse.json(technician, { status: 201 });
  } catch (error) {
    console.error("[POST /api/technicians]", error);
    if (error.code === "23505") return NextResponse.json({ error: "El usuario seleccionado ya está asociado a otro técnico." }, { status: 409 });
    return NextResponse.json({ error: "Error al crear el técnico." }, { status: 500 });
  }
}
