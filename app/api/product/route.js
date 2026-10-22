import { NextResponse } from "next/server";
import { findAll, create, existsByCode } from "@/lib/repositories/product.repository";
import { productSchema } from "@/lib/validators";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    if (category && !["Servicio", "Repuestos", "Todos"].includes(category)) {
      return NextResponse.json({ error: "Categoría inválida." }, { status: 400 });
    }
    if (status && !["Activo", "Inactivo"].includes(status)) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }
    const products = await findAll({ category, status });
    return NextResponse.json(products);
  } catch (error) {
    console.error("[GET /api/productos]", error);
    return NextResponse.json({ error: "Error al cargar productos." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const parsed = productSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    const { code, description, brand, serial, modelo, cost, price, category, stock, status, requiresTechnician } = parsed.data;

    if (requiresTechnician && category !== "Servicio") return NextResponse.json({ error: "Solo los servicios pueden requerir técnico." }, { status: 400 });
    const taken = await existsByCode({ code: code.trim() });
    if (taken) {
      return NextResponse.json(
        { error: "El código ya está registrado." },
        { status: 409 }
      );
    }

    const product = await create({
      code,
      description,
      brand: brand || null,
      serial: serial || null,
      modelo: modelo || null,
      cost,
      price,
      category,
      requiresTechnician,
      stock,
      status,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("[POST /api/productos]", error);
    return NextResponse.json({ error: "Error al crear el producto." }, { status: 500 });
  }
}
