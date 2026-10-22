import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, stat } from "node:fs/promises";
import { MAX_CLOSURE_FILE_SIZE, closureError } from "@/lib/service-order-closure";

function storageRoot() {
  // Los documentos se resuelven al ejecutar el servidor, nunca se empaquetan con Next.
  const root = path.resolve(/* turbopackIgnore: true */ process.env.SERVICE_ORDER_DOCUMENTS_DIR || path.join(process.cwd(), ".private", "service-order-documents"));
  for (const folder of ["public", ".next", "out"]) {
    const relative = path.relative(path.resolve(/* turbopackIgnore: true */ process.cwd(), folder), root);
    if (!relative || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
      throw closureError("ORDER_CLOSURE_STORAGE", "La carpeta de documentos debe ser privada e independiente de las carpetas públicas o de compilación.");
    }
  }
  return root;
}

function storagePath(key) {
  // Nunca se usa el nombre enviado por el usuario como ruta en disco.
  if (!/^[a-f0-9-]{36}\.(pdf|jpg|png)$/.test(key)) throw closureError("ORDER_CLOSURE_STORAGE", "Referencia de archivo inválida.");
  return path.join(/* turbopackIgnore: true */ storageRoot(), key);
}

export async function readClosureMultipart(request) {
  const limit = MAX_CLOSURE_FILE_SIZE + 1024 * 1024;
  if (Number(request.headers.get("content-length")) > limit) throw closureError("ORDER_CLOSURE_TOO_LARGE", "El archivo no puede superar 10 MB.");
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw closureError("ORDER_CLOSURE_INVALID", "Envíe el archivo como formulario multipart.");
  if (!request.body) throw closureError("ORDER_CLOSURE_INVALID", "Seleccione un archivo.");
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw closureError("ORDER_CLOSURE_TOO_LARGE", "El archivo no puede superar 10 MB.");
      }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  try {
    return await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") } }).formData();
  } catch {
    throw closureError("ORDER_CLOSURE_INVALID", "El formulario de archivo está incompleto o es inválido.");
  }
}

export async function prepareClosureFile(file) {
  if (!file || typeof file.arrayBuffer !== "function" || !file.size) throw closureError("ORDER_CLOSURE_INVALID", "Seleccione un archivo no vacío.");
  if (file.size > MAX_CLOSURE_FILE_SIZE) throw closureError("ORDER_CLOSURE_TOO_LARGE", "El archivo no puede superar 10 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name).toLowerCase();
  let format;
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-" && buffer.subarray(-2048).includes(Buffer.from("%%EOF"))) format = { extension: "pdf", mime: "application/pdf", allowed: [".pdf"] };
  else if (buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 && buffer.at(-2) === 255 && buffer.at(-1) === 217) format = { extension: "jpg", mime: "image/jpeg", allowed: [".jpg", ".jpeg"] };
  else if (buffer.length >= 45 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.subarray(12,16).toString("ascii") === "IHDR" && buffer.subarray(-8,-4).toString("ascii") === "IEND") format = { extension: "png", mime: "image/png", allowed: [".png"] };
  if (!format || !format.allowed.includes(extension) || (file.type && file.type !== format.mime)) {
    throw closureError("ORDER_CLOSURE_INVALID", "Use PDF, JPG o PNG válidos; el contenido debe coincidir con el formato del archivo.");
  }
  const id = randomUUID();
  return { id, buffer, storage_key: id + "." + format.extension,
    original_name: file.name.replace(/[\\/\x00-\x1f\x7f]/g, "_").slice(0, 255),
    mime_type: format.mime, byte_size: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex") };
}

export async function persistClosureFile(file) {
  await mkdir(storageRoot(), { recursive: true, mode: 0o700 });
  const handle = await open(/* turbopackIgnore: true */ storagePath(file.storage_key), "wx", 0o600);
  try { await handle.writeFile(file.buffer); await handle.sync(); } finally { await handle.close(); }
  // Se escribe antes del COMMIT. Un fallo posterior puede dejar un archivo huérfano,
  // nunca un registro confirmado sin contenido; no borrar ante un COMMIT incierto.
}

export async function assertClosureFileAvailable(file) {
  try {
    const info = await stat(/* turbopackIgnore: true */ storagePath(file.storage_key));
    if (!info.isFile() || info.size !== file.byte_size) throw new Error("size");
  } catch {
    throw closureError("ORDER_CLOSURE_STORAGE", "No está disponible un documento guardado. Restáurelo o reemplácelo antes de cerrar la O/S.");
  }
}

export async function readClosureFile(file) {
  await assertClosureFileAvailable(file);
  const content = await readFile(/* turbopackIgnore: true */ storagePath(file.storage_key));
  if (createHash("sha256").update(content).digest("hex") !== file.sha256) throw closureError("ORDER_CLOSURE_STORAGE", "El documento guardado no coincide con su registro original.");
  return content;
}
