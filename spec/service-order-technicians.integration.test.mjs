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
const schemaName = `os_four_${randomUUID().replaceAll("-", "")}`;
const admin = new pg.Client({ connectionString });
const pool = new pg.Pool({ connectionString, max: 4, options: `-c search_path=${schemaName},public -c statement_timeout=10000 -c lock_timeout=8000` });
globalThis.__maquitechPgPool = pool;
await swc.loadBindings();
const root = new URL("../", import.meta.url);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/link") return nextResolve("next/link.js", context);
    if (specifier.startsWith("@/") || (specifier.startsWith(".") && !context.parentURL?.includes("/node_modules/"))) {
      const target = new URL(specifier.startsWith("@/") ? specifier.slice(2) : specifier, specifier.startsWith("@/") ? root : context.parentURL);
      for (const url of [target, new URL(`${target.href}.js`), new URL(`${target.href}.jsx`), new URL(`${target.href}/index.js`)]) {
        if (fs.existsSync(url) && fs.statSync(url).isFile()) return nextResolve(url.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
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
  await pool.query(fs.readFileSync("db/schema.sql", "utf8").replace(/^CREATE EXTENSION.*$/m, ""));
  const parRepo = await import("../lib/repositories/par.repository.js");
  const orders = await import("../lib/repositories/service-order.repository.js");
  const labor = await import("../lib/repositories/service-order-labor.repository.js");
  const closure = await import("../lib/repositories/service-order-closure.repository.js");
  const calendar = await import("../lib/repositories/technician-calendar.repository.js");
  const reports = await import("../lib/repositories/report.repository.js");
  const { ServiceOrderPreview } = await import("../components/service-orders/ServiceOrderPreview.jsx");
  const { ServiceOrderPrintSheet } = await import("../components/service-orders/ServiceOrderPrintSheet.jsx");
  const { LaborAllocationEditor, validateLaborDistribution } = await import("../components/service-orders/LaborAllocationEditor.jsx");
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

  // Evolución desde el límite anterior, sin modificar órdenes ya guardadas.
  const legacyFunction = fs.readFileSync("db/migrations/036-normalize-service-orders.sql", "utf8")
    .match(/CREATE OR REPLACE FUNCTION enforce_service_order_technician_limit\(\)[\s\S]*?\$\$ LANGUAGE plpgsql;/)[0];
  await pool.query(legacyFunction);
  const old = await orders.create(data(await newPar(), 3), userId);
  await rejectsCode(() => pool.query("INSERT INTO service_order_technician(service_order_id,technical_id) VALUES ($1,$2)", [old.id, techs[3].id]), "23514");
  const beforeMigration = await orders.findById(old.id);
  const migrationClient = await pool.connect();
  try {
    await migrationClient.query("BEGIN");
    await migrationClient.query(fs.readFileSync("db/migrations/054-service-order-four-technicians.sql", "utf8"));
    await migrationClient.query("COMMIT");
  } finally { await migrationClient.query("ROLLBACK"); migrationClient.release(); }
  assert.deepEqual(await orders.findById(old.id), beforeMigration);
  await pool.query("INSERT INTO service_order_technician(service_order_id,technical_id) VALUES ($1,$2)", [old.id, techs[3].id]);
  await rejectsCode(() => pool.query("INSERT INTO service_order_technician(service_order_id,technical_id) VALUES ($1,$2)", [old.id, techs[4].id]), "23514");

  // Crear y aprobar con 1, 2, 3 y 4; el cuarto puede ser responsable.
  let four, fourPar;
  for (const count of [1, 2, 3, 4]) {
    const par = await newPar();
    let order = await orders.create(data(par, count, count), userId);
    assert.equal(order.technicians.length, count);
    assert.equal(order.technical_id, techs[count - 1].id);
    assert.equal(Number(order.worked_hours), count * 2);
    order = await orders.update(order.id, { status: "Aprobada" }, actor);
    assert.equal(order.status, "Aprobada");
    if (count === 4) { four = order; fourPar = par; }
  }
  const editablePar = await newPar();
  let editable = await orders.create(data(editablePar, 3, 10), userId);
  editable = await orders.update(editable.id, { laborAllocations: allocations(editablePar, 4), leadTechnicianId: techs[3].id }, actor);
  assert.equal(editable.technicians.length, 4);
  assert.equal(editable.technical_id, techs[3].id);
  const five = [...allocations(editablePar, 4), { parItemId: editablePar.items[1].id, technicalId: techs[4].id, hours: 1 }];
  await rejectsCode(() => orders.update(editable.id, { laborAllocations: five }, actor), "ORDER_TECHNICIANS_INVALID");
  const fifthPar = await newPar();
  await rejectsCode(() => orders.create({ ...data(fifthPar, 4), laborAllocations: [...allocations(fifthPar, 4), { parItemId: fifthPar.items[1].id, technicalId: techs[4].id, hours: 1 }] }, userId), "ORDER_TECHNICIANS_INVALID");
  await rejectsCode(() => orders.update(four.id, { laborAllocations: allocations(fourPar, 3) }, actor), "ORDER_LOCKED");
  await rejectsCode(() => orders.update(editable.id, { laborAllocations: [...allocations(editablePar, 3), allocations(editablePar, 3)[0]] }, actor), "ORDER_LABOR_INVALID");
  await rejectsCode(() => orders.update(editable.id, { laborAllocations: allocations(editablePar, 4), leadTechnicianId: techs[4].id }, actor), "ORDER_TECHNICIANS_INVALID");
  await pool.query("UPDATE technical SET status='Inactivo' WHERE id=$1", [techs[3].id]);
  await rejectsCode(() => orders.update(editable.id, { status: "Aprobada" }, actor), "ORDER_APPROVAL_INVALID");
  const inactivePar = await newPar();
  await rejectsCode(() => orders.create(data(inactivePar, 4, 11), userId), "ORDER_TECHNICIANS_INVALID");
  await pool.query("UPDATE technical SET status='Activo' WHERE id=$1", [techs[3].id]);

  // El cuarto técnico participa en agenda y en los conflictos de aprobación.
  const agenda = await calendar.findCalendarData({ from: "2030-01-04T00:00:00Z", to: "2030-01-05T00:00:00Z" }, actor);
  assert.equal(agenda.events.filter((event) => event.service_order_id === four.id).length, 4);
  assert.ok(agenda.events.some((event) => event.technician_id === techs[3].id));
  const conflictPar = await newPar();
  const conflict = await orders.create({ ...data(conflictPar, 1, 4), laborAllocations: [{ parItemId: conflictPar.items[0].id, technicalId: techs[3].id, hours: 1 }], leadTechnicianId: techs[3].id }, userId);
  await assert.rejects(() => orders.update(conflict.id, { status: "Aprobada" }, actor), (error) => error.code === "ORDER_SCHEDULE_CONFLICT" && error.conflicts.some((row) => row.technician_id === techs[3].id));

  // Validación del editor y representación de la vista/impresión con los cuatro nombres.
  const budget = await labor.getLaborBudget(editablePar.id, editable.id);
  assert.equal(validateLaborDistribution(allocations(editablePar, 4), budget), "");
  assert.match(validateLaborDistribution(five, budget), /hasta 4/);
  const editorHtml = renderToStaticMarkup(React.createElement(LaborAllocationEditor, { budget, technicians: techs, value: allocations(editablePar, 4), leadTechnicianId: techs[3].id }));
  assert.match(editorHtml, /Máximo 4 técnicos/);
  const fifthOptions = [...editorHtml.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].filter((match) => match[2] === techs[4].name);
  assert.equal(fifthOptions.length, 4);
  assert.ok(fifthOptions.every((match) => match[1].includes("disabled")));
  const threeHtml = renderToStaticMarkup(React.createElement(LaborAllocationEditor, { budget, technicians: techs, value: allocations(editablePar, 3), leadTechnicianId: techs[2].id }));
  const fourthOptions = [...threeHtml.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].filter((match) => match[2] === techs[3].name);
  assert.equal(fourthOptions.length, 3);
  assert.ok(fourthOptions.every((match) => !match[1].includes("disabled")));
  for (const Component of [ServiceOrderPreview, ServiceOrderPrintSheet]) {
    const html = renderToStaticMarkup(React.createElement(Component, { order: four }));
    for (const tech of techs.slice(0, 4)) assert.ok(html.includes(tech.name));
  }

  // Cierre: exige las cuatro asignaciones y sustituye 8 h estimadas por 6 reales.
  await orders.update(four.id, { status: "En Proceso" }, actor);
  let expediente = await closure.getClosure(four.id);
  const actuals = expediente.allocations.map((row) => ({ allocationId: String(row.id), hours: 1.5, note: "" }));
  await rejectsCode(() => closure.updateClosure(four.id, { action: "hours", revision: expediente.order.closure_revision, actuals: actuals.slice(0, 3), notes: "", excessReason: "" }, actor), "ORDER_CLOSURE_INVALID");
  expediente = await closure.updateClosure(four.id, { action: "hours", revision: expediente.order.closure_revision, actuals, notes: "Servicio ficticio", excessReason: "" }, actor);
  for (const requirement of expediente.requirements) {
    expediente = await closure.updateClosure(four.id, { action: "requirement", revision: expediente.order.closure_revision, equipmentId: requirement.equipment_id, category: requirement.category, notApplicable: true, justification: "No aplica en este caso ficticio" }, actor);
  }
  expediente = await closure.updateClosure(four.id, { action: "close", revision: expediente.order.closure_revision }, actor);
  assert.equal(expediente.order.status, "Completada");
  assert.equal(Number(expediente.order.worked_hours), 8);
  assert.equal(Number(expediente.order.actual_hours), 6);
  const remaining = await labor.getLaborBudget(fourPar.id);
  assert.equal(Number(remaining.items[0].available_hours), 2);
  assert.equal((await parRepo.findById(fourPar.id)).budgeted_hours, fourPar.budgeted_hours);
  const report = await reports.readReport({ type: "technician-hours" }, actor);
  assert.equal(report.totals.technicians, 4);
  assert.equal(Number(report.totals.estimated), 8);
  assert.equal(Number(report.totals.actual), 6);
  const fourth = report.groups.find((group) => group.id === techs[3].id);
  assert.equal(Number(fourth.estimated), 2);
  assert.equal(Number(fourth.actual), 1.5);
  console.log("Four-technician integration passed: migration, create/edit/approve, fifth rejected, lead, agenda/conflicts, UI/print rendering, closure and report.");
} finally {
  await pool.end();
  if (schemaCreated) {
    assert.match(schemaName, /^os_four_[a-f0-9]{32}$/);
    await admin.query(`DROP SCHEMA ${schemaName} CASCADE`);
  }
  await admin.end();
  hooks.deregister();
  delete globalThis.__maquitechPgPool;
}
