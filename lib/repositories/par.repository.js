import { query, withTransaction } from "@/lib/db";

/* ------------------------------------------------------------------ */
/*  VISTA DE CABECERA (con estado derivado desde órdenes de servicio)  */
/* ------------------------------------------------------------------ */

const HEADER_SELECT = `
  SELECT
    h.id,
    h.par_number,
    h.client_id,
    h.status,
    h.exchange_rate,
    h.atencion,
    h.fecha_emision,
    h.observations,
    h.elaborado_por,
    h.total_usd,
    h.total_bs,
    h.created_by,
    h.approved_by,
    h.approved_at,
    h.created_at,
    h.updated_at,
    c.description AS client_name,
    c.codclie AS client_code,
    c.phone AS client_phone,
    c.address1 AS client_address,
    u.name AS created_by_name,
    a.name AS approved_by_name,
    (
      SELECT COALESCE(eq.tipo, '') || ' · ' || COALESCE(eq.marca, '') || ' ' || COALESCE(eq.modelo, '')
      FROM par_equipment eq
      WHERE eq.par_id = h.id AND eq.is_main
      ORDER BY eq.id ASC
      LIMIT 1
    ) AS main_equipment,
    os.total_orders,
    os.completed_orders,
    CASE
      WHEN h.status IN ('Aprobado', 'En Servicio', 'Finalizado')
       AND os.total_orders > 0 THEN
        CASE WHEN os.completed_orders = os.total_orders THEN 'Finalizado'
             ELSE 'En Servicio' END
      ELSE h.status
    END AS display_status
  FROM par_header h
  JOIN client c ON c.id = h.client_id
  JOIN "user" u ON u.id = h.created_by
  LEFT JOIN "user" a ON a.id = h.approved_by
  LEFT JOIN (
    SELECT
      par_id,
      COUNT(*) FILTER (WHERE status <> 'Cancelada')::int        AS total_orders,
      COUNT(*) FILTER (WHERE status = 'Completada')::int         AS completed_orders
    FROM service_order
    GROUP BY par_id
  ) os ON os.par_id = h.id
`;

export async function findAll({ status, clientId, search } = {}) {
  let sql = HEADER_SELECT + " WHERE 1=1";
  const params = [];
  let i = 1;

  if (status) {
    sql += ` AND h.status = $${i++}`;
    params.push(status);
  }
  if (clientId) {
    sql += ` AND h.client_id = $${i++}`;
    params.push(clientId);
  }
  if (search) {
    sql += ` AND (
      h.par_number ILIKE $${i}
      OR c.description ILIKE $${i}
      OR c.codclie ILIKE $${i}
    )`;
    params.push(`%${search}%`);
    i++;
  }

  sql += " ORDER BY h.par_number ASC";
  const { rows } = await query(sql, params);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`${HEADER_SELECT} WHERE h.id = $1`, [id]);
  if (!rows[0]) return null;

  const [equipment, items] = await Promise.all([
    findEquipmentByParId(id),
    findItemsByParId(id),
  ]);

  return { ...rows[0], equipment, items };
}

/* ------------------------------------------------------------------ */
/*  CRUD CABECERA                                                      */
/* ------------------------------------------------------------------ */

export async function create(data, createdBy) {
  return withTransaction(async (client) => {
    const { rows: seqRows } = await client.query(
      "SELECT nextval('par_number_seq') AS seq"
    );
    const parNumber = String(seqRows[0].seq).padStart(7, "0");

    const { rows: headerRows } = await client.query(
      `INSERT INTO par_header
         (par_number, client_id, status, exchange_rate, atencion, fecha_emision,
          observations, elaborado_por, created_by)
       VALUES ($1, $2, 'Creado', $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        parNumber,
        data.clientId,
        data.exchangeRate ?? 0,
        data.atencion || null,
        data.fechaEmision || null,
        data.observations || null,
        data.elaboradoPor || null,
        createdBy,
      ]
    );

    const parId = headerRows[0].id;
    await replaceEquipment(client, parId, data.equipment ?? []);
    await replaceItems(client, parId, data.items ?? []);
    await recalcTotals(client, parId);

    return parId;
  });
}

export async function update(id, data) {
  return withTransaction(async (client) => {
    const fields = [];
    const values = [];
    let i = 1;

    const map = {
      clientId: "client_id",
      exchangeRate: "exchange_rate",
      atencion: "atencion",
      fechaEmision: "fecha_emision",
      observations: "observations",
      elaboradoPor: "elaborado_por",
    };

    for (const [key, col] of Object.entries(map)) {
      if (data[key] !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(data[key] || null);
      }
    }

    if (fields.length > 0) {
      values.push(id);
      await client.query(
        `UPDATE par_header SET ${fields.join(", ")} WHERE id = $${i}`,
        values
      );
    }

    if (data.equipment !== undefined) {
      await replaceEquipment(client, id, data.equipment);
    }
    if (data.items !== undefined) {
      await replaceItems(client, id, data.items);
    }

    await recalcTotals(client, id);
    return id;
  });
}

export async function updateStatus(id, status, { approvedBy, approvedAt } = {}) {
  const fields = ["status = $1"];
  const values = [status];
  let i = 2;

  if (approvedBy !== undefined) {
    fields.push(`approved_by = $${i++}`);
    values.push(approvedBy);
  }
  if (approvedAt !== undefined) {
    fields.push(`approved_at = $${i++}`);
    values.push(approvedAt);
  }

  values.push(id);
  const { rows } = await query(
    `UPDATE par_header SET ${fields.join(", ")} WHERE id = $${i} RETURNING id`,
    values
  );
  return rows[0] ? findById(rows[0].id) : null;
}

export async function remove(id) {
  const { rowCount } = await query("DELETE FROM par_header WHERE id = $1", [id]);
  return rowCount > 0;
}

/* ------------------------------------------------------------------ */
/*  EQUIPOS                                                            */
/* ------------------------------------------------------------------ */

const EQUIPMENT_SELECT = `
  SELECT
    e.id,
    e.par_id,
    e.item_no,
    e.is_main,
    e.equipment_id,
    e.product_id,
    e.tipo,
    e.marca,
    e.serial,
    e.modelo,
    e.observaciones,
    e.created_at,
    p.code AS product_code,
    p.description AS product_name
  FROM par_equipment e
  LEFT JOIN product p ON p.id = e.product_id
`;

export async function findEquipmentByParId(parId) {
  const { rows } = await query(
    `${EQUIPMENT_SELECT} WHERE e.par_id = $1 ORDER BY e.item_no ASC, e.id ASC`,
    [parId]
  );
  return rows;
}

export async function findEquipmentById(id) {
  const { rows } = await query(`${EQUIPMENT_SELECT} WHERE e.id = $1`, [id]);
  return rows[0] || null;
}

export async function addEquipment(parId, data) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO par_equipment
         (par_id, item_no, is_main, equipment_id, product_id, tipo, marca, serial, modelo, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        parId,
        data.itemNo ?? 1,
        data.isMain ?? false,
        data.equipmentId || null,
        data.productId || null,
        data.tipo || null,
        data.marca || null,
        data.serial || null,
        data.modelo || null,
        data.observaciones || null,
      ]
    );
    return rows[0].id;
  });
}

export async function updateEquipment(id, data) {
  return withTransaction(async (client) => {
    const fields = [];
    const values = [];
    let i = 1;

    const map = {
      itemNo: "item_no",
      isMain: "is_main",
      equipmentId: "equipment_id",
      productId: "product_id",
      tipo: "tipo",
      marca: "marca",
      serial: "serial",
      modelo: "modelo",
      observaciones: "observaciones",
    };

    for (const [key, col] of Object.entries(map)) {
      if (data[key] !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(data[key] === "" ? null : data[key]);
      }
    }

    if (fields.length === 0) return id;

    values.push(id);
    const { rows } = await client.query(
      `UPDATE par_equipment SET ${fields.join(", ")} WHERE id = $${i} RETURNING par_id`,
      values
    );
    if (!rows[0]) return null;
    await recalcTotals(client, rows[0].par_id);
    return rows[0].par_id;
  });
}

export async function removeEquipment(id) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      "DELETE FROM par_equipment WHERE id = $1 RETURNING par_id",
      [id]
    );
    if (!rows[0]) return false;
    await recalcTotals(client, rows[0].par_id);
    return true;
  });
}

async function replaceEquipment(client, parId, equipment) {
  await client.query("DELETE FROM par_equipment WHERE par_id = $1", [parId]);
  for (const eq of equipment) {
    await client.query(
      `INSERT INTO par_equipment
         (par_id, item_no, is_main, equipment_id, product_id, tipo, marca, serial, modelo, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        parId,
        eq.itemNo ?? 1,
        eq.isMain ?? false,
        eq.equipmentId || null,
        eq.productId || null,
        eq.tipo || null,
        eq.marca || null,
        eq.serial || null,
        eq.modelo || null,
        eq.observaciones || null,
      ]
    );
  }
}

/* ------------------------------------------------------------------ */
/*  ÍTEMS (productos adicionales)                                      */
/* ------------------------------------------------------------------ */

const ITEM_SELECT = `
  SELECT
    i.id,
    i.par_id,
    i.item_no,
    i.product_id,
    i.descripcion,
    i.qty,
    i.categoria,
    i.ccn,
    i.us_list,
    i.multiplicador,
    i.valor_unit_usd,
    i.valor_percent,
    i.line_total_usd,
    i.created_at,
    p.code AS product_code,
    p.description AS product_name
  FROM par_item i
  LEFT JOIN product p ON p.id = i.product_id
`;

export async function findItemsByParId(parId) {
  const { rows } = await query(
    `${ITEM_SELECT} WHERE i.par_id = $1 ORDER BY i.item_no ASC, i.id ASC`,
    [parId]
  );
  return rows;
}

export async function findItemById(id) {
  const { rows } = await query(`${ITEM_SELECT} WHERE i.id = $1`, [id]);
  return rows[0] || null;
}

export async function addItem(parId, data) {
  return withTransaction(async (client) => {
    const lineTotal = calculateLineTotal(data);
    const { rows } = await client.query(
      `INSERT INTO par_item
         (par_id, item_no, product_id, descripcion, qty, categoria, ccn, us_list,
          multiplicador, valor_unit_usd, valor_percent, line_total_usd)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        parId,
        data.itemNo ?? 1,
        data.productId || null,
        data.descripcion,
        data.qty ?? null,
        data.categoria || null,
        data.ccn || null,
        data.usList || null,
        data.multiplicador ?? 1,
        data.valorUnitUsd ?? 0,
        data.valorPercent ?? null,
        lineTotal,
      ]
    );
    await recalcTotals(client, parId);
    return rows[0].id;
  });
}

export async function updateItem(id, data) {
  return withTransaction(async (client) => {
    const current = await findItemById(id);
    if (!current) return null;

    const merged = {
      itemNo: data.itemNo ?? current.item_no,
      productId: data.productId !== undefined ? data.productId : current.product_id,
      descripcion: data.descripcion ?? current.descripcion,
      qty: data.qty !== undefined ? data.qty : current.qty,
      categoria: data.categoria !== undefined ? data.categoria : current.categoria,
      ccn: data.ccn !== undefined ? data.ccn : current.ccn,
      usList: data.usList !== undefined ? data.usList : current.us_list,
      multiplicador: data.multiplicador ?? current.multiplicador,
      valorUnitUsd: data.valorUnitUsd ?? current.valor_unit_usd,
      valorPercent: data.valorPercent !== undefined ? data.valorPercent : current.valor_percent,
    };

    await client.query(
      `UPDATE par_item SET
         item_no = $1, product_id = $2, descripcion = $3, qty = $4, categoria = $5,
         ccn = $6, us_list = $7, multiplicador = $8, valor_unit_usd = $9,
         valor_percent = $10, line_total_usd = $11
       WHERE id = $12`,
      [
        merged.itemNo,
        merged.productId || null,
        merged.descripcion,
        merged.qty ?? null,
        merged.categoria || null,
        merged.ccn || null,
        merged.usList || null,
        merged.multiplicador,
        merged.valorUnitUsd ?? 0,
        merged.valorPercent ?? null,
        calculateLineTotal(merged),
        id,
      ]
    );

    await recalcTotals(client, current.par_id);
    return current.par_id;
  });
}

export async function removeItem(id) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      "DELETE FROM par_item WHERE id = $1 RETURNING par_id",
      [id]
    );
    if (!rows[0]) return false;
    await recalcTotals(client, rows[0].par_id);
    return true;
  });
}

async function replaceItems(client, parId, items) {
  await client.query("DELETE FROM par_item WHERE par_id = $1", [parId]);
  for (const item of items) {
    await client.query(
      `INSERT INTO par_item
         (par_id, item_no, product_id, descripcion, qty, categoria, ccn, us_list,
          multiplicador, valor_unit_usd, valor_percent, line_total_usd)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        parId,
        item.itemNo ?? 1,
        item.productId || null,
        item.descripcion,
        item.qty ?? null,
        item.categoria || null,
        item.ccn || null,
        item.usList || null,
        item.multiplicador ?? 1,
        item.valorUnitUsd ?? 0,
        item.valorPercent ?? null,
        calculateLineTotal(item),
      ]
    );
  }
}

/* ------------------------------------------------------------------ */
/*  CÁLCULOS                                                           */
/* ------------------------------------------------------------------ */

export function calculateLineTotal(item) {
  const qty = Number(item.qty) || 0;
  const unit = Number(item.valorUnitUsd) || 0;
  const mult = Number(item.multiplicador) > 0 ? Number(item.multiplicador) : 1;
  const percent = Number(item.valorPercent) > 0 ? Number(item.valorPercent) : 0;
  return Math.round(qty * unit * mult * (1 + percent / 100) * 100) / 100;
}

/** Recalcula totales de la cabecera (USD y Bs) y las líneas sin cálculo. */
async function recalcTotals(client, parId) {
  await client.query(
    `UPDATE par_item
     SET line_total_usd = ROUND(COALESCE(qty, 0) * COALESCE(valor_unit_usd, 0) * COALESCE(NULLIF(multiplicador, 0), 1) * (1 + COALESCE(valor_percent, 0) / 100), 2)
     WHERE par_id = $1`,
    [parId]
  );

  await client.query(
    `UPDATE par_header
     SET total_usd = COALESCE((SELECT SUM(line_total_usd) FROM par_item WHERE par_id = $1), 0),
         total_bs  = ROUND(COALESCE((SELECT SUM(line_total_usd) FROM par_item WHERE par_id = $1), 0) * exchange_rate, 2)
     WHERE id = $1`,
    [parId]
  );
}

/* ------------------------------------------------------------------ */
/*  STATS                                                              */
/* ------------------------------------------------------------------ */

export async function getStats() {
  const { rows } = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'Creado')::int AS created,
      COUNT(*) FILTER (WHERE status = 'Aprobado')::int AS approved,
      COUNT(*) FILTER (WHERE status = 'Rechazado')::int AS rejected,
      COUNT(*) FILTER (WHERE status IN ('Aprobado', 'En Servicio', 'Finalizado'))::int AS active,
      COALESCE(SUM(total_usd), 0)::numeric AS total_usd,
      COALESCE(SUM(total_bs), 0)::numeric AS total_bs
    FROM par_header
  `);
  return rows[0];
}
