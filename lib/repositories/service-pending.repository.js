import { query, withTransaction } from "@/lib/db";
import { ROLES } from "@/lib/permissions";
import { canManageClosure, closureError } from "@/lib/service-order-closure";
import { canReadPending, canCompletePending } from "@/lib/service-pending";
import { completePendingSchema, pendingFiltersSchema, pendingLinesSchema } from "@/lib/validators/service-pending.schema";

export async function canAccessFieldWork(client, orderId, actor) {
  if (!actor?.userId) return false;
  if (canManageClosure(actor.role)) return true;
  if (actor.role !== ROLES.TECNICO) return false;
  const { rows } = await client.query(`SELECT 1 FROM service_order_technician ot JOIN technical t ON t.id=ot.technical_id
    WHERE ot.service_order_id=$1 AND t.user_id=$2`, [orderId, actor.userId]);
  return !!rows.length;
}

export async function readFieldWork(client, order, actor) {
  if (!await canAccessFieldWork(client, order.id, actor)) return null;
  const { rows: photos } = await client.query(`SELECT p.id,p.original_name,p.mime_type,p.byte_size,p.uploaded_at,p.retired_at,p.retirement_reason,
    u.name AS uploaded_by_name,r.name AS retired_by_name FROM service_order_photo p JOIN users u ON u.id=p.uploaded_by
    LEFT JOIN users r ON r.id=p.retired_by WHERE p.service_order_id=$1 ORDER BY p.uploaded_at,p.id`, [order.id]);
  const { rows: pendingItems } = await client.query(`SELECT p.id,p.description,p.status,p.position,p.published_at,p.completed_at,p.resolution,
    u.name AS created_by_name,c.name AS completed_by_name FROM service_pending_item p JOIN users u ON u.id=p.created_by
    LEFT JOIN users c ON c.id=p.completed_by WHERE p.service_order_id=$1 AND p.retired_at IS NULL ORDER BY p.position,p.id`, [order.id]);
  return { photos, pendingItems, editable: order.status === "En Proceso" };
}

// El llamador ya bloqueó PAR → O/S y validó autor/revisión. Se conserva autoría por renglón.
export async function savePendingLines(client, order, raw, actor) {
  const parsed = pendingLinesSchema.safeParse(raw);
  if (!parsed.success) throw closureError("ORDER_CLOSURE_INVALID", parsed.error.issues[0].message);
  const items = parsed.data;
  const { rows: existing } = await client.query("SELECT * FROM service_pending_item WHERE service_order_id=$1 ORDER BY position,id", [order.id]);
  const known = new Map(existing.map((row) => [row.id, row]));
  if (items.some((item) => known.has(item.id) && (known.get(item.id).retired_at || known.get(item.id).status !== "Borrador"))) {
    throw closureError("ORDER_CLOSURE_CONFLICT", "Un renglón ya fue retirado o publicado. Actualice el expediente.");
  }
  for (const [position, item] of items.entries()) {
    if (known.has(item.id)) {
      await client.query("UPDATE service_pending_item SET description=$2,position=$3,updated_by=$4,updated_at=now(),revision=revision+1 WHERE id=$1", [item.id,item.description,position,actor.userId]);
    } else {
      const { rowCount } = await client.query(`INSERT INTO service_pending_item(id,service_order_id,par_id,client_id,plant_id,description,position,created_by,updated_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8) ON CONFLICT(id) DO NOTHING`, [item.id,order.id,order.par_id,order.client_id,order.plant_id,item.description,position,actor.userId]);
      if (!rowCount) throw closureError("ORDER_CLOSURE_CONFLICT", "El identificador de una línea ya está en uso. Actualice el expediente.");
    }
  }
  await client.query(`UPDATE service_pending_item SET retired_at=now(),retired_by=$3,updated_by=$3,updated_at=now(),revision=revision+1
    WHERE service_order_id=$1 AND status='Borrador' AND retired_at IS NULL AND NOT(id=ANY($2::uuid[]))`, [order.id,items.map((row) => row.id),actor.userId]);
  return { previousPendingLines: existing.filter((row) => !row.retired_at).map(({ id,description }) => ({ id,description })), pendingLines: items };
}

// Publicación atómica con el cierre; las filas mantienen su identidad, sin copiar ni duplicar.
export async function publishPendingLines(client, orderId, actor) {
  const { rows } = await client.query(`UPDATE service_pending_item p SET status='Pendiente',published_at=so.closed_at,published_by=$2,
    client_code=c.codclie,client_name=c.description,plant_code=pl.code,plant_name=pl.name,order_code=so.order_code,par_number=ph.par_number,
    updated_by=$2,updated_at=now(),revision=p.revision+1
    FROM service_order so JOIN client c ON c.id=so.client_id JOIN plant pl ON pl.id=so.plant_id JOIN par_header ph ON ph.id=so.par_id
    WHERE p.service_order_id=so.id AND so.id=$1 AND so.status='Completada' AND so.closed_at IS NOT NULL
      AND p.status='Borrador' AND p.retired_at IS NULL RETURNING p.id`, [orderId,actor.userId]);
  for (const row of rows) await client.query("INSERT INTO service_pending_event(pending_id,actor_id,action) VALUES($1,$2,'Publicado')", [row.id,actor.userId]);
  return rows.length;
}

function pendingScope(actor, params) {
  if (!actor?.userId || !canReadPending(actor.role)) throw closureError("ORDER_CLOSURE_FORBIDDEN", "No tiene permiso para consultar pendientes.");
  if (actor.role !== ROLES.TECNICO) return "TRUE";
  params.push(actor.userId);
  return `EXISTS(SELECT 1 FROM service_order_technician ot JOIN technical t ON t.id=ot.technical_id WHERE ot.service_order_id=p.service_order_id AND t.user_id=$${params.length})`;
}

export async function listPending(raw, actor) {
  const parsed = pendingFiltersSchema.safeParse(raw);
  if (!parsed.success) throw closureError("ORDER_CLOSURE_INVALID", "Filtros de pendientes inválidos.");
  const filters = parsed.data;
  return withTransaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const params = [];
    const scope = pendingScope(actor,params);
    const base = `p.published_at IS NOT NULL AND ${scope}`;
    const { rows: catalog } = await client.query(`SELECT DISTINCT p.client_id,p.client_code,p.client_name,p.plant_id,p.plant_code,p.plant_name FROM service_pending_item p WHERE ${base} ORDER BY p.client_name,p.plant_name`, params);
    const where = [base];
    for (const [column, value] of [["status", filters.status], ["client_id", filters.clientId], ["plant_id", filters.plantId]]) {
      if (value) { params.push(value); where.push(`p.${column}=$${params.length}`); }
    }
    if (filters.order && filters.search) {
      params.push(filters.order);
      where.push(`strpos(lower(p.order_code),lower($${params.length}))>0`);
      params.push(filters.search);
      where.push(`strpos(lower(p.description),lower($${params.length}))>0`);
    } else if (filters.search) {
      params.push(filters.search);
      const mark = params.length;
      where.push(`(strpos(lower(p.description),lower($${mark}))>0 OR strpos(lower(p.order_code),lower($${mark}))>0)`);
    } else if (filters.order) {
      params.push(filters.order);
      where.push(`strpos(lower(p.order_code),lower($${params.length}))>0`);
    }
    const { rows: counts } = await client.query(`SELECT COUNT(*)::int AS total FROM service_pending_item p WHERE ${where.join(" AND ")}`, params);
    params.push((filters.page-1)*20);
    const { rows: items } = await client.query(`SELECT p.*,u.name AS created_by_name,c.name AS completed_by_name,
      COALESCE((SELECT json_agg(json_build_object('action',e.action,'created_at',e.created_at,'actor_name',a.name,'details',e.details) ORDER BY e.id)
      FROM service_pending_event e JOIN users a ON a.id=e.actor_id WHERE e.pending_id=p.id),'[]'::json) AS events
      FROM service_pending_item p JOIN users u ON u.id=p.created_by LEFT JOIN users c ON c.id=p.completed_by
      WHERE ${where.join(" AND ")} ORDER BY p.published_at,p.id LIMIT 20 OFFSET $${params.length}`, params);
    return { items,total: counts[0].total,page: filters.page,pageSize:20,catalog,canComplete:canCompletePending(actor.role) };
  });
}

export async function pendingSummary(actor) {
  if (!actor?.userId || !canReadPending(actor.role)) return null;
  const params=[];
  const scope=pendingScope(actor,params);
  const { rows } = await query(`SELECT (SELECT COUNT(*)::int FROM service_pending_item p WHERE p.status='Pendiente' AND ${scope}) AS total,
    COALESCE((SELECT json_agg(r) FROM (SELECT p.id,p.service_order_id,p.order_code,p.client_code,p.client_name,p.plant_name,p.description,p.published_at
      FROM service_pending_item p WHERE p.status='Pendiente' AND ${scope} ORDER BY p.published_at,p.id LIMIT 5) r),'[]'::json) AS items`,params);
  return rows[0];
}

export async function completePending(id, raw, actor) {
  if (!actor?.userId || !canCompletePending(actor.role)) throw closureError("ORDER_CLOSURE_FORBIDDEN", "No tiene permiso para completar pendientes.");
  const parsed=completePendingSchema.safeParse(raw);
  if (!parsed.success) throw closureError("ORDER_CLOSURE_INVALID",parsed.error.issues[0].message);
  return withTransaction(async (client) => {
    const { rows }=await client.query("SELECT * FROM service_pending_item WHERE id=$1 AND published_at IS NOT NULL FOR UPDATE",[id]);
    if (!rows.length) throw closureError("ORDER_CLOSURE_NOT_FOUND","Pendiente no encontrado.");
    const item=rows[0];
    if (item.status!=="Pendiente" || item.revision!==parsed.data.revision) throw closureError("ORDER_CLOSURE_CONFLICT","El pendiente ya cambió. Actualice la lista.");
    await client.query(`UPDATE service_pending_item SET status='Completado',completed_at=now(),completed_by=$2,resolution=$3,
      updated_by=$2,updated_at=now(),revision=revision+1 WHERE id=$1`,[id,actor.userId,parsed.data.resolution]);
    await client.query("INSERT INTO service_pending_event(pending_id,actor_id,action,details) VALUES($1,$2,'Completado',$3::jsonb)",[id,actor.userId,JSON.stringify({resolution:parsed.data.resolution})]);
    return { id,status:"Completado" };
  });
}
