import { query, withTransaction } from "@/lib/db";
import { PAR_EDITABLE_STATUS, getParEditError, isValidParTransition } from "@/lib/par-policy";
import { calculateLineTotalUsd as calculateLineTotalUsdPure } from "@/lib/par-calculation";

function parError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.parStatus = status;
  return error;
}

const VALID_PRODUCT_CATEGORIES = new Set(["Servicio", "Repuestos"]);

async function resolveItemCategory(client, productId, requestedCategory, { allowInactive = false } = {}) {
  if (!productId) {
    const category = requestedCategory || "Servicio";
    if (!VALID_PRODUCT_CATEGORIES.has(category)) {
      throw parError("PAR_PRODUCT_INVALID", "La categoría del ítem no es válida");
    }
    return { category, requiresTechnician: false };
  }

  const { rows } = await client.query(
    "SELECT category, status, requires_technician FROM product WHERE id = $1",
    [productId]
  );
  const product = rows[0];
  if (!product || !VALID_PRODUCT_CATEGORIES.has(product.category)) {
    throw parError("PAR_PRODUCT_INVALID", "El producto seleccionado no existe o no tiene una categoría válida");
  }
  if (product.status !== "Activo" && !allowInactive) {
    throw parError("PAR_PRODUCT_INACTIVE", "El producto seleccionado está inactivo");
  }
  return { category: product.category, requiresTechnician: product.requires_technician };
}

async function lockPar(client, parId, { editable = false, role } = {}) {
  const { rows } = await client.query(
    "SELECT id, status, purpose, client_id, plant_id, contact_id FROM par_header WHERE id = $1 FOR UPDATE",
    [parId]
  );
  const par = rows[0];
  if (!par) {
    throw parError("PAR_NOT_FOUND", "PAR no encontrado");
  }
  if (editable) {
    const { rows: orderRows } = await client.query(
      "SELECT EXISTS (SELECT 1 FROM service_order WHERE par_id = $1 AND status <> 'Cancelada') AS has_active_orders",
      [parId]
    );
    const editError = getParEditError(par.status, { role, hasActiveOrders: orderRows[0].has_active_orders });
    if (editError) throw parError(editError.code, editError.message, par.status);
  }
  return par;
}

async function assertParRelations(client, clientId, plantId, contactId, equipment = []) {
  const { rows: clientRows } = await client.query(
    "SELECT 1 FROM client WHERE id = $1 AND status = '1'",
    [clientId]
  );
  if (!clientRows.length) throw parError("PAR_RELATION_INVALID", "El cliente no existe o está inactivo en Saint");
  const { rows: plantRows } = await client.query(
    "SELECT 1 FROM plant WHERE id = $1 AND client_id = $2",
    [plantId, clientId]
  );
  if (!plantRows.length) throw parError("PAR_RELATION_INVALID", "La planta no pertenece al cliente seleccionado");
  const { rows: contactRows } = await client.query(
    "SELECT 1 FROM contact WHERE id = $1 AND client_id = $2 AND plant_id = $3",
    [contactId, clientId, plantId]
  );
  if (!contactRows.length) throw parError("PAR_RELATION_INVALID", "El contacto no pertenece al cliente y planta seleccionados");
  const equipmentIds = equipment.map((item) => item.equipmentId).filter(Boolean);
  if (!equipmentIds.length) return;
  const { rows } = await client.query(
    "SELECT COUNT(*)::int AS count FROM equipment WHERE id = ANY($1::uuid[]) AND client_id = $2 AND plant_id = $3",
    [equipmentIds, clientId, plantId]
  );
  if (rows[0].count !== new Set(equipmentIds).size) {
    throw parError("PAR_RELATION_INVALID", "Uno o más equipos no pertenecen al cliente y planta seleccionados");
  }
}

async function findItemByIdWithClient(client, id) {
  const { rows } = await client.query(`${ITEM_SELECT} WHERE i.id = $1`, [id]);
  return rows[0] || null;
}

async function findEquipmentByIdWithClient(client, id) {
  const { rows } = await client.query(`${EQUIPMENT_SELECT} WHERE e.id = $1`, [id]);
  return rows[0] || null;
}

/* ------------------------------------------------------------------ */
/*  VISTA DE CABECERA (con estado derivado desde órdenes de servicio)  */
/* ------------------------------------------------------------------ */

const HEADER_SELECT = `
  SELECT
    h.id,
    h.par_number,
    h.purpose,
    h.client_id,
    h.plant_id,
    h.status,
    h.exchange_rate,
    h.contact_id,
    h.fecha_emision,
    h.observations,
    h.elaborado_por,
    h.subtotal_usd,
    h.discount_percent,
    h.discount_amount_usd,
    h.total_usd,
    h.total_bs,
    h.budgeted_hours,
    h.created_by,
    h.approved_by,
    h.approved_at,
    h.created_at,
    h.updated_at,
    c.description AS client_name,
    c.codclie AS client_code,
    c.phone AS client_phone,
    c.address1 AS client_address,
    p.name AS plant_name,
    p.address AS plant_address,
    ct.name AS contact_name,
    ct.phone AS contact_phone,
    ct.email AS contact_email,
    u.name AS created_by_name,
    a.name AS approved_by_name,
    (
      SELECT COALESCE(eq.tipo, '') || ' · ' || COALESCE(eq.marca, '') || ' ' || COALESCE(eq.modelo, '')
      FROM par_equipment eq
      WHERE eq.par_id = h.id AND eq.is_main
      ORDER BY eq.id ASC
      LIMIT 1
    ) AS main_equipment,
    os.warranty_open_orders,
    os.total_orders,
    os.completed_orders,
    CASE
      WHEN h.status IN ('Aprobado', 'En Servicio', 'Finalizado')
       AND os.display_total_orders > 0 THEN
        CASE WHEN os.display_completed_orders = os.display_total_orders THEN 'Finalizado'
             ELSE 'En Servicio' END
      ELSE h.status
    END AS display_status
  FROM par_header h
  JOIN client c ON c.id = h.client_id
  LEFT JOIN plant p ON p.id = h.plant_id
  LEFT JOIN contact ct ON ct.id = h.contact_id
  JOIN users u ON u.id = h.created_by
  LEFT JOIN users a ON a.id = h.approved_by
  LEFT JOIN LATERAL (
    SELECT
      -- Los conteos generales siguen bloqueando edición, incluidas las garantías.
      COUNT(*) FILTER (WHERE status <> 'Cancelada')::int AS total_orders,
      COUNT(*) FILTER (WHERE status = 'Completada')::int AS completed_orders,
      COUNT(*) FILTER (WHERE status <> 'Cancelada' AND (h.purpose='ReferenciaGarantia' OR order_kind='Normal'))::int AS display_total_orders,
      COUNT(*) FILTER (WHERE status = 'Completada' AND (h.purpose='ReferenciaGarantia' OR order_kind='Normal'))::int AS display_completed_orders,
      COUNT(*) FILTER (WHERE order_kind='Garantia' AND status NOT IN ('Completada','Cancelada'))::int AS warranty_open_orders
    FROM service_order WHERE par_id=h.id
  ) os ON true
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
    await assertParRelations(client, data.clientId, data.plantId, data.contactId, data.equipment ?? []);
    const { rows: seqRows } = await client.query(
      "SELECT nextval('par_number_seq') AS seq"
    );
    const parNumber = String(seqRows[0].seq).padStart(7, "0");

    const { rows: headerRows } = await client.query(
      `INSERT INTO par_header
         (par_number, client_id, plant_id, contact_id, status, exchange_rate, fecha_emision,
          observations, elaborado_por, created_by, discount_percent, purpose)
       VALUES ($1, $2, $3, $4, 'Creado', $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        parNumber,
        data.clientId,
        data.plantId,
        data.contactId,
        data.exchangeRate ?? 0,
        data.fechaEmision || null,
        data.observations || null,
        data.elaboradoPor || null,
        createdBy,
        data.purpose === "ReferenciaGarantia" ? 0 : data.discountPercent ?? 0,
        data.purpose || "Comercial",
      ]
    );

    const parId = headerRows[0].id;
    await replaceEquipment(client, parId, data.equipment ?? []);
    await replaceItems(client, parId, data.items ?? []);
    await recalcTotals(client, parId);

    return parId;
  });
}

export async function update(id, data, actor = {}) {
  return withTransaction(async (client) => {
    const current = await lockPar(client, id, { editable: true, role: actor.role });
    if (data.purpose !== undefined && data.purpose !== current.purpose) throw parError("PAR_RELATION_INVALID","La finalidad del PAR no se puede convertir.");
    const nextClientId = data.clientId ?? current.client_id;
    const nextPlantId = data.plantId ?? current.plant_id;
    const nextContactId = data.contactId ?? current.contact_id;
    let relationEquipment = data.equipment;
    if (relationEquipment === undefined && (data.clientId !== undefined || data.plantId !== undefined)) {
      const { rows } = await client.query("SELECT equipment_id FROM par_equipment WHERE par_id = $1", [id]);
      relationEquipment = rows.map((row) => ({ equipmentId: row.equipment_id }));
    }
    if (data.clientId !== undefined || data.plantId !== undefined || data.contactId !== undefined || data.equipment !== undefined) {
      await assertParRelations(client, nextClientId, nextPlantId, nextContactId, relationEquipment ?? []);
    }
    const fields = [];
    const values = [];
    let i = 1;

    const map = {
      clientId: "client_id",
      plantId: "plant_id",
      contactId: "contact_id",
      exchangeRate: "exchange_rate",
      discountPercent: "discount_percent",
      fechaEmision: "fecha_emision",
      observations: "observations",
      elaboradoPor: "elaborado_por",
    };

    for (const [key, col] of Object.entries(map)) {
      if (data[key] !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(key === "discountPercent" ? (current.purpose === "ReferenciaGarantia" ? 0 : data[key]) : data[key] || null);
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
      const { rows } = await client.query(
        "SELECT product_id FROM par_item WHERE par_id = $1 AND product_id IS NOT NULL",
        [id]
      );
      await replaceItems(client, id, data.items, new Set(rows.map((row) => row.product_id)));
    }

    await recalcTotals(client, id);
    return id;
  });
}

export async function updateStatus(id, status, { approvedBy, approvedAt } = {}) {
  const updatedId = await withTransaction(async (client) => {
    const current = await lockPar(client, id);

    if (!isValidParTransition(current.status, status)) {
      throw parError(
        "PAR_INVALID_TRANSITION",
        `Transición de ${current.status} a ${status} no permitida`,
        current.status
      );
    }

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
    await client.query(
      `UPDATE par_header SET ${fields.join(", ")} WHERE id = $${i}`,
      values
    );
    return id;
  });

  return findById(updatedId);
}

export async function remove(id) {
  return withTransaction(async (client) => {
    const current = await lockPar(client, id);
    if (current.status !== PAR_EDITABLE_STATUS) {
      throw parError("PAR_LOCKED", "Solo se pueden eliminar PAR en estado Creado", current.status);
    }
    const { rowCount } = await client.query("DELETE FROM par_header WHERE id = $1", [id]);
    return rowCount > 0;
  });
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
    e.tipo,
    e.marca,
    e.serial,
    e.modelo,
    e.observaciones,
    e.created_at
  FROM par_equipment e
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

export async function addEquipment(parId, data, actor = {}) {
  return withTransaction(async (client) => {
    await lockPar(client, parId, { editable: true, role: actor.role });
    const { rows } = await client.query(
      `INSERT INTO par_equipment
         (par_id, item_no, is_main, equipment_id, tipo, marca, serial, modelo, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        parId,
        data.itemNo ?? 1,
        data.isMain ?? false,
        data.equipmentId || null,
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

export async function updateEquipment(id, data, actor = {}) {
  return withTransaction(async (client) => {
    const current = await findEquipmentByIdWithClient(client, id);
    if (!current) return null;
    await lockPar(client, current.par_id, { editable: true, role: actor.role });

    const fields = [];
    const values = [];
    let i = 1;

    const map = {
      itemNo: "item_no",
      isMain: "is_main",
      equipmentId: "equipment_id",
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

export async function removeEquipment(id, actor = {}) {
  return withTransaction(async (client) => {
    const current = await findEquipmentByIdWithClient(client, id);
    if (!current) return false;
    await lockPar(client, current.par_id, { editable: true, role: actor.role });

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
         (par_id, item_no, is_main, equipment_id, tipo, marca, serial, modelo, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        parId,
        eq.itemNo ?? 1,
        eq.isMain ?? false,
        eq.equipmentId || null,
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
    i.requires_technician,
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

export async function addItem(parId, data, actor = {}) {
  return withTransaction(async (client) => {
    await lockPar(client, parId, { editable: true, role: actor.role });
    const { category, requiresTechnician } = await resolveItemCategory(client, data.productId, data.categoria);
    const lineTotal = calculateLineTotal(data);
    const { rows } = await client.query(
      `INSERT INTO par_item
         (par_id, item_no, product_id, descripcion, qty, categoria, ccn, us_list,
          multiplicador, valor_unit_usd, valor_percent, line_total_usd, requires_technician)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        parId,
        data.itemNo ?? 1,
        data.productId || null,
        data.descripcion,
        data.qty ?? null,
        category,
        data.ccn || null,
        data.usList || null,
        data.multiplicador ?? 1,
        data.valorUnitUsd ?? 0,
        data.valorPercent ?? null,
        lineTotal,
        requiresTechnician,
      ]
    );
    await recalcTotals(client, parId);
    return rows[0].id;
  });
}

export async function updateItem(id, data, actor = {}) {
  return withTransaction(async (client) => {
    const current = await findItemByIdWithClient(client, id);
    if (!current) return null;
    await lockPar(client, current.par_id, { editable: true, role: actor.role });

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
    const product = await resolveItemCategory(
      client,
      merged.productId,
      merged.categoria,
      { allowInactive: Boolean(merged.productId && merged.productId === current.product_id) }
    );

    merged.categoria = product.category;
    const requiresTechnician = product.category === "Servicio" && merged.productId === current.product_id
      ? current.requires_technician : product.requiresTechnician;

    await client.query(
      `UPDATE par_item SET
         item_no = $1, product_id = $2, descripcion = $3, qty = $4, categoria = $5,
         ccn = $6, us_list = $7, multiplicador = $8, valor_unit_usd = $9,
         valor_percent = $10, line_total_usd = $11, requires_technician = $13
       WHERE id = $12`,
      [
        merged.itemNo,
        merged.productId || null,
        merged.descripcion,
        merged.qty ?? null,
        merged.categoria,
        merged.ccn || null,
        merged.usList || null,
        merged.multiplicador,
        merged.valorUnitUsd ?? 0,
        merged.valorPercent ?? null,
        calculateLineTotal(merged),
        id,
        requiresTechnician,
      ]
    );

    await recalcTotals(client, current.par_id);
    return current.par_id;
  });
}

export async function removeItem(id, actor = {}) {
  return withTransaction(async (client) => {
    const current = await findItemByIdWithClient(client, id);
    if (!current) return false;
    await lockPar(client, current.par_id, { editable: true, role: actor.role });

    const { rows } = await client.query(
      "DELETE FROM par_item WHERE id = $1 RETURNING par_id",
      [id]
    );
    if (!rows[0]) return false;
    await recalcTotals(client, rows[0].par_id);
    return true;
  });
}

async function replaceItems(client, parId, items, allowedInactiveProductIds = new Set()) {
  // Conserva la clasificación del renglón mientras siga siendo el mismo producto.
  // Las órdenes canceladas conservan sus snapshots aunque se recreen estos IDs.
  const { rows: previous } = await client.query("SELECT id, product_id, requires_technician FROM par_item WHERE par_id = $1", [parId]);
  const originals = new Map(previous.map((row) => [row.id, row]));
  await client.query("DELETE FROM par_item WHERE par_id = $1", [parId]);
  for (const item of items) {
    const { category, requiresTechnician } = await resolveItemCategory(
      client,
      item.productId,
      item.categoria,
      { allowInactive: allowedInactiveProductIds.has(item.productId) }
    );
    await client.query(
      `INSERT INTO par_item
         (par_id, item_no, product_id, descripcion, qty, categoria, ccn, us_list,
          multiplicador, valor_unit_usd, valor_percent, line_total_usd, requires_technician)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        parId,
        item.itemNo ?? 1,
        item.productId || null,
        item.descripcion,
        item.qty ?? null,
        category,
        item.ccn || null,
        item.usList || null,
        item.multiplicador ?? 1,
        item.valorUnitUsd ?? 0,
        item.valorPercent ?? null,
        calculateLineTotal(item),
        originals.has(item.id) && category === "Servicio" && originals.get(item.id).product_id === item.productId
          ? originals.get(item.id).requires_technician : requiresTechnician,
      ]
    );
  }
}

/* ------------------------------------------------------------------ */
/*  CÁLCULOS                                                           */
/* ------------------------------------------------------------------ */

export function calculateLineTotal(item) {
  return calculateLineTotalUsdPure(item);
}

/** Recalcula importes en NUMERIC desde los ítems, nunca desde totales del navegador.
 * El descuento global no modifica los renglones ni las horas de mano de obra.
 */
async function recalcTotals(client, parId) {
  await client.query("UPDATE par_header SET discount_percent=0 WHERE id=$1 AND purpose='ReferenciaGarantia' AND discount_percent<>0",[parId]);
  await client.query(
    `UPDATE par_item
     SET line_total_usd = ROUND(COALESCE(qty, 0) * COALESCE(valor_unit_usd, 0) * COALESCE(NULLIF(multiplicador, 0), 1) * (1 + COALESCE(valor_percent, 0) / 100), 2)
     WHERE par_id = $1`,
    [parId]
  );

  await client.query(
    `WITH amounts AS (
       SELECT COALESCE(SUM(line_total_usd), 0) AS subtotal,
              COALESCE(SUM(qty) FILTER (WHERE requires_technician), 0) AS hours
       FROM par_item WHERE par_id = $1
     ), discounted AS (
       SELECT a.*, ROUND(a.subtotal * h.discount_percent / 100, 2) AS discount
       FROM amounts a JOIN par_header h ON h.id = $1
     )
     UPDATE par_header h
     SET budgeted_hours = d.hours,
         subtotal_usd = d.subtotal,
         discount_amount_usd = d.discount,
         total_usd = d.subtotal - d.discount,
         total_bs = ROUND((d.subtotal - d.discount) * h.exchange_rate, 2)
     FROM discounted d WHERE h.id = $1`,
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
