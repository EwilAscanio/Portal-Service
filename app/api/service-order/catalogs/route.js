import { NextResponse } from "next/server";
import * as plantRepo from "@/lib/repositories/plant.repository";
import * as contactRepo from "@/lib/repositories/contact.repository";
import * as technicalRepo from "@/lib/repositories/technical.repository";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const [plants, contacts, technicians, pars] = await Promise.all([
      plantRepo.findAll(),
      contactRepo.findAll(),
      technicalRepo.findAll(),
      query(`
        SELECT ph.id, ph.par_number, ph.client_id, ph.plant_id, ph.contact_id,
               c.description AS client_name, c.codclie AS client_code,
               p.name AS plant_name, ct.name AS contact_name,
               (SELECT string_agg(trim(pd.observaciones), E'\n' ORDER BY pd.is_main DESC, pd.item_no, pd.id)
                FROM par_equipment pd
                WHERE pd.par_id = ph.id AND NULLIF(trim(pd.observaciones), '') IS NOT NULL)
                 AS work_description,
               COALESCE((SELECT json_agg(json_build_object(
                 'id', pe.equipment_id, 'name', COALESCE(e.name, pe.tipo),
                 'serial', COALESCE(e.serial, pe.serial), 'is_main', pe.is_main, 'description', pe.observaciones
               ) ORDER BY pe.is_main DESC, pe.item_no)
               FROM par_equipment pe LEFT JOIN equipment e ON e.id = pe.equipment_id
               WHERE pe.par_id = ph.id), '[]'::json) AS equipment,
               COALESCE((SELECT json_agg(json_build_object(
                 'id', pi.product_id, 'description', pi.descripcion, 'quantity', pi.qty
               ) ORDER BY pi.item_no) FROM par_item pi WHERE pi.par_id = ph.id), '[]'::json) AS items
        FROM par_header ph
        JOIN client c ON c.id = ph.client_id AND c.status = '1'
        JOIN plant p ON p.id = ph.plant_id
        JOIN contact ct ON ct.id = ph.contact_id
        WHERE ph.status = 'Aprobado'
          AND EXISTS (SELECT 1 FROM par_equipment pe WHERE pe.par_id = ph.id AND pe.equipment_id IS NOT NULL)
          AND EXISTS (SELECT 1 FROM par_equipment pe WHERE pe.par_id = ph.id AND NULLIF(trim(pe.observaciones), '') IS NOT NULL)
        ORDER BY ph.created_at DESC
      `),
    ]);
    return NextResponse.json({ plants, contacts, technicians, pars: pars.rows });
  } catch (error) {
    console.error("Error al cargar catálogos de órdenes:", error);
    return NextResponse.json({ error: "No se pudieron cargar los catálogos de órdenes." }, { status: 500 });
  }
}
