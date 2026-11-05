import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { registerHooks } from "node:module";
import pg from "pg";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import swc from "next/dist/build/swc/index.js";
import { ROLES } from "../lib/permissions.js";

// Solo datos ficticios en un esquema con nombre aleatorio; se retira incluso ante fallos.
if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
const connectionString = process.env.DATABASE_URL || `postgresql://${encodeURIComponent(process.env.DB_USER || "postgres")}:${encodeURIComponent(process.env.DB_PASSWORD || "")}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "db_service"}`;
const schemaName = `unavailability_${randomUUID().replaceAll("-", "")}`;
const admin = new pg.Client({ connectionString });
const pool = new pg.Pool({ connectionString, max: 6, application_name: schemaName, options: `-c search_path=${schemaName},public -c statement_timeout=10000 -c lock_timeout=8000` });
globalThis.__maquitechPgPool = pool;
await swc.loadBindings();
const root = new URL("../", import.meta.url);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/auth") return { url: "unavailability-test:auth", shortCircuit: true };
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier.startsWith("@/") || (specifier.startsWith(".") && !context.parentURL?.includes("/node_modules/"))) {
      const target = new URL(specifier.startsWith("@/") ? specifier.slice(2) : specifier, specifier.startsWith("@/") ? root : context.parentURL);
      for (const url of [target, new URL(`${target.href}.js`), new URL(`${target.href}.jsx`), new URL(`${target.href}/index.js`)]) {
        if (fs.existsSync(url) && fs.statSync(url).isFile()) return nextResolve(url.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "unavailability-test:auth") return { format: "module", source: "export async function auth() { return globalThis.__unavailabilityTestSession; }", shortCircuit: true };
    if (url.startsWith(root.href) && url.endsWith(".jsx")) {
      const { code } = swc.transformSync(fs.readFileSync(new URL(url), "utf8"), {
        filename: new URL(url).pathname,
        jsc: { parser: { syntax: "ecmascript", jsx: true }, target: "es2022", transform: { react: { runtime: "automatic" } } },
        module: { type: "es6" },
      });
      return { format: "module", source: code, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

let schemaCreated = false;
try {
  await admin.connect();
  await admin.query(`CREATE SCHEMA ${schemaName}`);
  schemaCreated = true;
  const baseSchema = fs.readFileSync("db/schema.sql", "utf8").split("-- Vacaciones por días completos y reprogramación auditada")[0];
  await pool.query(baseSchema.replace(/^CREATE EXTENSION.*$/m, ""));
  const rolesBefore = (await pool.query("SELECT * FROM role ORDER BY id")).rows;
  const migrationClient = await pool.connect();
  try {
    await migrationClient.query("BEGIN");
    await migrationClient.query(fs.readFileSync("db/migrations/055-technician-vacations-rescheduling.sql", "utf8"));
    await migrationClient.query("COMMIT");
  } catch (error) { await migrationClient.query("ROLLBACK"); throw error; }
  finally { migrationClient.release(); }
  assert.deepEqual((await pool.query("SELECT * FROM role ORDER BY id")).rows, rolesBefore);
  // El escenario de migración 055 ya se comprobó; los repositorios actuales
  // también requieren la estructura de expediente y clasificación posterior.
  for (const file of ["056-service-order-photos-pending.sql", "057-service-order-warranty.sql", "058-technician-unavailability.sql"]) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (file.startsWith("058")) {
        const { migrateAndCheckUnavailability } = await import("./helpers/unavailability-migration.mjs");
        await migrateAndCheckUnavailability(client);
      } else await client.query(fs.readFileSync(`db/migrations/${file}`, "utf8"));
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  const parRepo = await import("../lib/repositories/par.repository.js");
  const orders = await import("../lib/repositories/service-order.repository.js");
  const labor = await import("../lib/repositories/service-order-labor.repository.js");
  const closure = await import("../lib/repositories/service-order-closure.repository.js");
  const calendar = await import("../lib/repositories/technician-calendar.repository.js");
  const reports = await import("../lib/repositories/report.repository.js");
  const { LaborAllocationEditor } = await import("../components/service-orders/LaborAllocationEditor.jsx");
  const availabilityRepo = await import("../lib/repositories/technician-unavailability.repository.js");
  const technical = await import("../lib/repositories/technical.repository.js");
  const id = async (sql, values = []) => (await pool.query(sql, values)).rows[0].id;
  const clientId = await id("INSERT INTO client(codclie,description) VALUES ('OS-FOUR','Cliente ficticio') RETURNING id");
  const plantId = await id("INSERT INTO plant(name,code,client_id) VALUES ('Planta ficticia','P-4',$1) RETURNING id", [clientId]);
  const contactId = await id("INSERT INTO contact(name,client_id,plant_id) VALUES ('Contacto ficticio',$1,$2) RETURNING id", [clientId, plantId]);
  const equipmentId = await id("INSERT INTO equipment(name,brand,model,serial,client_id,plant_id) VALUES ('Equipo ficticio','Marca','Modelo','OS-FOUR-1',$1,$2) RETURNING id", [clientId, plantId]);
  const userId = await id("INSERT INTO users(login,name,email,password_hash,role_id) SELECT 'os-four','Usuario ficticio','os-four@example.invalid','hash',id FROM role WHERE name='Administrador' RETURNING id");
  const actor = { userId, role: ROLES.ADMIN, canApprove: true, name: "Usuario ficticio" };
  const techs = [];
  for (let n = 1; n <= 5; n += 1) {
    techs.push({ id: await id("INSERT INTO technical(cedula,name) VALUES ($1,$2) RETURNING id", [`OS-FOUR-${n}`, `Tecnico ${n} ficticio`]), name: `Tecnico ${n} ficticio`, status: "Activo" });
  }
  const productId = await id("INSERT INTO product(code,description,cost,price,category,requires_technician) VALUES ('OS-FOUR','Mano de obra',10,10,'Servicio',true) RETURNING id");
  async function newPar() {
    const parId = await parRepo.create({ clientId, plantId, contactId, exchangeRate: 1,
      equipment: [{ equipmentId, isMain: true, itemNo: 1, tipo: "Equipo ficticio", observaciones: "Trabajo ficticio" }],
      items: [1, 2].map((itemNo) => ({ itemNo, productId, descripcion: `Mano de obra ${itemNo}`, qty: 8, valorUnitUsd: 10, multiplicador: 1, valorPercent: 0, categoria: "Servicio" })),
    }, userId);
    await parRepo.updateStatus(parId, "Aprobado", { approvedBy: userId, approvedAt: new Date().toISOString() });
    return parRepo.findById(parId);
  }
  const allocations = (par, count) => techs.slice(0, count).map((tech) => ({ parItemId: par.items[0].id, technicalId: tech.id, hours: 2 }));
  const data = (par, count, day = 1) => ({ parId: par.id, equipmentIds: [equipmentId], workType: "External", serviceType: "Maintenance",
    callDate: "2030-01-01", scheduledStart: `2030-01-${String(day).padStart(2, "0")}T10:00:00Z`, scheduledEnd: `2030-01-${String(day).padStart(2, "0")}T11:00:00Z`,
    laborAllocations: allocations(par, count), leadTechnicianId: techs[count - 1].id,
  });
  const rejectsCode = (fn, code) => assert.rejects(fn, (error) => error.code === code);

  // Cada categoría bloquea tanto órdenes normales como garantías. Cambiar categoría
  // mantiene identidad y audita ambos valores; cancelar permite volver a programar.
  for (const reasonType of ["Vacaciones", "DiasCompensatorios", "Enfermedad", "Permisos", "Otros"]) {
    const categoryPeriod = { reasonType, startDate: "2030-04-01", endDate: "2030-04-02", note: "Detalle privado ficticio" };
    const absence = await availabilityRepo.createUnavailability(techs[0].id, categoryPeriod, actor);
    const categoryPar = await newPar();
    const normal = { ...data(categoryPar, 1), scheduledStart: "2030-04-01T12:00:00Z", scheduledEnd: "2030-04-01T13:00:00Z" };
    const warranty = { ...normal, orderKind: "Garantia", warrantyOrigin: "External", warrantyReference: "Referencia ficticia", warrantyServiceDate: "2020-01-01", warrantyReason: "Atención histórica ficticia", warrantyWorks: [{ equipmentId, description: "Trabajo de garantía ficticio" }] };
    await rejectsCode(() => orders.create(normal, userId), "ORDER_TECHNICIAN_UNAVAILABLE");
    await rejectsCode(() => orders.create(warranty, userId), "ORDER_TECHNICIAN_UNAVAILABLE");
    await rejectsCode(() => availabilityRepo.createUnavailability(techs[0].id, { ...categoryPeriod, reasonType: "Permisos" }, actor), "UNAVAILABILITY_OVERLAP");
    const changed = await availabilityRepo.updateUnavailability(techs[0].id, absence.id, { ...categoryPeriod, reasonType: "Otros", revision: 1, reason: "Corrección ficticia de motivo" }, actor);
    const audit = (await availabilityRepo.listUnavailability(techs[0].id, actor)).events[0];
    assert.equal(audit.details.before.reason_type, reasonType);
    assert.equal(audit.details.after.reason_type, "Otros");
    await availabilityRepo.cancelUnavailability(techs[0].id, changed.id, { revision: changed.revision, reason: "Cancelación ficticia de prueba" }, actor);
    const allowed = await orders.create(warranty, userId);
    await orders.update(allowed.id, { status: "Cancelada" }, actor);
  }
  await rejectsCode(() => availabilityRepo.createUnavailability(techs[0].id, { reasonType: "Otros", startDate: "2030-04-01", endDate: "2030-04-01" }, actor), "SCHEDULING_INVALID");

  const simultaneous = await Promise.allSettled(["Vacaciones", "Enfermedad"].map(reasonType => availabilityRepo.createUnavailability(techs[4].id, { reasonType, startDate: "2030-05-01", endDate: "2030-05-01" }, actor)));
  assert.equal(simultaneous.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(simultaneous.find(result => result.status === "rejected").reason.code, "UNAVAILABILITY_OVERLAP");

  const period = { reasonType: "Enfermedad", startDate: "2030-01-10", endDate: "2030-01-12", note: "Nota administrativa ficticia y privada" };
  const unavailability = await availabilityRepo.createUnavailability(techs[0].id, period, actor);
  assert.equal((await technical.findById(techs[0].id)).status, "Activo");
  assert.equal((await technical.findById(techs[0].id)).unavailability[0].start_date, period.startDate);
  await rejectsCode(() => availabilityRepo.createUnavailability(techs[0].id, { ...period, startDate: "2030-01-12" }, actor), "UNAVAILABILITY_OVERLAP");
  await rejectsCode(() => availabilityRepo.updateUnavailability(techs[0].id, unavailability.id, { ...period, revision: 99, reason: "Cambio ficticio" }, actor), "SCHEDULING_CONFLICT");
  for (const role of [ROLES.COORDINADOR, ROLES.TECNICO, ROLES.USUARIO]) {
    const forbidden = { ...actor, role };
    await rejectsCode(() => availabilityRepo.createUnavailability(techs[0].id, period, forbidden), "SCHEDULING_FORBIDDEN");
    await rejectsCode(() => availabilityRepo.updateUnavailability(techs[0].id, unavailability.id, { ...period, revision: 1, reason: "Cambio ficticio" }, forbidden), "SCHEDULING_FORBIDDEN");
    await rejectsCode(() => availabilityRepo.cancelUnavailability(techs[0].id, unavailability.id, { revision: 1, reason: "Cambio ficticio" }, forbidden), "SCHEDULING_FORBIDDEN");
  }
  const publicList = await availabilityRepo.listUnavailability(techs[0].id, { ...actor, role: ROLES.COORDINADOR });
  assert.equal(publicList.canManage, false);
  assert.equal(publicList.unavailability[0].note, undefined);
  assert.equal(publicList.unavailability[0].reason_type, undefined);
  assert.ok((await technical.findAll()).every(t => t.unavailability.every(p => p.reason_type === undefined && p.note === undefined)));
  assert.deepEqual(publicList.events, []);
  for (const [index, role] of [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR].entries()) {
    const one = await availabilityRepo.createUnavailability(techs[4].id, { reasonType: "DiasCompensatorios", startDate: `2030-02-${10 + index}`, endDate: `2030-02-${10 + index}` }, { ...actor, role });
    const changed = await availabilityRepo.updateUnavailability(techs[4].id, one.id, { reasonType: "DiasCompensatorios", startDate: one.start_date, endDate: one.end_date, note: "Corrección", revision: 1, reason: "Cambio ficticio" }, { ...actor, role });
    await availabilityRepo.cancelUnavailability(techs[4].id, changed.id, { revision: changed.revision, reason: "Cancelación ficticia" }, { ...actor, role });
  }

  // Límites inclusivos y revalidación al crear/editar; incluido exclusivamente el cuarto técnico.
  for (const day of [10, 12]) await rejectsCode(async () => orders.create(data(await newPar(), 1, day), userId), "ORDER_TECHNICIAN_UNAVAILABLE");
  const boundaryPar = await newPar();
  const before = await orders.create({ ...data(boundaryPar, 1), scheduledStart: "2030-01-10T03:00:00Z", scheduledEnd: "2030-01-10T04:00:00Z" }, userId);
  const after = await orders.create({ ...data(boundaryPar, 1), scheduledStart: "2030-01-13T04:00:00Z", scheduledEnd: "2030-01-13T05:00:00Z" }, userId);
  assert.ok(before.id && after.id);
  await rejectsCode(() => orders.update(after.id, { scheduledStart: "2030-01-12T12:00:00Z", scheduledEnd: "2030-01-12T13:00:00Z" }, actor), "ORDER_TECHNICIAN_UNAVAILABLE");
  await availabilityRepo.createUnavailability(techs[3].id, { reasonType: "DiasCompensatorios", startDate: "2030-01-20", endDate: "2030-01-20" }, actor);
  await assert.rejects(async () => orders.create(data(await newPar(), 4, 20), userId), (err) => err.code === "ORDER_TECHNICIAN_UNAVAILABLE" && err.conflicts.length === 1 && err.conflicts[0].technical_id === techs[3].id);
  const renderPar = await newPar();
  const editorHtml = renderToStaticMarkup(React.createElement(LaborAllocationEditor, { budget: await labor.getLaborBudget(renderPar.id), technicians: await technical.findAll(), value: allocations(renderPar, 1), scheduledStart: "2030-01-10T12:00:00Z", scheduledEnd: "2030-01-10T13:00:00Z" }));
  assert.match(editorHtml, /no está disponible durante la programación seleccionada:/);
  assert.ok([...editorHtml.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].some((match) => match[2].includes(techs[0].name) && match[2].includes("no disponible:") && match[1].includes("disabled")));

  // Todos los estados abiertos impiden registrar o extender vacaciones, sin cambiar la orden.
  const open = await orders.create(data(await newPar(), 1, 16), userId);
  const extension = await availabilityRepo.createUnavailability(techs[0].id, { reasonType: "DiasCompensatorios", startDate: "2030-01-18", endDate: "2030-01-18" }, actor);
  for (const status of ["Pendiente", "Aprobada", "En Proceso"]) {
    if (status !== "Pendiente") await orders.update(open.id, { status }, actor);
    const snapshot = await orders.findById(open.id);
    const clashes = await availabilityRepo.previewUnavailabilityImpact(techs[0].id, { startDate: "2030-01-16", endDate: "2030-01-16" }, actor);
    assert.ok(clashes.orders.some((row) => row.id === open.id && row.status === status));
    await rejectsCode(() => availabilityRepo.createUnavailability(techs[0].id, { reasonType: "DiasCompensatorios", startDate: "2030-01-16", endDate: "2030-01-16" }, actor), "UNAVAILABILITY_OPEN_ORDERS");
    await rejectsCode(() => availabilityRepo.updateUnavailability(techs[0].id, extension.id, { reasonType: "DiasCompensatorios", startDate: "2030-01-16", endDate: "2030-01-18", revision: 1, reason: "Ampliación ficticia" }, actor), "UNAVAILABILITY_OPEN_ORDERS");
    assert.deepEqual(await orders.findById(open.id), snapshot);
  }
  await orders.update(open.id, { status: "Cancelada" }, actor);
  await availabilityRepo.createUnavailability(techs[0].id, { reasonType: "DiasCompensatorios", startDate: "2030-01-16", endDate: "2030-01-16" }, actor);

  // Reprogramar conserva identidad/equipos/horas por renglón, registra aprobación previa y vuelve a Pendiente.
  const par = await newPar();
  let order = await orders.create(data(par, 4, 17), userId);
  order = await orders.update(order.id, { status: "Aprobada" }, actor);
  const approved = order;
  const payload = { scheduleRevision: order.schedule_revision, scheduledStart: order.scheduled_start.toISOString(), scheduledEnd: order.scheduled_end.toISOString(),
    laborAllocations: allocations(par, 4).map((row, index) => index === 0 ? { ...row, technicalId: techs[4].id } : row), leadTechnicianId: techs[4].id, reason: "Sustitución por vacaciones futuras" };
  await rejectsCode(() => orders.reschedule(order.id, { ...payload, scheduleRevision: -1 }, actor), "SCHEDULING_INVALID");
  await rejectsCode(() => orders.reschedule(order.id, { ...payload, scheduleRevision: 999 }, actor), "SCHEDULING_CONFLICT");
  await rejectsCode(() => orders.reschedule(order.id, payload, { ...actor, role: ROLES.COORDINADOR }), "SCHEDULING_FORBIDDEN");
  await rejectsCode(() => orders.reschedule(order.id, { ...payload, laborAllocations: payload.laborAllocations.map((row) => ({ ...row, hours: 1 })) }, actor), "ORDER_RESCHEDULE_HOURS");
  await rejectsCode(() => orders.reschedule(order.id, { ...payload, scheduledStart: "2030-01-20T12:00:00Z", scheduledEnd: "2030-01-20T13:00:00Z" }, actor), "ORDER_TECHNICIAN_UNAVAILABLE");
  order = await orders.reschedule(order.id, payload, actor);
  assert.equal(order.status, "Pendiente"); assert.equal(order.approved_by, null); assert.equal(order.approved_at, null);
  assert.equal(order.order_code, approved.order_code); assert.equal(order.par_id, approved.par_id); assert.equal(order.worked_hours, approved.worked_hours);
  assert.equal(order.technical_id, techs[4].id); assert.equal(order.technicians.length, 4); assert.deepEqual(order.equipment, approved.equipment);
  const history = await orders.readScheduleHistory(order.id, actor);
  assert.equal(history[0].details.before.approved_by, userId);
  assert.equal(history[0].details.before.technicians.length, 4);
  assert.equal(history[0].details.before.labor_allocations[0].technical_id, techs[0].id);
  await rejectsCode(() => orders.readScheduleHistory(order.id, { ...actor, role: ROLES.COORDINADOR }), "SCHEDULING_FORBIDDEN");
  const agendaPending = await calendar.findCalendarData({ from: "2030-01-17T00:00:00Z", to: "2030-01-18T00:00:00Z" }, actor);
  assert.equal(agendaPending.events.filter((event) => event.service_order_id === order.id).length, 0);
  await availabilityRepo.createUnavailability(techs[0].id, { reasonType: "DiasCompensatorios", startDate: "2030-01-17", endDate: "2030-01-17" }, actor);
  order = await orders.update(order.id, { status: "Aprobada" }, actor);
  assert.equal((await calendar.findCalendarData({ from: "2030-01-17T00:00:00Z", to: "2030-01-18T00:00:00Z" }, actor)).events.filter((event) => event.service_order_id === order.id).length, 4);

  // Defensa frente a datos incorporados fuera del flujo: aprobar con conflicto nunca omite vacaciones.
  const injected = await id("INSERT INTO technical_unavailability(technical_id,start_date,end_date,created_by,updated_by,reason_type) VALUES($1,'2030-01-17','2030-01-17',$2,$2,'Permisos') RETURNING id", [techs[4].id, userId]);
  await rejectsCode(() => orders.update(order.id, { status: "En Proceso", confirmScheduleConflict: true }, actor), "ORDER_TECHNICIAN_UNAVAILABLE");
  const pendingBad = await orders.create(data(await newPar(), 1, 22), userId);
  const injectedPending = await id("INSERT INTO technical_unavailability(technical_id,start_date,end_date,created_by,updated_by,reason_type) VALUES($1,'2030-01-22','2030-01-22',$2,$2,'Permisos') RETURNING id", [techs[0].id, userId]);
  await rejectsCode(() => orders.update(pendingBad.id, { status: "Aprobada", confirmScheduleConflict: true }, actor), "ORDER_TECHNICIAN_UNAVAILABLE");
  await availabilityRepo.cancelUnavailability(techs[0].id, injectedPending, { revision: 1, reason: "Retiro de fixture inválido" }, actor);
  await availabilityRepo.cancelUnavailability(techs[4].id, injected, { revision: 1, reason: "Retiro de fixture inválido" }, actor);
  await orders.update(order.id, { status: "En Proceso" }, actor);
  await rejectsCode(() => orders.reschedule(order.id, { ...payload, scheduleRevision: order.schedule_revision }, actor), "ORDER_RESCHEDULE_LOCKED");

  // Cierre y reporte conservan estimación/real y atribuyen el trabajo a los técnicos reprogramados.
  let expediente = await closure.getClosure(order.id);
  expediente = await closure.updateClosure(order.id, { action: "hours", revision: expediente.order.closure_revision, actuals: expediente.allocations.map((row) => ({ allocationId: String(row.id), hours: 1.5, note: "" })), notes: "Servicio ficticio", excessReason: "" }, actor);
  for (const requirement of expediente.requirements) expediente = await closure.updateClosure(order.id, { action: "requirement", revision: expediente.order.closure_revision, equipmentId: requirement.equipment_id, category: requirement.category, notApplicable: true, justification: "No aplica en la prueba aislada" }, actor);
  expediente = await closure.updateClosure(order.id, { action: "close", revision: expediente.order.closure_revision }, actor);
  assert.equal(Number(expediente.order.worked_hours), 8); assert.equal(Number(expediente.order.actual_hours), 6);
  assert.equal(Number((await labor.getLaborBudget(par.id)).items[0].available_hours), 2);
  const report = await reports.readReport({ type: "technician-hours" }, actor);
  assert.equal(report.totals.technicians, 4); assert.equal(Number(report.totals.estimated), 8); assert.equal(Number(report.totals.actual), 6);
  assert.ok(report.groups.some((group) => group.id === techs[4].id)); assert.ok(!report.groups.some((group) => group.id === techs[0].id));
  await availabilityRepo.createUnavailability(techs[4].id, { reasonType: "DiasCompensatorios", startDate: "2030-01-17", endDate: "2030-01-17" }, actor);
  await rejectsCode(() => orders.reschedule(order.id, payload, actor), "ORDER_RESCHEDULE_LOCKED");

  // Calendario propio y filtros comerciales: solo períodos públicos y disponibilidad siempre visible.
  const techUser = await id("INSERT INTO users(login,name,email,password_hash,role_id) SELECT 'unavailability-tech','Técnico ficticio','tech@example.invalid','hash',id FROM role WHERE name='Técnico' RETURNING id");
  await pool.query("UPDATE technical SET user_id=$2 WHERE id=$1", [techs[0].id, techUser]);
  const ownAgenda = await calendar.findCalendarData({ from: "2030-01-01T00:00:00Z", to: "2030-02-01T00:00:00Z", technicianId: techs[4].id, clientId: randomUUID() }, { userId: techUser, role: ROLES.TECNICO });
  assert.ok(ownAgenda.unavailability.length > 0);
  assert.ok(ownAgenda.unavailability.every((v) => v.technician_id === techs[0].id && v.reason_type === undefined && v.note === undefined && v.created_by === undefined));
  assert.equal(ownAgenda.unavailability.find((v) => v.start_date === "2030-01-10").end_at, "2030-01-13");

  // Rutas reales con sesión controlada exclusivamente dentro de este proceso de pruebas.
  const route = await import("../app/api/technical/[id]/unavailability/route.js");
  const itemRoute = await import("../app/api/technical/[id]/unavailability/[unavailabilityId]/route.js");
  const scheduleRoute = await import("../app/api/service-order/[id]/schedule/route.js");
  const context = { params: Promise.resolve({ id: techs[0].id }) };
  const request = () => new Request("http://test.local/api", { method: "POST", body: JSON.stringify(period), headers: { "content-type": "application/json" } });
  globalThis.__unavailabilityTestSession = null;
  assert.equal((await route.GET(request(), context)).status, 401);
  for (const role of [ROLES.COORDINADOR, ROLES.TECNICO, ROLES.USUARIO]) {
    globalThis.__unavailabilityTestSession = { user: { id: userId, role } };
    assert.equal((await route.POST(request(), context)).status, 403);
    assert.equal((await itemRoute.PUT(request(), { params: Promise.resolve({ id: techs[0].id, unavailabilityId: unavailability.id }) })).status, 403);
    assert.equal((await itemRoute.DELETE(request(), { params: Promise.resolve({ id: techs[0].id, unavailabilityId: unavailability.id }) })).status, 403);
    assert.equal((await scheduleRoute.POST(request(), { params: Promise.resolve({ id: String(order.id) }) })).status, 403);
    assert.equal((await scheduleRoute.GET(request(), { params: Promise.resolve({ id: String(order.id) }) })).status, 403);
  }
  globalThis.__unavailabilityTestSession = { user: { id: userId, role: ROLES.COORDINADOR } };
  const coordinatorResponse = JSON.stringify(await (await route.GET(request(), context)).json());
  assert.ok(!coordinatorResponse.includes(period.note));
  assert.ok(!coordinatorResponse.includes("Enfermedad"));
  globalThis.__unavailabilityTestSession = { user: { id: userId, role: ROLES.ADMIN } };
  assert.equal((await route.POST(request(), context)).status, 409);

  // Dos sesiones esperan el mismo técnico. Solo una reserva incompatible puede confirmarse.
  async function waitForAdvisoryWaiters(count) {
    for (let n = 0; n < 100; n += 1) {
      const waiting = (await admin.query("SELECT count(*)::int AS count FROM pg_stat_activity WHERE application_name=$1 AND wait_event='advisory'", [schemaName])).rows[0].count;
      if (waiting >= count) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw Error("No se detectó la espera del bloqueo compartido entre sesiones.");
  }
  for (const unavailabilityFirst of [true, false]) {
    const racePar = await newPar();
    const day = unavailabilityFirst ? "10" : "11";
    const racePeriod = { reasonType: "Permisos", startDate: `2030-03-${day}`, endDate: `2030-03-${day}` };
    const raceData = { ...data(racePar, 1), scheduledStart: `2030-03-${day}T12:00:00Z`, scheduledEnd: `2030-03-${day}T13:00:00Z` };
    const blocker = await pool.connect();
    await blocker.query("BEGIN"); await availabilityRepo.lockTechnicianSchedules(blocker, [techs[0].id]);
    const collect = (fn) => fn().then((value) => ({ value }), (error) => ({ error }));
    const bookUnavailability = () => availabilityRepo.createUnavailability(techs[0].id, racePeriod, actor);
    const bookOrder = () => orders.create(raceData, userId);
    let first, second;
    try {
      first = collect(unavailabilityFirst ? bookUnavailability : bookOrder); await waitForAdvisoryWaiters(1);
      second = collect(unavailabilityFirst ? bookOrder : bookUnavailability); await waitForAdvisoryWaiters(2);
      await blocker.query("COMMIT");
    } finally { await blocker.query("ROLLBACK"); blocker.release(); }
    const results = await Promise.all([first, second]);
    assert.ok(results[0].value); assert.equal(results[1].error?.code, unavailabilityFirst ? "ORDER_TECHNICIAN_UNAVAILABLE" : "UNAVAILABILITY_OPEN_ORDERS");
  }
  console.log("Unavailability integration passed: migration, periods/permissions/API, all open states, fourth technician, rescheduling/audit, own calendar/privacy, closure/reports and concurrent reservations.");
} finally {
  await pool.end();
  if (schemaCreated) {
    assert.match(schemaName, /^unavailability_[a-f0-9]{32}$/);
    await admin.query(`DROP SCHEMA ${schemaName} CASCADE`);
  }
  await admin.end();
  hooks.deregister();
  delete globalThis.__maquitechPgPool;
  delete globalThis.__unavailabilityTestSession;
}
