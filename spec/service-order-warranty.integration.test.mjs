import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { registerHooks } from "node:module";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import bcrypt from "bcryptjs";
import pg from "pg";
import { ROLES } from "../lib/permissions.js";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
const connectionString=process.env.DATABASE_URL || `postgresql://${encodeURIComponent(process.env.DB_USER || "postgres")}:${encodeURIComponent(process.env.DB_PASSWORD || "")}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "db_service"}`;
const schemaName=`warranty_test_${randomUUID().replaceAll("-","")}`;
const admin=new pg.Client({connectionString});
const pool=new pg.Pool({connectionString,max:6,options:`-c search_path=${schemaName},public -c statement_timeout=10000 -c lock_timeout=8000`});
globalThis.__maquitechPgPool=pool;
const root=new URL("../",import.meta.url);
const hooks=registerHooks({resolve(specifier,context,nextResolve){
  if(specifier==="@/auth")return {url:"data:text/javascript,export async function auth(){return globalThis.__warrantySession;}",shortCircuit:true};
  if(specifier==="next/server")return nextResolve("next/server.js",context);
  if(specifier.startsWith("@/") || specifier.startsWith(".") && !context.parentURL?.includes("/node_modules/")){
    const target=new URL(specifier.startsWith("@/")?specifier.slice(2):specifier,specifier.startsWith("@/")?root:context.parentURL);
    for(const url of [target,new URL(`${target.href}.js`),new URL(`${target.href}/index.js`)])if(fs.existsSync(url)&&fs.statSync(url).isFile())return nextResolve(url.href,context);
  }return nextResolve(specifier,context);
}});
const id=async(sql,params=[])=>(await pool.query(sql,params)).rows[0].id;
let created=false;
let server;
try {
  await admin.connect();await admin.query(`CREATE SCHEMA ${schemaName}`);created=true;
  await pool.query(fs.readFileSync("db/schema.sql","utf8").split("-- 057-service-order-warranty")[0].replace(/^CREATE EXTENSION.*$/m,""));
  async function actor(role,login){const userId=await id("INSERT INTO users(login,name,email,password_hash,role_id) SELECT $1::text,$1::text,$1::text||'@example.invalid','test',id FROM role WHERE name=$2 RETURNING id",[login,role]);return {userId,role,canApprove:role===ROLES.SUPER_ADMIN};}
  const manager=await actor(ROLES.SUPER_ADMIN,"warranty-admin");
  const coordinator=await actor(ROLES.COORDINADOR,"warranty-coordinator");
  const technician=await actor(ROLES.TECNICO,"warranty-technician");
  const clientId=await id("INSERT INTO client(codclie,description) VALUES('WARRANTY-TEST','Cliente ficticio de garantía') RETURNING id");
  const plantId=await id("INSERT INTO plant(name,code,client_id) VALUES('Planta ficticia','W-PLANT',$1) RETURNING id",[clientId]);
  const contactId=await id("INSERT INTO contact(name,client_id,plant_id) VALUES('Contacto ficticio',$1,$2) RETURNING id",[clientId,plantId]);
  const equipmentIds=[];for(let i=0;i<2;i++)equipmentIds.push(await id("INSERT INTO equipment(name,brand,model,serial,client_id,plant_id) VALUES('Equipo ficticio','Marca','Modelo',$1,$2,$3) RETURNING id",[`W-EQ-${i}`,clientId,plantId]));
  const technicalId=await id("INSERT INTO technical(cedula,name,user_id) VALUES('W-TECH','Técnico ficticio',$1) RETURNING id",[technician.userId]);
  const productId=await id("INSERT INTO product(code,description,cost,price,category,requires_technician) VALUES('W-LABOR','Técnico de referencia',10,10,'Servicio',true) RETURNING id");
  // Fila anterior a 057: valores y fechas deben conservarse al añadir la clasificación.
  const oldPar=await id("INSERT INTO par_header(par_number,client_id,plant_id,contact_id,created_by) VALUES('W-OLD',$1,$2,$3,$4) RETURNING id",[clientId,plantId,contactId,manager.userId]);
  const before=(await pool.query("SELECT * FROM par_header WHERE id=$1",[oldPar])).rows[0];
  const migration=await pool.connect();try{await migration.query("BEGIN");await migration.query(fs.readFileSync("db/migrations/057-service-order-warranty.sql","utf8"));await migration.query(fs.readFileSync("db/migrations/058-technician-unavailability.sql","utf8"));await migration.query("COMMIT");}finally{await migration.query("ROLLBACK");migration.release();}
  const after=(await pool.query("SELECT * FROM par_header WHERE id=$1",[oldPar])).rows[0];assert.equal(after.purpose,"Comercial");delete after.purpose;assert.deepEqual(after,before);
  const pars=await import("../lib/repositories/par.repository.js");
  const orders=await import("../lib/repositories/service-order.repository.js");
  const closure=await import("../lib/repositories/service-order-closure.repository.js");
  const labor=await import("../lib/repositories/service-order-labor.repository.js");
  const reports=await import("../lib/repositories/report.repository.js");
  const {serviceOrderSchema}=await import("../lib/validators/operational.schema.js");
  const {reportFiltersSchema}=await import("../lib/validators/report.schema.js");
  const {POST}=await import("../app/api/service-order/route.js");
  const reject=(fn,code)=>assert.rejects(fn,error=>error.code===code);
  async function newPar(purpose="Comercial"){
    const parId=await pars.create({purpose,clientId,plantId,contactId,exchangeRate:50,discountPercent:10,equipment:equipmentIds.map((equipmentId,index)=>({equipmentId,isMain:index===0,itemNo:index+1,tipo:"Equipo",observaciones:"Trabajo original ficticio"})),items:[{productId,descripcion:"Mano de obra",qty:8,valorUnitUsd:10,multiplicador:1,valorPercent:0,categoria:"Servicio"}]},manager.userId);
    await pars.updateStatus(parId,"Aprobado",{approvedBy:manager.userId,approvedAt:new Date().toISOString()});return pars.findById(parId);
  }
  let day=1;
  function payload(par,hours=8){const date=`2033-01-${String(day++).padStart(2,"0")}`;return {parId:par.id,equipmentIds:[equipmentIds[0]],workType:"External",serviceType:"Maintenance",callDate:"2033-01-01",scheduledStart:date+"T10:00:00Z",scheduledEnd:date+"T12:00:00Z",laborAllocations:[{parItemId:par.items[0].id,technicalId,hours}],leadTechnicianId:technicalId};}
  async function start(order){await orders.update(order.id,{status:"Aprobada"},manager);return orders.update(order.id,{status:"En Proceso"},manager);}
  async function ready(order,hours,excessReason=""){
    let state=await closure.getClosure(order.id,manager);
    state=await closure.updateClosure(order.id,{action:"hours",revision:state.order.closure_revision,actuals:state.allocations.map(row=>({allocationId:String(row.id),hours,note:hours===0?"Sin trabajo en prueba":""})),notes:"",excessReason},coordinator);
    for(const req of state.requirements)state=await closure.updateClosure(order.id,{action:"requirement",revision:state.order.closure_revision,equipmentId:req.equipment_id,category:req.category,notApplicable:true,justification:"No aplica en prueba aislada"},coordinator);
    return state;
  }
  const par=await newPar();
  const original=await orders.create({...payload(par),purchaseOrderNumber:"OC-FICTICIA",quotationNumber:"COT-FICTICIA"},manager.userId);await start(original);
  let state=await ready(original,8);await closure.updateClosure(original.id,{action:"close",revision:state.order.closure_revision},manager);
  const originalSnapshot=(await pool.query("SELECT * FROM service_order WHERE id=$1",[original.id])).rows[0];
  assert.equal(Number((await labor.getLaborBudget(par.id)).items[0].available_hours),0);
  const normalExcess=payload(par,1);await reject(()=>orders.create(normalExcess,manager.userId),"ORDER_LABOR_EXCEEDED");
  const warranty={...payload(par,3),orderKind:"Garantia",warrantyOrigin:"Registered",warrantyOriginOrderId:original.id,warrantyReason:"Revisar defecto posterior",warrantyWorks:[{equipmentId:equipmentIds[0],description:"Corregir defecto bajo garantía"}]};
  assert.equal(serviceOrderSchema.safeParse(warranty).success,true);
  for (const field of ["purchaseOrderNumber", "quotationNumber"]) await reject(() => orders.create({ ...warranty, [field]: "REFERENCIA-NO-PERMITIDA" }, manager.userId), "WARRANTY_INVALID");
  assert.equal(original.purchase_order_number, "OC-FICTICIA");
  assert.equal(original.quotation_number, "COT-FICTICIA");
  await reject(()=>orders.create(warranty,technician.userId),"WARRANTY_FORBIDDEN");
  await reject(()=>orders.create({...warranty,equipmentIds:[equipmentIds[1]],warrantyWorks:[{equipmentId:equipmentIds[1],description:"Equipo que no fue atendido"}]},manager.userId),"WARRANTY_INVALID");
  const otherPar=await newPar();await reject(()=>orders.create({...warranty,parId:otherPar.id},manager.userId),"WARRANTY_INVALID");
  const registered=await orders.create(warranty,coordinator.userId);
  assert.equal(registered.purchase_order_number, null);
  assert.equal(registered.quotation_number, null);
  for (const field of ["purchaseOrderNumber", "quotationNumber"]) await reject(() => orders.update(registered.id, { [field]: "NUEVA-REFERENCIA" }, manager), "WARRANTY_INVALID");
  // Simula una garantía anterior a la regla: editar motivo debe preservar referencias ocultas.
  await pool.query("UPDATE service_order SET purchase_order_number='OC-HISTORICA',quotation_number='COT-HISTORICA' WHERE id=$1", [registered.id]);
  await orders.update(registered.id, { warrantyReason: "Corrección de motivo sin tocar referencias antiguas" }, coordinator);
  const historical = await orders.findById(registered.id);
  assert.equal(historical.purchase_order_number, "OC-HISTORICA");
  assert.equal(historical.quotation_number, "COT-HISTORICA");
  await reject(() => orders.update(registered.id, { purchaseOrderNumber: null }, manager), "WARRANTY_INVALID");
  await reject(() => orders.update(registered.id, { quotationNumber: "REEMPLAZO" }, manager), "WARRANTY_INVALID");
  assert.equal(registered.order_kind,"Garantia");assert.equal(registered.equipment[0].description,"Corregir defecto bajo garantía");
  assert.equal((await pars.findById(par.id)).display_status,"Finalizado");assert.equal((await pars.findById(par.id)).warranty_open_orders,1);
  assert.equal(Number((await labor.getLaborBudget(par.id)).items[0].available_hours),0);
  await reject(()=>orders.update(registered.id,{orderKind:"Normal"},manager),"WARRANTY_INVALID");
  await reject(()=>orders.update(registered.id,{warrantyReason:"Cambio no autorizado"},technician),"WARRANTY_FORBIDDEN");
  await orders.update(registered.id,{warrantyReason:"Motivo actualizado de garantía",equipmentIds:[equipmentIds[0]],warrantyWorks:[{equipmentId:equipmentIds[0],description:"Trabajo actualizado bajo garantía"}]},coordinator);
  await reject(()=>orders.update(registered.id,{status:"Aprobada"},coordinator),"ORDER_APPROVAL_FORBIDDEN");
  await orders.update(registered.id,{status:"Aprobada"},manager);
  await orders.reschedule(registered.id,{scheduleRevision:(await orders.findById(registered.id)).schedule_revision,scheduledStart:"2033-02-01T10:00:00Z",scheduledEnd:"2033-02-01T12:00:00Z",laborAllocations:warranty.laborAllocations,leadTechnicianId:technicalId,reason:"Cambio de fecha de garantía"},manager);
  await start(registered);state=await ready(registered,5);
  await reject(()=>closure.updateClosure(registered.id,{action:"close",revision:state.order.closure_revision},manager),"ORDER_CLOSURE_INVALID");
  state=await ready(registered,5,"Defecto requirió trabajo adicional");
  await reject(()=>closure.updateClosure(registered.id,{action:"close",revision:state.order.closure_revision},coordinator),"ORDER_CLOSURE_FORBIDDEN");
  await closure.updateClosure(registered.id,{action:"close",revision:state.order.closure_revision},manager);
  assert.deepEqual((await pool.query("SELECT * FROM service_order WHERE id=$1",[original.id])).rows[0],originalSnapshot);
  assert.equal(Number((await labor.getLaborBudget(par.id)).items[0].available_hours),0);
  assert.equal((await pars.findById(par.id)).warranty_open_orders,0);
  const reference=await newPar("ReferenciaGarantia");
  for(const key of ["budgeted_hours","subtotal_usd","discount_percent","discount_amount_usd","total_usd","total_bs"])assert.equal(Number(reference[key]),0);
  assert.equal(Number(reference.items[0].qty),0);assert.equal(Number(reference.items[0].valor_unit_usd),0);
  await reject(()=>orders.create(payload(reference,1),manager.userId),"WARRANTY_INVALID");
  await reject(()=>pars.update(reference.id,{purpose:"Comercial"},manager),"PAR_RELATION_INVALID");
  await reject(()=>pool.query("UPDATE par_header SET purpose='Comercial' WHERE id=$1",[reference.id]),"23514");
  await pars.update(reference.id,{discountPercent:50},manager);assert.equal(Number((await pars.findById(reference.id)).discount_percent),0);
  const external={...payload(reference,4),orderKind:"Garantia",warrantyOrigin:"External",warrantyReference:"Servicio anterior DOC-FICTICIO",warrantyServiceDate:"2020-01-10",warrantyReason:"Atender garantía histórica",warrantyWorks:[{equipmentId:equipmentIds[0],description:"Reparación histórica bajo garantía"}]};
  // Una garantía externa no cambia estado comercial, pero sí bloquea edición del PAR.
  const onlyWarranty = await orders.create({...external,...payload(otherPar,1)},manager.userId);
  const linkedPar = await pars.findById(otherPar.id);
  assert.equal(linkedPar.display_status,"Aprobado");
  assert.equal(linkedPar.total_orders,1);
  assert.equal(linkedPar.warranty_open_orders,1);
  await reject(()=>pars.update(otherPar.id,{discountPercent:5},manager),"PAR_HAS_ACTIVE_ORDERS");
  await orders.updateStatus(onlyWarranty.id,"Cancelada",manager);
  assert.equal((await pars.findById(otherPar.id)).total_orders,0);
  for (const field of ["purchaseOrderNumber", "quotationNumber"]) await reject(() => orders.create({ ...external, [field]: "REFERENCIA-NO-PERMITIDA" }, manager.userId), "WARRANTY_INVALID");
  const legacy=await orders.create(external,manager.userId);
  assert.equal(legacy.warranty_service_date, "2020-01-10");
  // La edición reenvía el origen inmutable desde el navegador como YYYY-MM-DD.
  await orders.update(legacy.id, { ...external, warrantyServiceDate: legacy.warranty_service_date, warrantyReason: "Motivo externo corregido" }, coordinator);
  await reject(()=>orders.update(legacy.id,{warrantyServiceDate:"2020-01-11"},manager),"WARRANTY_INVALID");
  await start(legacy);state=await ready(legacy,2);await closure.updateClosure(legacy.id,{action:"close",revision:state.order.closure_revision},manager);
  assert.equal((await pars.findById(reference.id)).display_status,"Finalizado");
  assert.equal(Number((await labor.getLaborBudget(reference.id)).items[0].available_hours),0);
  const cancelled=await orders.create({...external,...payload(reference,2)},manager.userId);await orders.updateStatus(cancelled.id,"Cancelada",coordinator);
  assert.equal(Number((await labor.getLaborBudget(reference.id)).items[0].available_hours),0);
  await reject(()=>orders.create({...payload(otherPar),warrantyReason:"Datos ajenos a normal"},manager.userId),"WARRANTY_INVALID");
  const report=await reports.readReport(reportFiltersSchema.parse({type:"technician-hours"}),{name:"Prueba"});
  assert.equal(report.totals.technicians,1);assert.equal(report.totals.orders,3);
  assert.deepEqual(report.totals.byKind,[{kind:"Normal",estimated:"8.00",actual:"8.00"},{kind:"Garantia",estimated:"7.00",actual:"7.00"}]);
  const warrantyReport=await reports.readReport(reportFiltersSchema.parse({type:"technician-hours",orderKind:"Garantia"}),{name:"Prueba"});assert.equal(warrantyReport.rows.length,2);
  const refReport=await reports.readReport(reportFiltersSchema.parse({type:"pars",parPurpose:"ReferenciaGarantia"}),{name:"Prueba"});assert.equal(refReport.rows.length,1);assert.equal(refReport.totals.usd,"0.00");
  assert.equal((await orders.findAll({orderKind:"Normal"})).every(row=>row.order_kind==="Normal"),true);
  globalThis.__warrantySession={user:{id:coordinator.userId,role:coordinator.role,status:"Activo"}};
  const response=await POST(new Request("http://localhost/api/service-order",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...external,...payload(reference,1)})}));assert.equal(response.status,201);
  console.log("PASS: garantía registrada/externa, migración, permisos, alcance, presupuesto separado, reprogramación, cierre, cancelación y reportes; datos ficticios aislados.");
  if(process.argv.includes("--browser")) {
    await pool.query("UPDATE users SET password_hash=$2 WHERE id=$1",[manager.userId,await bcrypt.hash("Garantia-Prueba-2026!",10)]);
    const url=new URL(connectionString);url.searchParams.set("options",`-c search_path=${schemaName},public`);
    const stopFile=".private/stop-warranty-browser";
    if(fs.existsSync(stopFile))throw Error("Retire la señal anterior antes de iniciar otra prueba.");
    server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p","3113","-H","127.0.0.1"],{env:{...process.env,DATABASE_URL:url.toString(),AUTH_SECRET:"warranty-isolated-browser-test-2026-only",AUTH_URL:"http://localhost:3113",AUTH_TRUST_HOST:"true"},stdio:["ignore","pipe","pipe"],windowsHide:true});
    server.stdout.on("data",data=>process.stdout.write(data));server.stderr.on("data",data=>process.stderr.write(data));
    console.log("BROWSER: http://localhost:3113 · warranty-admin · Garantia-Prueba-2026! · O/S original="+original.id+" · PAR referencia="+reference.id);
    while(server.exitCode===null && !fs.existsSync(stopFile))await delay(1000);
    if(server.exitCode===null){server.kill();await new Promise(resolve=>server.once("exit",resolve));}
  }
} finally {
  if(server?.exitCode===null)server.kill();
  await pool.end();if(created)await admin.query(`DROP SCHEMA ${schemaName} CASCADE`);await admin.end();hooks.deregister();delete globalThis.__maquitechPgPool;delete globalThis.__warrantySession;
}
