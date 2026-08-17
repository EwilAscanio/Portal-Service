import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const ordersStats = await query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'Pendiente')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'En Proceso')::int AS in_progress,
        COUNT(*) FILTER (WHERE status = 'Completada')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'Cancelada')::int AS cancelled,
        COALESCE(SUM(amount) FILTER (WHERE status = 'Completada'), 0)::numeric AS revenue
      FROM service_order
    `);

    const clientsStats = await query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'Activo')::int AS active
      FROM client
    `);

    const equipmentStats = await query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'Operativo')::int AS operational,
             COUNT(*) FILTER (WHERE next_maintenance <= now() + interval '7 day')::int AS upcoming
      FROM equipment
    `);

    const techStats = await query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'Activo')::int AS active
      FROM technical
    `);

    const recentOrders = await query(`
      SELECT id, order_code AS "orderCode", client_description AS "client",
             equipment_name AS "equipment", type, technician_name AS "technician",
             priority, status, scheduled_date AS "scheduled", amount
      FROM service_order
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const upcomingMaintenances = await query(`
      SELECT id, name AS equipment, client_description AS "client",
             type AS "type", next_maintenance AS "date"
      FROM equipment
      WHERE next_maintenance IS NOT NULL
        AND next_maintenance >= now()
      ORDER BY next_maintenance ASC
      LIMIT 4
    `);

    const os = ordersStats.rows[0];
    const cs = clientsStats.rows[0];
    const es = equipmentStats.rows[0];
    const ts = techStats.rows[0];

    return NextResponse.json({
      kpis: {
        orders: { total: os.total, pending: os.pending, inProgress: os.in_progress },
        clients: { total: cs.total, active: cs.active },
        technicians: { total: ts.total, active: ts.active },
        equipment: { total: es.total, operational: es.operational, upcoming: es.upcoming },
        revenue: os.revenue,
      },
      ordersByStatus: [
        { name: "Completadas", value: os.completed, color: "#10b981" },
        { name: "En Proceso", value: os.in_progress, color: "#3b82f6" },
        { name: "Pendientes", value: os.pending, color: "#f59e0b" },
        { name: "Canceladas", value: os.cancelled, color: "#ef4444" },
      ],
      recentOrders: recentOrders.rows,
      upcomingMaintenances: upcomingMaintenances.rows,
    });
  } catch (error) {
    console.error("Error al obtener stats del dashboard:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
