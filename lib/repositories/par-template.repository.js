import { query, withTransaction } from "@/lib/db";

const HEADER_SELECT = `
  SELECT id, type, name, description, created_at, updated_at
  FROM par_template
`;

const ITEM_SELECT = `
  SELECT
    i.id,
    i.template_id,
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
    p.code AS product_code,
    p.description AS product_name
  FROM par_template_item i
  LEFT JOIN product p ON p.id = i.product_id
`;

export async function findAll() {
  const { rows } = await query(`
    SELECT
      t.id,
      t.type,
      t.name,
      t.description,
      t.created_at,
      t.updated_at,
      COUNT(ti.id)::int AS item_count
    FROM par_template t
    LEFT JOIN par_template_item ti ON ti.template_id = t.id
    GROUP BY t.id
    ORDER BY t.name ASC
  `);
  return rows;
}

export async function findItemsByTemplateId(templateId) {
  const { rows } = await query(
    `${ITEM_SELECT} WHERE i.template_id = $1 ORDER BY i.item_no ASC, i.id ASC`,
    [templateId]
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`${HEADER_SELECT} WHERE id = $1`, [id]);
  if (!rows[0]) return null;
  const items = await findItemsByTemplateId(id);
  return { ...rows[0], items };
}

export async function create({ type, name, description, items = [] }) {
  return withTransaction(async (client) => {
    const { rows: headerRows } = await client.query(
      `INSERT INTO par_template (type, name, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [type, name, description || null]
    );
    const template = headerRows[0];
    const createdItems = await replaceItems(client, template.id, items);
    return { ...template, items: createdItems };
  });
}

export async function update(id, { type, name, description, items = [] }) {
  return withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE par_template
       SET type = $1, name = $2, description = $3, updated_at = now()
       WHERE id = $4`,
      [type, name, description || null, id]
    );
    if (rowCount === 0) return null;

    const createdItems = await replaceItems(client, id, items);

    const { rows } = await client.query(`${HEADER_SELECT} WHERE id = $1`, [id]);
    return { ...rows[0], items: createdItems };
  });
}

export async function remove(id) {
  const { rowCount } = await query("DELETE FROM par_template WHERE id = $1", [id]);
  return rowCount > 0;
}

async function replaceItems(client, templateId, items) {
  await client.query("DELETE FROM par_template_item WHERE template_id = $1", [templateId]);

  const created = [];
  for (const [index, item] of items.entries()) {
    const itemNo = item.itemNo ?? index + 1;
    const { rows } = await client.query(
      `INSERT INTO par_template_item
         (template_id, item_no, product_id, descripcion, qty, categoria, ccn, us_list,
          multiplicador, valor_unit_usd, valor_percent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        templateId,
        itemNo,
        item.productId || null,
        item.descripcion,
        item.qty === "" || item.qty == null ? null : Number(item.qty),
        item.categoria || null,
        item.ccn || null,
        item.usList || null,
        item.multiplicador === "" || item.multiplicador == null ? 1 : Number(item.multiplicador),
        item.valorUnitUsd === "" || item.valorUnitUsd == null ? 0 : Number(item.valorUnitUsd),
        item.valorPercent === "" || item.valorPercent == null ? null : Number(item.valorPercent),
      ]
    );
    created.push(rows[0]);
  }
  return created;
}
