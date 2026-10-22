import assert from "node:assert/strict";
import fs from "node:fs";
import {
  canApproveServiceOrder,
  canEditServiceOrder,
  canUpdateWorkedHours,
  isValidServiceOrderTransition,
} from "../lib/service-order-policy.js";
import { ROLES } from "../lib/permissions.js";

assert.equal(canApproveServiceOrder(ROLES.SUPER_ADMIN), true);
assert.equal(canApproveServiceOrder(ROLES.ADMIN), true);
assert.equal(canApproveServiceOrder(ROLES.SUPERVISOR), true);
assert.equal(canApproveServiceOrder(ROLES.COORDINADOR), false);
assert.equal(canApproveServiceOrder(ROLES.TECNICO), false);
assert.equal(canEditServiceOrder("Pendiente"), true);
assert.equal(canEditServiceOrder("Aprobada"), false);
assert.equal(canUpdateWorkedHours("En Proceso"), false);
assert.equal(canUpdateWorkedHours("Aprobada"), false);
assert.equal(isValidServiceOrderTransition("Pendiente", "Aprobada"), true);
assert.equal(isValidServiceOrderTransition("Aprobada", "En Proceso"), true);
assert.equal(isValidServiceOrderTransition("En Proceso", "Completada"), true);
assert.equal(isValidServiceOrderTransition("Completada", "Pendiente"), false);

const repositorySource = fs.readFileSync("lib/repositories/service-order.repository.js", "utf8");
assert.match(repositorySource, /ORDER_LOCKED/);
assert.match(repositorySource, /approved_by/);
assert.match(repositorySource, /approved_at/);

const detailPage = fs.readFileSync("app/(dashboard)/ordenes/[id]/page.jsx", "utf8");
assert.match(detailPage, /ServiceOrderPrintSheet/);
assert.match(detailPage, /canApproveServiceOrder/);
assert.match(detailPage, /ConfirmDialog/);
assert.match(detailPage, /Iniciar servicio/);
assert.match(detailPage, /setConfirmAction\("En Proceso"\)/);
assert.match(detailPage, /¿Iniciar este servicio\?/);

const orderForm = fs.readFileSync("components/service-orders/ServiceOrderForm.jsx", "utf8");
const parSearch = fs.readFileSync("components/service-orders/ParSearch.jsx", "utf8");
const technicianSelector = fs.readFileSync("components/service-orders/TechnicianSelector.jsx", "utf8");
const catalogsRoute = fs.readFileSync("app/api/service-order/catalogs/route.js", "utf8");
const createPage = fs.readFileSync("app/(dashboard)/ordenes/nueva/page.jsx", "utf8");
assert.match(orderForm, /ParSearch/);
assert.match(orderForm, /LaborAllocationEditor/);
assert.doesNotMatch(orderForm, /label="PAR aprobado \*"[\s\S]{0,100}options=/);
assert.match(parSearch, /par_number/);
assert.match(parSearch, /client_name/);
assert.match(parSearch, /plant_name/);
assert.match(technicianSelector, /Marcar principal/);
assert.match(technicianSelector, /3 seleccionados/);
assert.match(technicianSelector, /status === "Activo"/);
assert.match(catalogsRoute, /c\.codclie AS client_code/);
assert.doesNotMatch(orderForm, /onChange=\{setField\("orderCode"\)\}/);
assert.match(orderForm, /Se asignará automáticamente al guardar/);
assert.doesNotMatch(repositorySource, /data\.orderCode/);
assert.match(createPage, /form="service-order-create-form"/);
assert.match(createPage, /border-t border-border pt-5/);
assert.match(orderForm, /label="Creado por"/);
assert.match(orderForm, /Pendiente de aprobación/);

console.log("Service order policy tests passed.");
