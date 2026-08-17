import { NextResponse } from "next/server";
import * as ordersRepo from "@/lib/repositories/service-order.repository";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const search = searchParams.get("search") || undefined;

    const orders = await ordersRepo.findAll({ status, priority, search });
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error al listar órdenes:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderCode, clientDescription, equipmentName, type, technicianName, priority, status, scheduledDate, amount, parId } = body;

    if (!orderCode || !clientDescription || !equipmentName || !type || !technicianName) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const order = await ordersRepo.create({
      orderCode,
      clientDescription,
      equipmentName,
      type,
      technicianName,
      priority,
      status,
      scheduledDate,
      amount,
      parId,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error al crear orden:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
