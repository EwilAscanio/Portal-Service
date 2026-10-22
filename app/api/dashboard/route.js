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
             COUNT(*) FILTER (WHERE status = '1')::int AS active
      FROM client
    `);

    const equipmentStats = await query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'Operativo')::int AS operational
      FROM equipment
    `);

    const techStats = await query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'Activo')::int AS active
      FROM technical
    `);

    const recentOrders = await query(`
      SELECT so.id, so.order_code AS "orderCode", ph.par_number AS "parNumber",
             c.description AS "client", COALESCE(e.name, so.equipment_name) AS "equipment",
             COALESCE((SELECT string_agg(t.name, ', ' ORDER BY sot.is_lead DESC, sot.assigned_at)
               FROM service_order_technician sot JOIN technical t ON t.id = sot.technical_id
               WHERE sot.service_order_id = so.id), so.technician_name) AS "technician",
             p.name AS "plant", ct.name AS "contact",
             so.service_type AS "type", so.priority, so.status,
             so.scheduled_start AS "scheduled", so.amount
      FROM service_order so
      JOIN par_header ph ON ph.id = so.par_id
      JOIN client c ON c.id = ph.client_id
      JOIN plant p ON p.id = ph.plant_id
      LEFT JOIN equipment e ON e.id = so.equipment_id
      JOIN contact ct ON ct.id = ph.contact_id
      ORDER BY so.created_at DESC
      LIMIT 5
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
        equipment: { total: es.total, operational: es.operational },
        revenue: os.revenue,
      },
      ordersByStatus: [
        { name: "Completadas", value: os.completed, color: "#10b981" },
        { name: "En Proceso", value: os.in_progress, color: "#3b82f6" },
        { name: "Pendientes", value: os.pending, color: "#f59e0b" },
        { name: "Canceladas", value: os.cancelled, color: "#ef4444" },
      ],
      recentOrders: recentOrders.rows,
    });
  } catch (error) {
    console.error("Error al obtener stats del dashboard:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
