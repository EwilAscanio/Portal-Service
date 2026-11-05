import { NextResponse } from "next/server";
import { findAll } from "@/lib/repositories/vendor.repository";

export async function GET() {
  try {
    const vendors = await findAll();
    return NextResponse.json(vendors);
  } catch (error) {
    console.error("[GET /api/vendor]", error);
    return NextResponse.json({ error: "Error al cargar vendedores." }, { status: 500 });
  }
}
