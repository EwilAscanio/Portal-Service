import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request) {
  try {
    const search = request.nextUrl.searchParams.get("q")?.trim();
    if (!search || search.length < 2) {
      return NextResponse.json({ clients: [], plants: [], contacts: [], orders: [], equipment: [], technicians: [] });
    }

    const term = `%${search}%`;
    const [clients, plants, contacts, orders, equipment, technicians] = await Promise.all([
      query(`SELECT id, codclie, description, rif FROM client WHERE codclie ILIKE $1 OR description ILIKE $1 OR rif ILIKE $1 ORDER BY description LIMIT 3`, [term]),
      query(`SELECT p.id, p.name, p.address, c.description AS client_name FROM plant p JOIN client c ON c.id = p.client_id WHERE p.name ILIKE $1 OR p.address ILIKE $1 OR c.description ILIKE $1 ORDER BY p.name LIMIT 3`, [term]),
      query(`SELECT ct.id, ct.name, ct.phone, ct.email, p.name AS plant_name, c.description AS client_name FROM contact ct JOIN plant p ON p.id = ct.plant_id JOIN client c ON c.id = ct.client_id WHERE ct.name ILIKE $1 OR ct.phone ILIKE $1 OR ct.email ILIKE $1 ORDER BY ct.name LIMIT 3`, [term]),
      query(`SELECT so.id, so.order_code, ph.par_number, c.description AS client_name, so.service_type AS type
             FROM service_order so JOIN par_header ph ON ph.id = so.par_id JOIN client c ON c.id = ph.client_id
             WHERE so.order_code ILIKE $1 OR ph.par_number ILIKE $1 OR c.description ILIKE $1
                OR so.service_type ILIKE $1 OR so.purchase_order_number ILIKE $1 OR so.quotation_number ILIKE $1
                OR EXISTS (SELECT 1 FROM service_order_technician sot JOIN technical t ON t.id = sot.technical_id WHERE sot.service_order_id = so.id AND t.name ILIKE $1)
             ORDER BY so.created_at DESC LIMIT 3`, [term]),
      query(`SELECT e.id, e.name, e.brand, e.serial, c.description AS client_name, p.name AS plant_name FROM equipment e JOIN client c ON c.id = e.client_id JOIN plant p ON p.id = e.plant_id WHERE e.name ILIKE $1 OR e.brand ILIKE $1 OR e.serial ILIKE $1 OR c.description ILIKE $1 OR p.name ILIKE $1 ORDER BY e.name LIMIT 3`, [term]),
      query(`SELECT id, name, cedula FROM technical WHERE name ILIKE $1 OR cedula ILIKE $1 ORDER BY name LIMIT 3`, [term]),
    ]);

    return NextResponse.json({
      clients: clients.rows,
      plants: plants.rows,
      contacts: contacts.rows,
      orders: orders.rows,
      equipment: equipment.rows,
      technicians: technicians.rows,
    });
  } catch (error) {
    console.error("Error en búsqueda global:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
