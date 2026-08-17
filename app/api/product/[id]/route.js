import { NextResponse } from "next/server";
import {
  findById,
  update,
  setStatus,
  existsByCode,
} from "@/lib/repositories/product.repository";

export async function GET(_request, { params }) {
  const { id } = await params;
  const product = await findById(id);
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
  }
  return NextResponse.json(product);
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const existing = await findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

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

    const taken = await existsByCode({ code: code.trim(), excludeId: id });
    if (taken) {
      return NextResponse.json(
        { error: "El código ya está registrado." },
        { status: 409 }
      );
    }

    const updated = await update(id, {
      code: code.trim(),
      description: description.trim(),
      type: type.trim(),
      brand: brand?.trim() || null,
      serial: serial?.trim() || null,
      modelo: modelo?.trim() || null,
      cost: Number(cost),
      price: Number(price),
      category: category.trim(),
      stock: stock != null ? Number(stock) : existing.stock,
      status: status || existing.status,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/productos]", error);
    return NextResponse.json({ error: "Error al actualizar el producto." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const existing = await findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus || !["Activo", "Inactivo"].includes(newStatus)) {
      return NextResponse.json(
        { error: "El estado debe ser 'Activo' o 'Inactivo'." },
        { status: 400 }
      );
    }

    const updated = await setStatus(id, newStatus);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/productos]", error);
    return NextResponse.json({ error: "Error al cambiar el estado." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const existing = await findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    const updated = await setStatus(id, "Inactivo");
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[DELETE /api/productos]", error);
    return NextResponse.json({ error: "Error al eliminar el producto." }, { status: 500 });
  }
}
