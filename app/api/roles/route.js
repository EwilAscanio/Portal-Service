import { NextResponse } from "next/server";
import { findAllRoles } from "@/lib/repositories/user.repository";

export async function GET() {
  try {
    const roles = await findAllRoles();
    return NextResponse.json(roles);
  } catch (error) {
    console.error("[GET /api/roles]", error);
    return NextResponse.json({ error: "Error al cargar roles." }, { status: 500 });
  }
}
