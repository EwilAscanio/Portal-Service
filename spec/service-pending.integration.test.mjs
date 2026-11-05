import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { registerHooks } from "node:module";
import pg from "pg";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import swc from "next/dist/build/swc/index.js";
import { ROLES } from "../lib/permissions.js";

if(fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
const connectionString=process.env.DATABASE_URL || `postgresql://${encodeURIComponent(process.env.DB_USER || "postgres")}:${encodeURIComponent(process.env.DB_PASSWORD || "")}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "db_service"}`;
const schemaName=`pending_test_${randomUUID().replaceAll("-","")}`;
const admin=new pg.Client({connectionString});
const pool=new pg.Pool({connectionString,max:6,options:`-c search_path=${schemaName},public -c statement_timeout=10000 -c lock_timeout=8000`});
globalThis.__maquitechPgPool=pool;
const storage=path.resolve(".private",`pending-test-${randomUUID()}`);
fs.mkdirSync(storage,{recursive:true});
process.env.SERVICE_ORDER_DOCUMENTS_DIR=storage;
await swc.loadBindings();
const root=new URL("../",import.meta.url);
const hooks=registerHooks({
  resolve(specifier,context,nextResolve) {
    if(specifier==="@/auth") return {url:"pending-test:auth",shortCircuit:true};
    if(specifier==="next/server") return nextResolve("next/server.js",context);
    if(specifier.startsWith("@/") || (specifier.startsWith(".") && !context.parentURL?.includes("/node_modules/"))) {
      const target=new URL(specifier.startsWith("@/") ? specifier.slice(2) : specifier,specifier.startsWith("@/") ? root : context.parentURL);
      for(const url of [target,new URL(`${target.href}.js`),new URL(`${target.href}.jsx`),new URL(`${target.href}/index.js`)]) if(fs.existsSync(url)&&fs.statSync(url).isFile()) return nextResolve(url.href,context);
    }
    return nextResolve(specifier,context);
  },
  load(url,context,nextLoad) {
    if(url==="pending-test:auth") return {format:"module",source:"export async function auth(){return globalThis.__pendingSession;}",shortCircuit:true};
    if(url.startsWith(root.href)&&url.endsWith(".jsx")) return {format:"module",shortCircuit:true,source:swc.transformSync(fs.readFileSync(new URL(url),"utf8"),{filename:new URL(url).pathname,jsc:{parser:{syntax:"ecmascript",jsx:true},target:"es2022",transform:{react:{runtime:"automatic"}}},module:{type:"es6"}}).code};
    return nextLoad(url,context);
  },
});
let created=false;
let server;
let serverExit;
try {
  await admin.connect();await admin.query(`CREATE SCHEMA ${schemaName}`);created=true;
  const base=fs.readFileSync("db/schema.sql","utf8").split("-- 056-service-order-photos-pending")[0].replace(/^CREATE EXTENSION.*$/m,"");
  await pool.query(base);
  // El código vigente necesita la clasificación 057. Aplicarla antes de sembrar
  // mantiene abajo la prueba de preservación de la migración 056 sobre una O/S.
  const compatibility=await pool.connect();
  try { await compatibility.query("BEGIN");await compatibility.query(fs.readFileSync("db/migrations/057-service-order-warranty.sql","utf8"));await compatibility.query(fs.readFileSync("db/migrations/058-technician-unavailability.sql","utf8"));await compatibility.query("COMMIT"); }
  finally { await compatibility.query("ROLLBACK");compatibility.release(); }
  const parRepo=await import("../lib/repositories/par.repository.js");
  const orders=await import("../lib/repositories/service-order.repository.js");
  const closure=await import("../lib/repositories/service-order-closure.repository.js");
  const pending=await import("../lib/repositories/service-pending.repository.js");
  const files=await import("../lib/service-order-storage.js");
  const { closureActionSchema }=await import("../lib/validators/service-order-closure.schema.js");
  const id=async(sql,values=[]) => (await pool.query(sql,values)).rows[0].id;
  const makeActor=async(role,login)=>({role,userId:await id("INSERT INTO users(login,name,email,password_hash,role_id) SELECT $1,$1,$2,'hash',id FROM role WHERE name=$3 RETURNING id",[login,login+"@example.invalid",role]),canApprove:[ROLES.ADMIN,ROLES.SUPER_ADMIN,ROLES.SUPERVISOR].includes(role)});
  const manager=await makeActor(ROLES.ADMIN,"pending-admin");
  const coordinator=await makeActor(ROLES.COORDINADOR,"pending-coordinator");
  const technician=await makeActor(ROLES.TECNICO,"pending-technician");
  const outsider=await makeActor(ROLES.TECNICO,"pending-outsider");
  const basic=await makeActor(ROLES.USUARIO,"pending-user");
  const techId=await id("INSERT INTO technical(cedula,name,user_id) VALUES('PENDING-TEST','Técnico ficticio',$1) RETURNING id",[technician.userId]);
  const otherTech=await id("INSERT INTO technical(cedula,name,user_id) VALUES('PENDING-OTHER','Otro técnico ficticio',$1) RETURNING id",[outsider.userId]);
  const clientId=await id("INSERT INTO client(codclie,description) VALUES('PENDING-TEST','Cliente ficticio') RETURNING id");
  const plantId=await id("INSERT INTO plant(name,code,client_id) VALUES('Planta ficticia','P-TEST',$1) RETURNING id",[clientId]);
  const contactId=await id("INSERT INTO contact(name,client_id,plant_id) VALUES('Contacto ficticio',$1,$2) RETURNING id",[clientId,plantId]);
  const equipmentId=await id("INSERT INTO equipment(name,brand,model,serial,client_id,plant_id) VALUES('Equipo ficticio','Marca','Modelo','PENDING-TEST',$1,$2) RETURNING id",[clientId,plantId]);
  const productId=await id("INSERT INTO product(code,description,cost,price,category,requires_technician) VALUES('PENDING-TEST','Mano de obra',10,10,'Servicio',true) RETURNING id");
  let day=1;
  async function newOrder(person=techId) {
    const parId=await parRepo.create({clientId,plantId,contactId,exchangeRate:1,equipment:[{equipmentId,isMain:true,itemNo:1,tipo:"Equipo",observaciones:"Trabajo ficticio"}],items:[{itemNo:1,productId,descripcion:"Mano de obra",qty:8,valorUnitUsd:10,multiplicador:1,valorPercent:0,categoria:"Servicio"}]},manager.userId);
    await parRepo.updateStatus(parId,"Aprobado",{approvedBy:manager.userId,approvedAt:new Date().toISOString()});
    const par=await parRepo.findById(parId);
    const date=`2031-01-${String(day++).padStart(2,"0")}`;
    const order=await orders.create({parId,equipmentIds:[equipmentId],workType:"External",serviceType:"Maintenance",callDate:"2031-01-01",scheduledStart:date+"T10:00:00Z",scheduledEnd:date+"T12:00:00Z",laborAllocations:[{parItemId:par.items[0].id,technicalId:person,hours:4}],leadTechnicianId:person},manager.userId);
    await orders.update(order.id,{status:"Aprobada"},manager);return orders.update(order.id,{status:"En Proceso"},manager);
  }
  const order=await newOrder();
  const before=await orders.findById(order.id);
  const migration=await pool.connect();
  try {await migration.query("BEGIN");await migration.query(fs.readFileSync("db/migrations/056-service-order-photos-pending.sql","utf8"));await migration.query("COMMIT");}
  finally {await migration.query("ROLLBACK");migration.release();}
  assert.deepEqual(await orders.findById(order.id),before);
  const reject=(fn,code)=>assert.rejects(fn,(error)=>error.code===code);
  let state=await closure.getClosure(order.id,technician);
  assert.equal(state.fieldWork.editable,true);
  assert.equal((await closure.getClosure(order.id,outsider)).fieldWork,null);
  const lines=[{id:randomUUID(),description:"Cambiar sello pendiente"},{id:randomUUID(),description:"Revisar protección pendiente"}];
  const save=(items,actor=technician,revision=state.order.closure_revision)=>closure.updateClosure(order.id,{action:"pendings",items,revision},actor);
  assert.equal(closureActionSchema.safeParse({action:"pendings",revision:0,items:[{id:randomUUID(),description:"  "}]}).success,false);
  state=await save(lines);
  assert.equal((await pending.listPending({},manager)).total,0);
  assert.equal((await pending.pendingSummary(manager)).total,0);
  await reject(()=>save(lines,outsider),"ORDER_CLOSURE_FORBIDDEN");
  await reject(()=>save(lines,technician,0),"ORDER_CLOSURE_CONFLICT");
  await reject(()=>closure.updateClosure(order.id,{action:"hours",revision:state.order.closure_revision,actuals:[]},technician),"ORDER_CLOSURE_FORBIDDEN");
  await reject(()=>closure.updateClosure(order.id,{action:"close",revision:state.order.closure_revision},coordinator),"ORDER_CLOSURE_FORBIDDEN");
  await reject(()=>closure.updateClosure(order.id,{action:"close",revision:state.order.closure_revision},manager),"ORDER_CLOSURE_INVALID");
  const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ2kAAAAASUVORK5CYII=","base64");
  const photo=()=>files.prepareClosureFile(new File([png],"foto-ficticia.png",{type:"image/png"}));
  await reject(()=>files.prepareClosureFile({size:10485761,arrayBuffer:async()=>new ArrayBuffer(0)}),"ORDER_CLOSURE_TOO_LARGE");
  await reject(()=>files.prepareClosureFile(new File(["invalid"],"foto.png",{type:"image/png"})),"ORDER_CLOSURE_INVALID");
  const pdf=await files.prepareClosureFile(new File(["%PDF-1.0\n%%EOF"],"documento.pdf",{type:"application/pdf"}));
  await reject(()=>closure.addOrderPhoto(order.id,{revision:state.order.closure_revision},pdf,technician),"ORDER_CLOSURE_INVALID");
  for(let n=0;n<4;n++) state=await closure.addOrderPhoto(order.id,{revision:state.order.closure_revision},await photo(),technician);
  const revision=state.order.closure_revision;
  const uploads=await Promise.allSettled([photo(),photo()].map(async(file)=>closure.addOrderPhoto(order.id,{revision},await file,technician)));
  assert.equal(uploads.filter((r)=>r.status==="fulfilled").length,1);
  assert.equal(uploads.find((r)=>r.status==="rejected").reason.code,"ORDER_CLOSURE_CONFLICT");
  state=await closure.getClosure(order.id,technician);
  assert.equal(state.fieldWork.photos.filter((row)=>!row.retired_at).length,5);
  await reject(async()=>closure.addOrderPhoto(order.id,{revision:state.order.closure_revision},await photo(),technician),"ORDER_CLOSURE_INVALID");
  const oldPhoto=state.fieldWork.photos[0];
  await reject(()=>closure.findOrderPhoto(order.id,oldPhoto.id,outsider),"ORDER_CLOSURE_FORBIDDEN");
  assert.deepEqual(await files.readClosureFile(await closure.findOrderPhoto(order.id,oldPhoto.id,technician)),png);
  state=await closure.addOrderPhoto(order.id,{revision:state.order.closure_revision,replaceId:oldPhoto.id},await photo(),technician);
  assert.equal(state.fieldWork.photos.length,6);
  assert.equal(state.fieldWork.photos.filter((row)=>!row.retired_at).length,5);
  await reject(()=>pool.query(`INSERT INTO service_order_photo(id,service_order_id,slot,storage_key,original_name,mime_type,byte_size,sha256,uploaded_by)
    SELECT $1,service_order_id,slot,$2,original_name,mime_type,byte_size,sha256,uploaded_by FROM service_order_photo WHERE id=$3`,[randomUUID(),randomUUID()+".png",state.fieldWork.photos.find((row)=>!row.retired_at).id]),"23505");
  const {ServiceOrderFieldWork}=await import("../components/service-orders/ServiceOrderFieldWork.jsx");
  const markup=renderToStaticMarkup(React.createElement(ServiceOrderFieldWork,{orderId:order.id,fieldWork:state.fieldWork,items:lines,dirty:false,busy:false}));
  assert.match(markup,/Fotos del servicio/);assert.match(markup,/Guardar pendientes/);assert.equal((markup.match(/<img /g)||[]).length,5);
  async function ready(target) {
    let snapshot=await closure.getClosure(target.id,manager);
    snapshot=await closure.updateClosure(target.id,{action:"hours",revision:snapshot.order.closure_revision,actuals:snapshot.allocations.map((row)=>({allocationId:String(row.id),hours:2,note:""})),notes:"",excessReason:""},manager);
    for(const requirement of snapshot.requirements) snapshot=await closure.updateClosure(target.id,{action:"requirement",revision:snapshot.order.closure_revision,equipmentId:requirement.equipment_id,category:requirement.category,notApplicable:true,justification:"No aplica en prueba ficticia"},manager);
    return snapshot;
  }
  state=await ready(order);
  // Fallo durante publicación: también revierte el cierre y sus horas confirmadas.
  await pool.query("CREATE FUNCTION fail_pending_test() RETURNS trigger AS $$ BEGIN IF NEW.status='Pendiente' THEN RAISE EXCEPTION 'fallo ficticio'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql; CREATE TRIGGER fail_pending_test BEFORE UPDATE ON service_pending_item FOR EACH ROW EXECUTE FUNCTION fail_pending_test()");
  await assert.rejects(()=>closure.updateClosure(order.id,{action:"close",revision:state.order.closure_revision},manager));
  assert.equal((await orders.findById(order.id)).status,"En Proceso");
  assert.equal((await pending.listPending({},manager)).total,0);
  await pool.query("DROP TRIGGER fail_pending_test ON service_pending_item; DROP FUNCTION fail_pending_test()");
  state=await closure.updateClosure(order.id,{action:"close",revision:state.order.closure_revision},manager);
  assert.equal(state.order.status,"Completada");assert.equal(state.fieldWork.editable,false);
  assert.equal((await pending.listPending({},manager)).total,2);
  await reject(()=>closure.updateClosure(order.id,{action:"close",revision:state.order.closure_revision},manager),"ORDER_CLOSURE_LOCKED");
  await reject(()=>save(lines,technician,state.order.closure_revision),"ORDER_CLOSURE_LOCKED");
  await reject(()=>closure.retireOrderPhoto(order.id,oldPhoto.id,{revision:state.order.closure_revision,reason:"Retiro tardío"},technician),"ORDER_CLOSURE_LOCKED");
  const published=(await pending.listPending({},manager)).items;
  assert.equal(published[0].client_code,"PENDING-TEST");assert.equal(published[0].plant_name,"Planta ficticia");
  await pool.query("UPDATE client SET description='Nombre nuevo ficticio' WHERE id=$1",[clientId]);
  assert.equal((await pending.listPending({},manager)).items[0].client_name,"Cliente ficticio");
  assert.equal((await pending.listPending({},outsider)).total,0);
  assert.equal((await pending.listPending({},technician)).total,2);
  assert.equal((await pending.pendingSummary(technician)).total,2);
  assert.equal(await pending.pendingSummary(basic),null);
  await reject(()=>pending.listPending({},basic),"ORDER_CLOSURE_FORBIDDEN");
  const item=published[0];
  const completion={revision:item.revision,resolution:"Se sustituyó la pieza en la revisión posterior"};
  await reject(()=>pending.completePending(item.id,completion,technician),"ORDER_CLOSURE_FORBIDDEN");
  const resolutions=await Promise.allSettled([pending.completePending(item.id,completion,coordinator),pending.completePending(item.id,completion,manager)]);
  assert.equal(resolutions.filter((r)=>r.status==="fulfilled").length,1);
  assert.equal((await pending.pendingSummary(manager)).total,1);
  const completed=(await pending.listPending({status:"Completado"},manager)).items[0];
  assert.equal(completed.events.length,2);assert.equal(completed.description,item.description);
  assert.equal((await orders.findById(order.id)).status,"Completada");
  await reject(()=>pool.query("UPDATE service_pending_item SET description='Alteración' WHERE id=$1",[item.id]),"23514");
  const cancelled=await newOrder();
  let draft=await closure.getClosure(cancelled.id,manager);
  draft=await closure.updateClosure(cancelled.id,{action:"pendings",revision:draft.order.closure_revision,items:[{id:randomUUID(),description:"No publicar cancelada"}]},technician);
  await orders.update(cancelled.id,{status:"Cancelada"},manager);
  assert.equal((await pending.listPending({status:""},manager)).total,2);
  const another=await newOrder(otherTech);await ready(another);
  let other=await closure.getClosure(another.id,manager);
  other=await closure.updateClosure(another.id,{action:"pendings",revision:other.order.closure_revision,items:[{id:randomUUID(),description:"Pendiente de otro técnico"}]},outsider);
  await closure.updateClosure(another.id,{action:"close",revision:other.order.closure_revision},manager);
  assert.equal((await pending.listPending({status:""},technician)).total,2);
  assert.equal((await pending.listPending({},outsider)).total,1);
  const api=await import("../app/api/pending/route.js");
  const dashboard=await import("../app/api/dashboard/route.js");
  assert.equal((await api.GET(new Request("http://localhost/api/pending"))).status,401);
  globalThis.__pendingSession={user:{id:technician.userId,role:technician.role,status:"Activo"}};
  assert.equal((await (await api.GET(new Request("http://localhost/api/pending?status="))).json()).total,2);
  assert.equal((await (await dashboard.GET()).json()).pendingSummary.total,1);
  globalThis.__pendingSession={user:{id:basic.userId,role:basic.role,status:"Activo"}};
  assert.equal((await api.GET(new Request("http://localhost/api/pending"))).status,403);
  assert.equal((await (await dashboard.GET()).json()).pendingSummary,null);
  console.log("Pending integration passed: migration preservation, photos/limits/replacement/concurrency, permissions, drafts, atomic closure rollback/publication, snapshots, cancellation, completion/audit, dashboard scope and UI rendering.");
  if(process.argv.includes("--browser")) {
    const {spawn}=await import("node:child_process");const {once}=await import("node:events");const bcrypt=await import("bcryptjs");
    await pool.query("UPDATE users SET password_hash=$2 WHERE id=$1",[manager.userId,await bcrypt.hash("Pendientes-Prueba-2026!",10)]);
    const browserOrder=await newOrder();await ready(browserOrder);
    fs.writeFileSync(path.join(storage,"sample.png"),png);
    const scoped=new URL(connectionString);scoped.searchParams.set("options",`-c search_path=${schemaName},public`);
    server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","3112"],{env:{...process.env,DATABASE_URL:scoped.href,AUTH_URL:"http://127.0.0.1:3112",NEXTAUTH_URL:"http://127.0.0.1:3112",AUTH_SECRET:randomUUID()+randomUUID(),AUTH_TRUST_HOST:"true"},windowsHide:true,stdio:["ignore","inherit","inherit"]});
    serverExit=once(server,"exit");
    console.log(JSON.stringify({browserUrl:"http://127.0.0.1:3112/login",orderId:browserOrder.id,sample:path.join(storage,"sample.png")}));
    await Promise.race([serverExit,new Promise((resolve)=>{process.stdin.resume();process.stdin.once("data",resolve);process.once("SIGINT",resolve);})]);
  }
} finally {
  if(server) {server.kill();await serverExit;}process.stdin.pause();
  await pool.end();
  if(created) {assert.match(schemaName,/^pending_test_[a-f0-9]{32}$/);await admin.query(`DROP SCHEMA ${schemaName} CASCADE`);}
  await admin.end();hooks.deregister();delete globalThis.__maquitechPgPool;delete globalThis.__pendingSession;
  assert.equal(path.dirname(storage),path.resolve(".private"));assert.match(path.basename(storage),/^pending-test-[a-f0-9-]+$/);
  fs.rmSync(storage,{recursive:true,force:true});
}
