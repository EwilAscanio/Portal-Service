import { withTransaction } from "@/lib/db";

function reject(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function insertOrLoad(db, insertSql, insertParams, loadSql, loadParams) {
  const inserted = await db.query(insertSql, insertParams);
  if (inserted.rows[0]) return inserted.rows[0];
  const existing = await db.query(loadSql, loadParams);
  if (!existing.rows[0]) throw reject("SYNC_FAILED", "No se pudo guardar el registro.");
  return existing.rows[0];
}

/**
 * Guarda prospectos y visitas del mismo usuario en una sola transacción.
 * Un local_id ya recibido devuelve el id existente y no crea otra fila.
 */
export async function syncBatch(user, { prospects, visits }) {
  return withTransaction(async (db) => {
    const prospectResults = [];
    const prospectIds = new Map();

    for (const item of prospects) {
      const row = await insertOrLoad(
        db,
        `INSERT INTO client_prospect
           (local_id, user_id, description, rif, contact_name, phone, email, address1, sync_status, source_system)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Sincronizado', 'Mobile')
         ON CONFLICT (user_id, local_id) DO NOTHING
         RETURNING id, local_id`,
        [item.local_id, user.id, item.description, item.rif, item.contact_name, item.phone, item.email, item.address1],
        `SELECT id, local_id FROM client_prospect WHERE user_id = $1 AND local_id = $2`,
        [user.id, item.local_id]
      );
      prospectIds.set(row.local_id, row.id);
      prospectResults.push({ local_id: row.local_id, id: row.id, sync_status: "Sincronizado" });
    }

    const visitResults = [];
    for (const item of visits) {
      const subject = await resolveSubject(db, user, item, prospectIds);
      const row = await insertOrLoad(
        db,
        `INSERT INTO client_visit
           (local_id, user_id, user_name, client_id, client_prospect_id, plant_id, plant_name,
            visited_at, client_class, visit_objective, visit_type, contact_name, contact_email,
            will_quote, office_zone, observations, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'Sincronizado')
         ON CONFLICT (user_id, local_id) DO NOTHING
         RETURNING id, local_id`,
        [
          item.local_id, user.id, user.name, subject.clientId, subject.prospectId,
          subject.plantId, subject.plantName, new Date(item.visited_at), item.client_class,
          item.visit_objective, item.visit_type, item.contact_name, item.contact_email,
          item.will_quote, item.office_zone, item.observations,
        ],
        `SELECT id, local_id FROM client_visit WHERE user_id = $1 AND local_id = $2`,
        [user.id, item.local_id]
      );
      visitResults.push({ local_id: row.local_id, id: row.id, sync_status: "Sincronizado" });
    }

    return { prospects: prospectResults, visits: visitResults };
  });
}

async function resolveSubject(db, user, item, prospectIds) {
  if (item.client_id) {
    const client = await db.query("SELECT id FROM client WHERE id = $1", [item.client_id]);
    if (!client.rows[0]) throw reject("CLIENT_NOT_FOUND", "El cliente de la visita no existe.");
    if (item.plant_id) {
      const plant = await db.query(
        "SELECT id FROM plant WHERE id = $1 AND client_id = $2",
        [item.plant_id, item.client_id]
      );
      if (!plant.rows[0]) throw reject("PLANT_INVALID", "La planta no pertenece al cliente.");
    }
    return { clientId: item.client_id, prospectId: null, plantId: item.plant_id, plantName: null };
  }

  let prospectId = item.client_prospect_id || null;
  if (item.client_prospect_local_id) {
    prospectId = prospectIds.get(item.client_prospect_local_id) || null;
    if (!prospectId) {
      const own = await db.query(
        "SELECT id FROM client_prospect WHERE user_id = $1 AND local_id = $2",
        [user.id, item.client_prospect_local_id]
      );
      prospectId = own.rows[0]?.id || null;
    }
  }
  if (!prospectId) throw reject("PROSPECT_NOT_FOUND", "El posible cliente de la visita no existe.");

  const prospect = await db.query("SELECT id FROM client_prospect WHERE id = $1", [prospectId]);
  if (!prospect.rows[0]) throw reject("PROSPECT_NOT_FOUND", "El posible cliente de la visita no existe.");
  return { clientId: null, prospectId, plantId: null, plantName: item.plant_name };
}
