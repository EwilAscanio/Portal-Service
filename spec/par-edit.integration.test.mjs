import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { registerHooks } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { mock } from "node:test";
import pg from "pg";
import { ROLES } from "../lib/permissions.js";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
const connectionString = process.env.DATABASE_URL || `postgresql://${encodeURIComponent(process.env.DB_USER || "postgres")}:${encodeURIComponent(process.env.DB_PASSWORD || "")}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "db_service"}`;
const schemaName = `par_edit_${randomUUID().replaceAll("-", "")}`;
const admin = new pg.Client({ connectionString });
const pool = new pg.Pool({ connectionString, max: 5, options: `-c search_path=${schemaName},public -c statement_timeout=10000 -c lock_timeout=8000` });
let queryHook;
globalThis.__maquitechPgPool = {
  query: (...args) => pool.query(...args),
  connect: async () => {
    const client = await pool.connect();
    return {
      query: async (...args) => {
        const result = await client.query(...args);
        await queryHook?.(args[0], client.processID);
        return result;
      },
      release: () => client.release(),
    };
  },
};

const root = new URL("../", import.meta.url);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/auth") {
      return { url: "data:text/javascript,export async function auth() { return globalThis.__parTestSession; }", shortCircuit: true };
    }
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier.startsWith("@/") || (specifier.startsWith(".") && !context.parentURL.includes("/node_modules/"))) {
      const target = new URL(specifier.startsWith("@/") ? specifier.slice(2) : specifier, specifier.startsWith("@/") ? root : context.parentURL);
      for (const url of [target, new URL(`${target.href}.js`), new URL(`${target.href}/index.js`)]) {
        if (fs.existsSync(url) && fs.statSync(url).isFile()) return nextResolve(url.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});
const reportError = console.error.bind(console);
const errorLog = mock.method(console, "error", (message, error) => {
  if (!["PAR_EDIT_FORBIDDEN", "PAR_HAS_ACTIVE_ORDERS"].includes(error?.code)) reportError(message, error);
});

function gate() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function waitForBlock(blockerPid) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const { rows } = await pool.query("SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))) AS blocked", [blockerPid]);
    if (rows[0].blocked) return;
    await delay(10);
  }
  assert.fail("La operación concurrente no esperó el bloqueo del PAR");
}

async function withPausedQuery(pattern, start, whilePaused) {
  const reached = gate();
  const release = gate();
  queryHook = async (sql, pid) => {
    if (!pattern.test(sql)) return;
    reached.resolve(pid);
    await release.promise;
  };
  const running = start();
  const outcome = running.then((value) => ({ value }), (error) => ({ error }));
  try {
    const first = await Promise.race([reached.promise, outcome.then(({ error }) => { throw error || new Error("No se alcanzó la consulta esperada"); })]);
    return await whilePaused(first, release.resolve, running);
  } finally {
    release.resolve();
    await outcome;
    queryHook = undefined;
  }
}

let schemaCreated = false;
try {
  await admin.connect();
  await admin.query(`CREATE SCHEMA ${schemaName}`);
  schemaCreated = true;
  await pool.query(fs.readFileSync("db/schema.sql", "utf8").replace(/^CREATE EXTENSION.*$/m, ""));
  const parRepo = await import("../lib/repositories/par.repository.js");
  const ordersRepo = await import("../lib/repositories/service-order.repository.js");
  const parRoute = await import("../app/api/par/[id]/route.js");
  const itemCollection = await import("../app/api/par/[id]/items/route.js");
  const equipmentCollection = await import("../app/api/par/[id]/equipment/route.js");
  const itemRoute = await import("../app/api/par/items/[itemId]/route.js");
  const equipmentRoute = await import("../app/api/par/equipment/[eqId]/route.js");

  const firstId = async (sql, values = []) => (await pool.query(sql, values)).rows[0].id;
  const clientId = await firstId("INSERT INTO client(codclie,description) VALUES ('PAR-EDIT','Cliente de prueba') RETURNING id");
  const plantId = await firstId("INSERT INTO plant(name,code,client_id) VALUES ('Planta','P-1',$1) RETURNING id", [clientId]);
  const contactId = await firstId("INSERT INTO contact(name,client_id,plant_id) VALUES ('Contacto',$1,$2) RETURNING id", [clientId, plantId]);
  const equipmentId = await firstId("INSERT INTO equipment(name,brand,model,serial,client_id,plant_id) VALUES ('Equipo','Marca','Modelo','PAR-EDIT-1',$1,$2) RETURNING id", [clientId, plantId]);
  const technicalId = await firstId("INSERT INTO technical(cedula,name) VALUES ('PAR-EDIT','Técnico') RETURNING id");
  const userId = await firstId("INSERT INTO users(login,name,email,password_hash,role_id) SELECT 'par-edit','Usuario','par-edit@test.dev','hash',id FROM role WHERE name='Administrador' RETURNING id");
  const actor = { role: ROLES.ADMIN };
  const productId = await firstId("INSERT INTO product(code,description,cost,price,category,requires_technician) VALUES ('LABOR','Servicio',10,10,'Servicio',true) RETURNING id");
  const item = { productId, itemNo: 1, descripcion: "Servicio", qty: 2, valorUnitUsd: 10, multiplicador: 1, valorPercent: 5, categoria: "Servicio" };
  const equipment = { itemNo: 1, isMain: true, equipmentId, observaciones: "Trabajo inicial" };
  const createPar = () => parRepo.create({ clientId, plantId, contactId, exchangeRate: 36.5, equipment: [equipment], items: [item] }, userId);
  const approve = (id) => parRepo.updateStatus(id, "Aprobado", { approvedBy: userId, approvedAt: "2026-10-21T12:00:00Z" });
  const orderData = async (parId) => ({ parId, laborAllocations: [{ parItemId: (await parRepo.findById(parId)).items[0].id, technicalId, hours: 1 }], workType: "External", serviceType: "Maintenance", callDate: "2026-10-21", scheduledStart: "2026-10-22T10:00:00Z", scheduledEnd: "2026-10-22T11:00:00Z" });
  const parId = await createPar();
  await parRepo.update(parId, { items: [item] }, { role: ROLES.COORDINADOR });
  const approved = await approve(parId);
  const call = (handler, method, params, body = {}) => handler(new Request("http://localhost/api/par", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve(params) });

  for (const role of [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR]) {
    globalThis.__parTestSession = { user: { id: userId, role } };
    const response = await call(parRoute.PUT, "PUT", { id: parId }, { items: [item] });
    assert.equal(response.status, 200, role);
    const saved = await response.json();
    assert.equal(saved.status, "Aprobado");
    assert.equal(saved.total_usd, "21.00");
    assert.equal(saved.total_bs, "766.50");
    assert.equal(saved.approved_by, approved.approved_by);
    assert.equal(saved.approved_at, approved.approved_at.toISOString());
  }
  const current = await parRepo.findById(parId);
  const itemId = current.items[0].id;
  const eqId = current.equipment[0].id;
  const writes = [
    [parRoute.PUT, "PUT", { id: parId }, { items: [item], role: ROLES.SUPER_ADMIN }],
    [itemCollection.POST, "POST", { id: parId }, { ...item, itemNo: 2 }],
    [itemRoute.PUT, "PUT", { itemId }, item],
    [itemRoute.DELETE, "DELETE", { itemId }],
    [equipmentCollection.POST, "POST", { id: parId }, { observaciones: "Adicional", itemNo: 2 }],
    [equipmentRoute.PUT, "PUT", { eqId }, equipment],
    [equipmentRoute.DELETE, "DELETE", { eqId }],
  ];
  for (const role of [undefined, ROLES.COORDINADOR, ROLES.TECNICO, ROLES.USUARIO]) {
    globalThis.__parTestSession = role ? { user: { id: userId, role } } : null;
    for (const args of writes) assert.equal((await call(...args)).status, role ? 403 : 401, `${args[1]} por ${role}`);
  }
  await assert.rejects(parRepo.update(parId, { items: [item], role: ROLES.ADMIN }), { code: "PAR_EDIT_FORBIDDEN" });
  await assert.rejects(parRepo.remove(parId), { code: "PAR_LOCKED" });
  const extraItem = await parRepo.addItem(parId, { ...item, itemNo: 2 }, actor);
  await parRepo.updateItem(extraItem, { qty: 3 }, actor);
  await parRepo.removeItem(extraItem, actor);
  const extraEq = await parRepo.addEquipment(parId, { itemNo: 2, observaciones: "Extra" }, actor);
  await parRepo.updateEquipment(extraEq, { observaciones: "Extra actualizado" }, actor);
  await parRepo.removeEquipment(extraEq, actor);

  const order = await ordersRepo.create(await orderData(parId), userId);
  globalThis.__parTestSession = { user: { id: userId, role: ROLES.SUPER_ADMIN } };
  for (const status of ["Pendiente", "Aprobada", "En Proceso", "Completada"]) {
    await pool.query("UPDATE service_order SET status = $1 WHERE id = $2", [status, order.id]);
    for (const args of writes) {
      const response = await call(...args);
      assert.equal(response.status, 403, `${args[1]} con orden ${status}`);
      assert.match((await response.json()).error, /órdenes de servicio no canceladas/);
    }
  }
  assert.deepEqual((await parRepo.findById(parId)).items, current.items);
  await pool.query("UPDATE service_order SET status = 'Cancelada' WHERE id = $1", [order.id]);
  assert.equal((await call(parRoute.PUT, "PUT", { id: parId }, { items: [{ ...item, qty: 4 }] })).status, 200);
  assert.equal((await parRepo.findById(parId)).total_usd, "42.00");

  const orderFirstPar = await createPar();
  await approve(orderFirstPar);
  await withPausedQuery(/INSERT INTO service_order\s/, async () => ordersRepo.create(await orderData(orderFirstPar), userId), async (pid, release, creating) => {
    const editing = parRepo.update(orderFirstPar, { items: [{ ...item, qty: 9 }] }, actor).then(() => null, (error) => error);
    try {
      await waitForBlock(pid);
      release();
      await creating;
      assert.equal((await editing)?.code, "PAR_HAS_ACTIVE_ORDERS");
    } finally {
      release();
      await editing;
    }
  });
  assert.equal((await parRepo.findById(orderFirstPar)).total_usd, "21.00");

  const editFirstPar = await createPar();
  await approve(editFirstPar);
  const editFirstEq = (await parRepo.findById(editFirstPar)).equipment[0].id;
  await withPausedQuery(/UPDATE par_equipment SET/, () => parRepo.updateEquipment(editFirstEq, { observaciones: "Trabajo actualizado antes de la orden" }, actor), async (pid, release, editing) => {
    const creating = ordersRepo.create(await orderData(editFirstPar), userId);
    const outcome = creating.then((value) => ({ value }), (error) => ({ error }));
    try {
      await waitForBlock(pid);
      release();
      await editing;
      const { value, error } = await outcome;
      if (error) throw error;
      assert.equal(value.work_description, "Trabajo actualizado antes de la orden");
    } finally {
      release();
      await outcome;
    }
  });
  console.log("PAR edit integration passed: roles, authenticated routes, totals, approval history, nested writes, cancelled orders and both concurrency orders.");
} finally {
  queryHook = undefined;
  hooks.deregister();
  errorLog.mock.restore();
  await pool.end();
  if (schemaCreated) await admin.query(`DROP SCHEMA ${schemaName} CASCADE`);
  await admin.end();
  delete globalThis.__maquitechPgPool;
  delete globalThis.__parTestSession;
}
