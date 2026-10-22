import ExcelJS from "exceljs";
import { EQUIPMENT_STATUSES } from "../equipment-status.js";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;

export class ImportFileError extends Error {}

export const SHEETS = [
  {
    name: "Productos",
    entity: "Producto",
    columns: [
      ["codigo", "code", true], ["descripcion", "description", true], ["marca", "brand"],
      ["serial", "serial"], ["modelo", "modelo"], ["costo", "cost", true],
      ["precio", "price", true], ["categoria", "category", true], ["stock", "stock", true], ["estado", "status", true],
    ],
    example: ["PROD-001", "Servicio de mantenimiento", "", "", "", 0, 100, "Servicio", 0, "Activo"],
  },
  {
    name: "Plantas",
    entity: "Planta",
    columns: [["codigo_cliente", "clientCode", true], ["codigo_planta", "code", true], ["nombre_planta", "name", true], ["direccion", "address"]],
    example: ["C001", "P-001", "Planta principal", "Zona industrial"],
  },
  {
    name: "Contactos",
    entity: "Contacto",
    columns: [
      ["codigo_cliente", "clientCode", true], ["codigo_planta", "plantCode", true], ["nombre_planta", "plantName"], ["nombre_contacto", "name", true],
      ["telefono", "phone"], ["correo", "email"], ["departamento", "department"],
    ],
    example: ["C001", "P-001", "Planta principal", "María Pérez", "0414-0000000", "maria@empresa.com", "Compras"],
  },
  {
    name: "Equipos",
    entity: "Equipo",
    columns: [
      ["codigo_cliente", "clientCode", true], ["codigo_planta", "plantCode", true], ["nombre_planta", "plantName"], ["nombre_equipo", "name", true],
      ["marca", "brand", true], ["modelo", "model", true], ["serial", "serial", true], ["ubicacion", "location"],
      ["consorcio", "consortium"], ["hp", "hp"], ["presion", "pressure"], ["estado", "status", true],
    ],
    example: ["C001", "P-001", "Planta principal", "Compresor 1", "Marca", "Modelo", "SER-001", "Sala de máquinas", "", 10, 120, "Operativo"],
  },
];

const normalizedHeader = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");

function readCell(cell, sheetName, rowNumber) {
  const value = cell.value;
  if (value && typeof value === "object" && "formula" in value) {
    throw new ImportFileError(`No se permiten fórmulas (${sheetName}, fila ${rowNumber}).`);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value && typeof value === "object" && Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("");
  if (value && typeof value === "object" && "text" in value) return value.text;
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "string" ? value.trim() || null : value;
}

export async function parseWorkbook(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 2 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new ImportFileError("El archivo no es un Excel .xlsx válido.");
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const parsed = [];
  let totalRows = 0;

  for (const definition of SHEETS) {
    const worksheet = workbook.getWorksheet(definition.name);
    if (!worksheet) continue;
    const headers = new Map();
    worksheet.getRow(1).eachCell((cell, columnNumber) => headers.set(normalizedHeader(cell.value), columnNumber));
    const missing = definition.columns.filter(([header, , required]) => required && !headers.has(header)).map(([header]) => header);
    if (missing.length) {
      const required = definition.columns.filter(([, , isRequired]) => isRequired).map(([header]) => header).join(", ");
      throw new ImportFileError(`La hoja ${definition.name} no contiene: ${missing.join(", ")}. Encabezados requeridos: ${required}.`);
    }

    for (let rowNumber = 2; rowNumber <= worksheet.actualRowCount; rowNumber += 1) {
      const payload = {};
      let hasValue = false;
      for (const [header, field] of definition.columns) {
        const columnNumber = headers.get(header);
        const value = columnNumber ? readCell(worksheet.getCell(rowNumber, columnNumber), definition.name, rowNumber) : null;
        payload[field] = value;
        if (value !== null) hasValue = true;
      }
      if (!hasValue) continue;
      totalRows += 1;
      if (totalRows > MAX_IMPORT_ROWS) throw new ImportFileError(`El archivo supera el límite de ${MAX_IMPORT_ROWS} filas.`);
      parsed.push({ sheetName: definition.name, entityName: definition.entity, rowNumber, payload });
    }
  }

  if (!parsed.length) throw new ImportFileError("El archivo no contiene filas para importar en las hojas reconocidas.");
  return parsed;
}

export async function createTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Maquitech";
  const instructions = workbook.addWorksheet("Instrucciones");
  instructions.addRows([
    ["Importación de datos Maquitech"],
    ["Complete una o varias hojas sin modificar los encabezados."],
    ["Los clientes deben existir y estar activos en Saint."],
    ["Las fechas deben usar el formato AAAA-MM-DD."],
    ["Las filas existentes se identifican por código, cliente/planta, correo o serial y se actualizarán."],
    ["Las plantas se identifican por codigo_planta (único por cliente); nombre_planta es solo informativo."],
    [""],
    ["Encabezados y ejemplo por hoja (solo referencia, no son datos a importar):"],
    ...SHEETS.map((definition) => [
      `${definition.name}: ${definition.columns.map(([header], index) => `${header}=${definition.example[index] || "(opcional)"}`).join(", ")}`,
    ]),
  ]);
  instructions.getColumn(1).width = 95;
  instructions.getColumn(1).alignment = { wrapText: true, vertical: "top" };
  instructions.getRow(1).font = { bold: true, size: 16, color: { argb: "FF1D4ED8" } };

  for (const definition of SHEETS) {
    const worksheet = workbook.addWorksheet(definition.name);
    worksheet.addRow(definition.columns.map(([header]) => header));
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    definition.columns.forEach(([header], index) => {
      worksheet.getColumn(index + 1).width = Math.max(16, header.length + 3);
    });
    worksheet.autoFilter = { from: "A1", to: worksheet.getRow(1).getCell(definition.columns.length).address };
    const lists = definition.name === "Productos"
      ? { categoria: ["Servicio", "Repuestos"], estado: ["Activo", "Inactivo"] }
      : definition.name === "Equipos"
        ? { estado: EQUIPMENT_STATUSES }
        : {};
    for (const [header, values] of Object.entries(lists)) {
      const columnIndex = definition.columns.findIndex(([name]) => name === header) + 1;
      const letter = worksheet.getColumn(columnIndex).letter;
      worksheet.dataValidations.add(`${letter}2:${letter}${MAX_IMPORT_ROWS + 1}`, { type: "list", allowBlank: false, formulae: [`"${values.join(",")}"`] });
    }
  }
  return workbook.xlsx.writeBuffer();
}

export async function createErrorsWorkbook(batch, rows) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Errores");
  worksheet.addRow(["archivo", "hoja", "fila", "entidad", "errores", "advertencias"]);
  for (const row of rows) worksheet.addRow([batch.original_file_name, row.sheet_name, row.row_number, row.entity_name, row.errors.join(" | "), row.warnings.join(" | ")]);
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
  [28, 18, 10, 18, 70, 50].forEach((width, index) => { worksheet.getColumn(index + 1).width = width; });
  return workbook.xlsx.writeBuffer();
}
