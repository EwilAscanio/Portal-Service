import { laborErrorResponse } from "@/lib/service-order-errors";
import { NextResponse } from "next/server";
import * as ordersRepo from "@/lib/repositories/service-order.repository";
import { serviceOrderSchema } from "@/lib/validators";
import { auth } from "@/auth";

function parLinkErrorResponse(error) {
  const laborError = laborErrorResponse(error);
  if (laborError) return laborError;
  if (error.code === "PAR_NOT_FOUND") {
    return NextResponse.json({ error: "PAR no encontrado" }, { status: 404 });
  }
  if (error.code === "PAR_NOT_APPROVED") {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (["CLIENT_INACTIVE", "PAR_DESCRIPTION_REQUIRED", "PAR_EQUIPMENT_REQUIRED", "ORDER_TECHNICIANS_INVALID"].includes(error.code)) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const search = searchParams.get("search") || undefined;
    const clientId = searchParams.get("clientId") || undefined;
    const plantId = searchParams.get("plantId") || undefined;

    const orders = await ordersRepo.findAll({ status, priority, search, clientId, plantId });
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error al listar órdenes:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    const parsed = serviceOrderSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    const order = await ordersRepo.create(parsed.data, session.user.id);

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error al crear orden:", error);
    const parError = parLinkErrorResponse(error);
    if (parError) return parError;
    if (error.code === "ORDER_RELATION_INVALID") return NextResponse.json({ error: error.message }, { status: 400 });
    if (error.code === "23505") return NextResponse.json({ error: "Ya existe una orden con ese código." }, { status: 409 });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
