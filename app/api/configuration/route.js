import { NextResponse } from "next/server";
import {
  findFirst,
  update,
} from "@/lib/repositories/configuration.repository";

export async function GET() {
  try {
    const config = await findFirst();
    if (!config) {
      return NextResponse.json({ error: "Configuración no encontrada." }, { status: 404 });
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error("[GET /api/configuration]", error);
    return NextResponse.json({ error: "Error al cargar la configuración." }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { company_name } = body;

    if (!company_name?.trim() && body.exchange_rate == null) {
      return NextResponse.json(
        { error: "El nombre de la empresa o la tasa de cambio es obligatorio." },
        { status: 400 }
      );
    }

    const config = await update({
      company_name: company_name?.trim() || undefined,
      rif: body.rif?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      address: body.address?.trim() || null,
      website: body.website?.trim() || null,
      city: body.city?.trim() || null,
      country: body.country?.trim() || null,
      logo: body.logo?.trim() || "/logo.webp",
      facebook: body.facebook?.trim() || null,
      instagram: body.instagram?.trim() || null,
      linkedin: body.linkedin?.trim() || null,
      exchange_rate: body.exchange_rate != null ? Number(body.exchange_rate) : undefined,
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("[PUT /api/configuration]", error);
    return NextResponse.json({ error: "Error al guardar la configuración." }, { status: 500 });
  }
}
