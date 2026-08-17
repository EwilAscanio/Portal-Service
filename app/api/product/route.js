import { NextResponse } from "next/server";
import { findAll, create, existsByCode } from "@/lib/repositories/product.repository";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const products = await findAll(category);
    return NextResponse.json(products);
  } catch (error) {
    console.error("[GET /api/productos]", error);
    return NextResponse.json({ error: "Error al cargar productos." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, description, type, brand, serial, modelo, cost, price, category, stock, status } = body;

    if (!code?.trim() || !description?.trim() || !type?.trim() || cost == null || price == null || !category?.trim()) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: code, description, type, cost, price, category." },
        { status: 400 }
      );
    }

    if (Number(cost) < 0 || Number(price) < 0) {
      return NextResponse.json(
        { error: "El costo y el precio no pueden ser negativos." },
        { status: 400 }
      );
    }

    if (stock != null && Number(stock) < 0) {
      return NextResponse.json(
        { error: "La existencia no puede ser negativa." },
        { status: 400 }
      );
    }

    const taken = await existsByCode({ code: code.trim() });
    if (taken) {
      return NextResponse.json(
        { error: "El código ya está registrado." },
        { status: 409 }
      );
    }

    const product = await create({
      code: code.trim(),
      description: description.trim(),
      type: type.trim(),
      brand: brand?.trim() || null,
      serial: serial?.trim() || null,
      modelo: modelo?.trim() || null,
      cost: Number(cost),
      price: Number(price),
      category: category.trim(),
      stock: stock != null ? Number(stock) : 0,
      status: status || "Activo",
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("[POST /api/productos]", error);
    return NextResponse.json({ error: "Error al crear el producto." }, { status: 500 });
  }
}
