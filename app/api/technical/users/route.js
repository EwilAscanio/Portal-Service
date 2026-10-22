import { NextResponse } from "next/server";
import { findAssignableUsers } from "@/lib/repositories/technical.repository";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    return NextResponse.json(await findAssignableUsers(searchParams.get("technicalId") || null));
  } catch (error) {
    if (error.code === "22P02") return NextResponse.json({ error: "Técnico no válido." }, { status: 400 });
    console.error("[GET /api/technical/users]", error);
    return NextResponse.json({ error: "No se pudieron cargar los usuarios técnicos." }, { status: 500 });
  }
}
