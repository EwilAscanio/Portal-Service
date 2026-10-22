import { query, withTransaction } from "@/lib/db";

export async function createBatch({ fileName, fileHash, userId, summary, rows }) {
  return withTransaction(async (client) => {
    const { rows: batches } = await client.query(
      `INSERT INTO data_import_batch
       (original_file_name, file_hash, created_by, total_count, create_count, update_count, error_count, warning_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [fileName, fileHash, userId, summary.total, summary.create, summary.update, summary.errors, summary.warnings]
    );
    const batch = batches[0];
    await client.query(
      `INSERT INTO data_import_row
       (batch_id, sheet_name, row_number, entity_name, operation, status, payload, errors, warnings, target_id)
       SELECT $1, x.sheet_name, x.row_number, x.entity_name, x.operation, x.status,
              x.payload, x.errors, x.warnings, x.target_id
       FROM jsonb_to_recordset($2::jsonb) AS x(
         sheet_name text, row_number integer, entity_name text, operation text,
         status text, payload jsonb, errors jsonb, warnings jsonb, target_id uuid
       )`,
      [batch.id, JSON.stringify(rows.map((row) => ({
        sheet_name: row.sheetName,
        row_number: row.rowNumber,
        entity_name: row.entityName,
        operation: row.operation,
        status: row.status,
        payload: row.payload,
        errors: row.errors,
        warnings: row.warnings,
        target_id: row.targetId ?? null,
      })))]
    );
    return batch;
  });
}

export async function findBatch(id, userId) {
  const { rows } = await query(
    `SELECT b.*, u.name AS created_by_name
     FROM data_import_batch b
     JOIN users u ON u.id = b.created_by
     WHERE b.id = $1 AND ($2::uuid IS NULL OR b.created_by = $2)`,
    [id, userId ?? null]
  );
  return rows[0] ?? null;
}

export async function findRows(batchId, { errorsOnly = false } = {}) {
  const { rows } = await query(
    `SELECT * FROM data_import_row
     WHERE batch_id = $1 ${errorsOnly ? "AND jsonb_array_length(errors) > 0" : ""}
     ORDER BY CASE entity_name WHEN 'Producto' THEN 1 WHEN 'Planta' THEN 2 WHEN 'Contacto' THEN 3 ELSE 4 END, row_number`,
    [batchId]
  );
  return rows;
}

export async function listBatches(limit = 20) {
  const { rows } = await query(
    `SELECT b.id, b.original_file_name, b.status, b.total_count, b.create_count,
            b.update_count, b.error_count, b.warning_count, b.created_at,
            b.completed_at, u.name AS created_by_name
     FROM data_import_batch b
     JOIN users u ON u.id = b.created_by
     ORDER BY b.created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function runBatchImport(batchId, callback) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM data_import_batch WHERE id = $1 FOR UPDATE`,
      [batchId]
    );
    const batch = rows[0];
    if (!batch || batch.status !== "Validado" || batch.error_count > 0) return null;
    await client.query("UPDATE data_import_batch SET status = 'Importando' WHERE id = $1", [batchId]);
    const result = await callback(client, batch);
    await client.query(
      `UPDATE data_import_batch SET status = 'Completado', completed_at = now(), failure_message = NULL WHERE id = $1`,
      [batchId]
    );
    return result;
  });
}

export async function markBatchFailed(batchId) {
  await query(
    `UPDATE data_import_batch SET status = 'Fallido', completed_at = now(), failure_message = $2
     WHERE id = $1 AND status <> 'Completado'`,
    [batchId, "La transacción no pudo completarse."]
  );
}
