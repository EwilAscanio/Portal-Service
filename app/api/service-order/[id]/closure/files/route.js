import { NextResponse } from "next/server";
import { z } from "zod";
import { closureActor, closureApiError, validOrderId } from "@/lib/service-order-closure-api";
import { CLOSURE_DOCUMENTS } from "@/lib/service-order-closure";
import { readClosureMultipart, prepareClosureFile } from "@/lib/service-order-storage";
import { addClosureFile } from "@/lib/repositories/service-order-closure.repository";

export const runtime = "nodejs";
const fieldsSchema = z.object({ equipmentId: z.string().uuid(), category: z.enum(CLOSURE_DOCUMENTS.map((entry) => entry.value)),
  revision: z.coerce.number().int().nonnegative(), replaceId: z.string().uuid().optional() }).strict();
export async function POST(request, { params }) {
  try {
    const { actor, response } = await closureActor(true);
    if (response) return response;
    const { id } = await params;
    if (!validOrderId(id)) return NextResponse.json({ error: "Orden inválida." }, { status: 400 });
    const form = await readClosureMultipart(request);
    const fields = {};
    for (const [key, value] of form.entries()) if (key !== "file") fields[key] = value;
    const parsed = fieldsSchema.safeParse(fields);
    if (!parsed.success || form.getAll("file").length !== 1) return NextResponse.json({ error: "Seleccione un archivo y su equipo y categoría." }, { status: 400 });
    const file = await prepareClosureFile(form.get("file"));
    return NextResponse.json(await addClosureFile(id, parsed.data, file, actor), { status: 201 });
  } catch (error) { return closureApiError(error); }
}
