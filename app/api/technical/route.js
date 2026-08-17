import { NextResponse } from "next/server";
import { findAll, create, existsByCedula } from "@/lib/repositories/technical.repository";

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
    const body = await request.json();
    const { cedula, name, phone, email, status } = body;

    if (!cedula?.trim() || !name?.trim()) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: cedula, name." },
        { status: 400 }
      );
    }

    const taken = await existsByCedula(cedula.trim());
    if (taken) {
      return NextResponse.json(
        { error: "La cédula ya está registrada." },
        { status: 409 }
      );
    }

    const technician = await create({
      cedula: cedula.trim(),
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      status: status || "Activo",
    });

    return NextResponse.json(technician, { status: 201 });
  } catch (error) {
    console.error("[POST /api/technicians]", error);
    return NextResponse.json({ error: "Error al crear el técnico." }, { status: 500 });
  }
}
