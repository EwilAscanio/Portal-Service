import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { ImportFileError, MAX_IMPORT_ROWS, createTemplateWorkbook, parseWorkbook } from "../lib/import/workbook.js";
import { importSchemas } from "../lib/import/schemas.js";

const isImportFileError = (pattern) => (error) => error instanceof ImportFileError && pattern.test(error.message);

const template = await createTemplateWorkbook();
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(template);
assert.ok(workbook.getWorksheet("Productos"));
assert.ok(workbook.getWorksheet("Plantas"));
assert.ok(workbook.getWorksheet("Contactos"));
assert.ok(workbook.getWorksheet("Equipos"));

for (const name of ["Productos", "Plantas", "Contactos", "Equipos"]) {
  assert.equal(workbook.getWorksheet(name).getCell("A1").note, undefined, `La hoja ${name} no debe tener notas`);
}

await assert.rejects(() => parseWorkbook(template), isImportFileError(/no contiene filas/i));

const sampleWorkbook = new ExcelJS.Workbook();
for (const [sheetName, headers, values] of [
  ["Productos", ["codigo", "descripcion", "marca", "serial", "modelo", "costo", "precio", "categoria", "stock", "estado"], ["PROD-001", "Servicio", "", "", "", 0, 10, "Servicio", 0, "Activo"]],
  ["Plantas", ["codigo_cliente", "codigo_planta", "nombre_planta", "direccion"], ["C001", "P-001", "Principal", "Dirección"]],
  ["Contactos", ["codigo_cliente", "codigo_planta", "nombre_planta", "nombre_contacto", "telefono", "correo", "departamento"], ["C001", "P-001", "Principal", "María", "04140000000", "maria@empresa.com", "Compras"]],
  ["Equipos", ["codigo_cliente", "codigo_planta", "nombre_planta", "nombre_equipo", "marca", "modelo", "serial", "ubicacion", "consorcio", "hp", "presion", "estado"], ["C001", "P-001", "Principal", "Compresor", "Marca", "M1", "SER-001", "Sala", "", 10, 120, "Operativo"]],
]) {
  const sampleSheet = sampleWorkbook.addWorksheet(sheetName);
  sampleSheet.addRow(headers);
  sampleSheet.addRow(values);
}
const sampleBuffer = await sampleWorkbook.xlsx.writeBuffer();
const rows = await parseWorkbook(sampleBuffer);
assert.equal(rows.length, 4);
assert.deepEqual(rows.map((row) => row.entityName), ["Producto", "Planta", "Contacto", "Equipo"]);
assert.equal(MAX_IMPORT_ROWS, 5000);

assert.equal(importSchemas.Producto.safeParse(rows[0].payload).success, true);
assert.equal(importSchemas.Planta.safeParse(rows[1].payload).success, true);
assert.equal(importSchemas.Contacto.safeParse(rows[2].payload).success, true);
assert.equal(importSchemas.Equipo.safeParse(rows[3].payload).success, true);
assert.equal(rows[2].payload.plantCode, "P-001");
assert.equal(rows[3].payload.plantCode, "P-001");
assert.equal(importSchemas.Equipo.safeParse({ ...rows[3].payload, plantName: null }).success, true);
assert.equal(importSchemas.Contacto.safeParse({ ...rows[2].payload, plantName: null }).success, true);
assert.equal(importSchemas.Equipo.safeParse({ ...rows[3].payload, plantCode: "" }).success, false);

const numericPlanta = importSchemas.Planta.safeParse({ clientCode: 10095, code: "P00007", name: "COBRE", address: null });
assert.equal(numericPlanta.success, true);
assert.equal(numericPlanta.data.clientCode, "10095");
assert.equal(importSchemas.Contacto.safeParse({ ...rows[2].payload, clientCode: 10095, phone: 4126786324 }).success, true);
assert.equal(importSchemas.Equipo.safeParse({ ...rows[3].payload, model: 7100 }).success, true);
assert.equal(importSchemas.Equipo.safeParse({ ...rows[3].payload, status: "OPERATIVO" }).data?.status, "Operativo");
assert.equal(importSchemas.Equipo.safeParse({ ...rows[3].payload, status: "MUDADA" }).data?.status, "Mudado");
assert.equal(importSchemas.Equipo.safeParse({ ...rows[3].payload, status: "DESECHADA" }).data?.status, "Desechado");
assert.equal(importSchemas.Equipo.safeParse({ ...rows[3].payload, status: "validar" }).data?.status, "Validar");
assert.equal(importSchemas.Equipo.safeParse({ ...rows[3].payload, status: "NO ESTA" }).success, false);

assert.ok(workbook.getWorksheet("Contactos").getRow(1).values.includes("codigo_planta"));
assert.ok(workbook.getWorksheet("Equipos").getRow(1).values.includes("codigo_planta"));

const missingPlantCode = new ExcelJS.Workbook();
const equipmentSheet = missingPlantCode.addWorksheet("Equipos");
equipmentSheet.addRow(["codigo_cliente", "nombre_equipo", "marca", "modelo", "serial", "ubicacion", "consorcio", "hp", "presion", "estado"]);
equipmentSheet.addRow(["C001", "Compresor", "Marca", "M1", "SER-001", "Sala", "", 10, 120, "Operativo"]);
const missingPlantCodeBuffer = await missingPlantCode.xlsx.writeBuffer();
await assert.rejects(() => parseWorkbook(missingPlantCodeBuffer), isImportFileError(/no contiene: codigo_planta/));

await assert.rejects(() => parseWorkbook(Buffer.from("no es un xlsx")), isImportFileError(/no es un Excel/i));

const formulaWorkbook = new ExcelJS.Workbook();
const sheet = formulaWorkbook.addWorksheet("Productos");
sheet.addRow(["codigo", "descripcion", "marca", "serial", "modelo", "costo", "precio", "categoria", "stock", "estado"]);
sheet.addRow(["P-1", "Producto", "", "", "", { formula: "1+1", result: 2 }, 10, "Servicio", 0, "Activo"]);
const formulaBuffer = await formulaWorkbook.xlsx.writeBuffer();
await assert.rejects(() => parseWorkbook(formulaBuffer), isImportFileError(/No se permiten fórmulas/));

console.log("Data import tests passed.");
