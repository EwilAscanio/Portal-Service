import { NextResponse } from "next/server";
import { findAll } from "@/lib/repositories/client.repository";

export async function GET() {
  try {
    const clients = await findAll();
    return NextResponse.json(clients);
  } catch (error) {
    console.error("[GET /api/clients]", error);
    return NextResponse.json({ error: "Error al cargar clientes." }, { status: 500 });
  }
}
