import { laborErrorResponse } from "@/lib/service-order-errors";
import { NextResponse } from "next/server";
import * as ordersRepo from "@/lib/repositories/service-order.repository";
import { serviceOrderUpdateSchema } from "@/lib/validators";
import { auth } from "@/auth";
import { canApproveServiceOrder } from "@/lib/service-order-policy";

function parLinkErrorResponse(error) {
  const laborError = laborErrorResponse(error);
  if (laborError) return laborError;
  if (error.code === "PAR_NOT_FOUND") {
    return NextResponse.json({ error: "PAR no encontrado" }, { status: 404 });
  }
  if (error.code === "PAR_NOT_APPROVED") {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (["ORDER_PAR_IMMUTABLE", "ORDER_STATUS_INVALID", "ORDER_TECHNICIANS_INVALID", "ORDER_LOCKED", "ORDER_APPROVAL_INVALID"].includes(error.code)) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error.code === "ORDER_SCHEDULE_CONFLICT") {
    return NextResponse.json({ error: error.message, code: error.code, conflicts: error.conflicts }, { status: 409 });
  }
  if (error.code === "ORDER_APPROVAL_FORBIDDEN") {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const order = await ordersRepo.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error("Error al obtener orden:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    const { id } = await params;
    const parsed = serviceOrderUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    const canApprove = canApproveServiceOrder(session.user.role);
    const order = await ordersRepo.update(id, parsed.data, { userId: session.user.id, canApprove });
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error("Error al actualizar orden:", error);
    const parError = parLinkErrorResponse(error);
    if (parError) return parError;
    if (error.code === "ORDER_RELATION_INVALID") return NextResponse.json({ error: error.message }, { status: 400 });
    if (error.code === "23505") return NextResponse.json({ error: "Ya existe una orden con ese código." }, { status: 409 });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    const { id } = await params;
    const order = await ordersRepo.updateStatus(id, "Cancelada", { userId: session.user.id, canApprove: false });
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ message: "Orden cancelada" });
  } catch (error) {
    console.error("Error al cancelar orden:", error);
    const orderError = parLinkErrorResponse(error);
    if (orderError) return orderError;
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
