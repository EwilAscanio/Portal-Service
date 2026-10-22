import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findCalendarData } from "@/lib/repositories/technician-calendar.repository";

const VALID_STATUS = new Set(["Aprobada", "En Proceso", "Completada"]);
const VALID_PRIORITY = new Set(["Alta", "Media", "Baja"]);
const VALID_SERVICE_TYPE = new Set(["Inspection", "Maintenance", "Emergency", "Other"]);

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    if (!from || !to || to <= from) {
      return NextResponse.json({ error: "El rango de fechas del calendario no es válido." }, { status: 400 });
    }
    if (to.getTime() - from.getTime() > 370 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "El rango máximo permitido es de 370 días." }, { status: 400 });
    }

    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const serviceType = searchParams.get("serviceType") || undefined;
    if (status && !VALID_STATUS.has(status)) return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
    if (priority && !VALID_PRIORITY.has(priority)) return NextResponse.json({ error: "Prioridad no válida." }, { status: 400 });
    if (serviceType && !VALID_SERVICE_TYPE.has(serviceType)) return NextResponse.json({ error: "Tipo de servicio no válido." }, { status: 400 });

    return NextResponse.json(await findCalendarData({
      from: from.toISOString(), to: to.toISOString(),
      technicianId: searchParams.get("technicianId") || undefined,
      status, priority, serviceType,
      clientId: searchParams.get("clientId") || undefined,
      plantId: searchParams.get("plantId") || undefined,
    }, { userId: session.user.id, role: session.user.role }));
  } catch (error) {
    if (error.code === "TECHNICIAN_ACCOUNT_NOT_LINKED") {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    if (error.code === "22P02") return NextResponse.json({ error: "Uno de los filtros no es válido." }, { status: 400 });
    console.error("Error al cargar el calendario de técnicos:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
