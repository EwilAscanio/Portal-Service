import { query } from "@/lib/db";

const PROSPECT_SELECT = `
  SELECT id, local_id, user_id, description, rif, contact_name, phone, email, address1,
         sync_status, source_system, created_at, updated_at
  FROM client_prospect
`;

/** Prospectos ya recibidos, para que cualquier teléfono pueda buscarlos. */
export async function listForMobile(updatedSince) {
  if (updatedSince) {
    const { rows } = await query(
      `${PROSPECT_SELECT}
       WHERE updated_at > $1
       ORDER BY updated_at ASC, id ASC`,
      [updatedSince]
    );
    return rows;
  }
  const { rows } = await query(`${PROSPECT_SELECT} ORDER BY description, rif`);
  return rows;
}
