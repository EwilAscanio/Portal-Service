import { NextResponse } from "next/server";
import { auth } from "@/auth";
import * as parRepo from "@/lib/repositories/par.repository";
import { parHeaderSchema, parSearchSchema } from "@/lib/validators";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parSearchSchema.safeParse({
      status: searchParams.get("status") || undefined,
      clientId: searchParams.get("clientId") || undefined,
      search: searchParams.get("search") || undefined,
    });

    const rows = await parRepo.findAll(parsed.success ? parsed.data : {});
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al listar PARs:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = parHeaderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    parsed.data.elaboradoPor = session.user.name || session.user.login;

    const parId = await parRepo.create(parsed.data, session.user.id);
    const header = await parRepo.findById(parId);

    return NextResponse.json(header, { status: 201 });
  } catch (error) {
    console.error("Error al crear PAR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
