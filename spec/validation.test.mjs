import assert from "node:assert/strict";
import {
  configurationSchema,
  equipmentSchema,
  productSchema,
  serviceOrderSchema,
  serviceOrderUpdateSchema,
  technicalSchema,
} from "../lib/validators/operational.schema.js";
import { userSchema, userUpdateSchema, userStatusSchema } from "../lib/validators/user.schema.js";
import { parEquipmentSchema, parHeaderSchema } from "../lib/validators/par.schema.js";
import fs from "node:fs";

assert.equal(productSchema.safeParse({ code: "P1", description: "Producto", cost: "10", price: "20", category: "Servicio" }).success, true);
assert.equal(productSchema.safeParse({ code: "P1", description: "Producto", cost: "NaN", price: "20", category: "Servicio" }).success, false);
assert.equal(productSchema.safeParse({ code: "P1", description: "Producto", cost: "10", price: "20", category: "Principal" }).success, false);
assert.equal(equipmentSchema.safeParse({ name: "Equipo", brand: "Marca", model: "M1", serial: "S1", clientId: "not-uuid" }).success, false);
assert.equal(technicalSchema.safeParse({ cedula: "123", name: "Ana", email: "bad" }).success, false);
const relationId = "11111111-1111-4111-8111-111111111111";
const validOrder = { parId: 1, workType: "External", serviceType: "Maintenance", callDate: "2026-09-19T12:00:00.000Z", scheduledStart: "2026-09-20T12:00:00.000Z", scheduledEnd: "2026-09-20T14:00:00.000Z", laborAllocations: [{ parItemId: 1, technicalId: relationId, hours: "1" }] };
assert.equal(serviceOrderSchema.safeParse(validOrder).success, true);
assert.equal(serviceOrderSchema.safeParse({ ...validOrder, orderCode: "OS-MANUAL" }).success, false);
assert.equal(Object.hasOwn(serviceOrderSchema.parse(validOrder), "orderCode"), false);
assert.equal(serviceOrderSchema.safeParse({ ...validOrder, callDate: "fecha" }).success, false);
assert.equal(serviceOrderSchema.safeParse({ ...validOrder, scheduledEnd: "2026-09-20T11:00:00.000Z" }).success, false);
assert.equal(serviceOrderSchema.safeParse({ ...validOrder, technicianIds: [relationId, relationId, relationId, relationId] }).success, false);
assert.deepEqual(serviceOrderUpdateSchema.parse({ status: "Aprobada" }), { status: "Aprobada" });
const validParHeader = { clientId: relationId, plantId: relationId, contactId: relationId, exchangeRate: 1, observations: "Trabajo solicitado" };
assert.equal(parHeaderSchema.safeParse(validParHeader).success, true);
assert.equal(parHeaderSchema.safeParse({ ...validParHeader, observations: "" }).success, true);
assert.equal(parEquipmentSchema.safeParse({ equipmentId: relationId, observaciones: "Revisión del compresor" }).success, true);
assert.equal(parEquipmentSchema.safeParse({ equipmentId: relationId, observaciones: "" }).success, false);
assert.equal(configurationSchema.safeParse({ company_name: "", exchange_rate: "NaN" }).success, false);
assert.equal(configurationSchema.safeParse({ exchange_rate: "36.5" }).success, true);

const validUser = {
  login: "usuario1",
  name: "Usuario Prueba",
  email: "usuario@example.com",
  password: "Secreta123",
  roleId: 2,
  status: "Activo",
};
assert.equal(userSchema.safeParse(validUser).success, true);
assert.equal(userSchema.safeParse({ ...validUser, password: "123" }).success, false);
assert.equal(userSchema.safeParse({ ...validUser, roleId: "no-numero" }).success, false);
assert.equal(userSchema.safeParse({ ...validUser, email: "correo-invalido" }).success, false);
assert.equal(userUpdateSchema.safeParse({ ...validUser, password: undefined }).success, true);
assert.equal(userUpdateSchema.safeParse({ ...validUser, status: "Desconocido" }).success, false);
assert.equal(userStatusSchema.safeParse({ status: "Inactivo" }).success, true);
assert.equal(userStatusSchema.safeParse({ status: "Suspendido" }).success, false);

const userCreateRoute = fs.readFileSync("app/api/user/route.js", "utf8");
const userUpdateRoute = fs.readFileSync("app/api/user/[id]/route.js", "utf8");
assert.match(userCreateRoute, /userSchema\.safeParse/);
assert.match(userUpdateRoute, /userUpdateSchema\.safeParse/);
assert.match(userUpdateRoute, /userStatusSchema\.safeParse/);

console.log("Operational validation tests passed.");
