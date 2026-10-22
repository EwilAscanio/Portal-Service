import { query } from "@/lib/db";
import { importSchemas } from "./schemas";

const key = (value) => String(value ?? "").trim().toLocaleLowerCase("es");
const plantKey = (clientCode, plantName) => `${key(clientCode)}|${key(plantName)}`;
const plantCodeKey = (clientCode, plantCode) => `${key(clientCode)}|${key(plantCode)}`;
const contactKey = (payload) => payload.email
  ? `${plantCodeKey(payload.clientCode, payload.plantCode)}|email:${key(payload.email)}`
  : `${plantCodeKey(payload.clientCode, payload.plantCode)}|persona:${key(payload.name)}|${key(payload.phone)}`;

function formatIssues(result) {
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

export async function analyzeRows(sourceRows) {
  const [clientsResult, plantsResult, contactsResult, productsResult, equipmentResult] = await Promise.all([
    query("SELECT id, codclie, status FROM client"),
    query(`SELECT p.id, p.name, p.code, p.client_id, c.codclie AS client_code FROM plant p JOIN client c ON c.id = p.client_id`),
    query(`SELECT ct.id, ct.name, ct.phone, ct.email, c.codclie AS client_code, p.code AS plant_code, p.name AS plant_name
           FROM contact ct JOIN client c ON c.id = ct.client_id JOIN plant p ON p.id = ct.plant_id`),
    query("SELECT id, code, requires_technician FROM product"),
    query(`SELECT e.id, e.serial, e.client_id, e.plant_id, c.codclie AS client_code, p.code AS plant_code, p.name AS plant_name,
                  EXISTS (SELECT 1 FROM par_equipment pe WHERE pe.equipment_id = e.id) AS has_par_refs
           FROM equipment e JOIN client c ON c.id = e.client_id JOIN plant p ON p.id = e.plant_id`),
  ]);

  const clients = new Map(clientsResult.rows.map((row) => [key(row.codclie), row]));
  const plants = new Map(plantsResult.rows.map((row) => [plantKey(row.client_code, row.name), row]));
  const plantsByCode = new Map(plantsResult.rows.map((row) => [plantCodeKey(row.client_code, row.code), row]));
  const products = new Map(productsResult.rows.map((row) => [key(row.code), row]));
  const equipment = new Map(equipmentResult.rows.map((row) => [key(row.serial), row]));
  const contacts = new Map();
  for (const row of contactsResult.rows) {
    const currentKey = contactKey({ clientCode: row.client_code, plantCode: row.plant_code, name: row.name, phone: row.phone, email: row.email });
    const matches = contacts.get(currentKey) ?? [];
    matches.push(row);
    contacts.set(currentKey, matches);
  }

  const stagedPlants = new Map(
    sourceRows.filter((row) => row.entityName === "Planta").map((row) => [plantCodeKey(row.payload.clientCode, row.payload.code), row.payload.name])
  );
  const seen = { Producto: new Set(), Planta: new Set(), Contacto: new Set(), Equipo: new Set() };
  const analyzed = [];

  for (const source of sourceRows) {
    const payload = { ...source.payload };
    const errors = [];
    const warnings = [];
    if (source.entityName === "Producto") {
      payload.status ||= "Activo";
      payload.stock = payload.stock ?? 0;
    }
    if (source.entityName === "Equipo") {
      payload.status ||= "Operativo";
    }

    const validation = importSchemas[source.entityName].safeParse(payload);
    errors.push(...formatIssues(validation));
    if (validation.success) Object.assign(payload, validation.data);

    let rowKey;
    let target = null;
    if (source.entityName === "Producto") {
      rowKey = key(payload.code);
      target = products.get(rowKey);
      if (target?.requires_technician && payload.category !== "Servicio") {
        errors.push("Este producto requiere técnico. Desactive esa opción en Productos antes de cambiarlo a Repuestos.");
      }
    } else if (source.entityName === "Planta") {
      rowKey = plantKey(payload.clientCode, payload.name);
      target = plants.get(rowKey);
    } else if (source.entityName === "Contacto") {
      rowKey = contactKey(payload);
      const matches = contacts.get(rowKey) ?? [];
      if (matches.length > 1) errors.push("El contacto coincide con varios registros existentes.");
      target = matches.length === 1 ? matches[0] : null;
    } else {
      rowKey = key(payload.serial);
      target = equipment.get(rowKey);
    }

    if (rowKey && seen[source.entityName].has(rowKey)) errors.push("La clave del registro está duplicada dentro del archivo.");
    if (rowKey) seen[source.entityName].add(rowKey);

    if (["Planta", "Contacto", "Equipo"].includes(source.entityName)) {
      const client = clients.get(key(payload.clientCode));
      if (!client) errors.push("El cliente no existe. Sincronízalo desde Saint antes de importar.");
      else if (client.status !== "1") errors.push("El cliente está inactivo en Saint.");
    }
    if (["Contacto", "Equipo"].includes(source.entityName)) {
      const relationKey = plantCodeKey(payload.clientCode, payload.plantCode);
      const existingPlant = plantsByCode.get(relationKey);
      const stagedName = stagedPlants.get(relationKey);
      if (!existingPlant && stagedName === undefined) errors.push("La planta no existe para el cliente indicado ni está incluida en este archivo.");
      else if (payload.plantName && key(payload.plantName) !== key(existingPlant?.name ?? stagedName)) {
        warnings.push("El nombre de la planta no coincide con el código indicado.");
      }
    }
    if (source.entityName === "Equipo" && target?.has_par_refs) {
      const changedScope = key(target.client_code) !== key(payload.clientCode) || key(target.plant_code) !== key(payload.plantCode);
      if (changedScope) errors.push("No se puede cambiar el cliente o la planta de un equipo asociado a un PAR.");
    }

    if (target && !errors.length) warnings.push("Se actualizará el registro existente.");
    analyzed.push({
      ...source,
      payload,
      targetId: target?.id ?? null,
      errors: [...new Set(errors)],
      warnings,
      operation: errors.length ? "Error" : target ? "Actualizar" : "Crear",
      status: errors.length ? "Error" : "Pendiente",
    });
  }

  const summary = {
    total: analyzed.length,
    create: analyzed.filter((row) => row.operation === "Crear").length,
    update: analyzed.filter((row) => row.operation === "Actualizar").length,
    errors: analyzed.filter((row) => row.errors.length).length,
    warnings: analyzed.filter((row) => row.warnings.length).length,
  };
  return { rows: analyzed, summary };
}
