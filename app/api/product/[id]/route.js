import { NextResponse } from "next/server";
import {
  findById,
  update,
  setStatus,
  existsByCode,
} from "@/lib/repositories/product.repository";
import { productSchema } from "@/lib/validators";

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

    const parsed = productSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    const { code, description, brand, serial, modelo, cost, price, category, stock, status, requiresTechnician } = parsed.data;

    if ((requiresTechnician ?? existing.requires_technician) && category !== "Servicio") return NextResponse.json({ error: "Solo los servicios pueden requerir técnico." }, { status: 400 });
    const taken = await existsByCode({ code: code.trim(), excludeId: id });
    if (taken) {
      return NextResponse.json(
        { error: "El código ya está registrado." },
        { status: 409 }
      );
    }

    const updated = await update(id, {
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
