import { NextResponse } from "next/server";
import { closureActor, closureApiError, validOrderId } from "@/lib/service-order-closure-api";
import { closureActionSchema } from "@/lib/validators/service-order-closure.schema";
import { getClosure, updateClosure } from "@/lib/repositories/service-order-closure.repository";

export const runtime = "nodejs";
export async function GET(request, { params }) {
  try {
    const { response } = await closureActor();
    if (response) return response;
    const { id } = await params;
    if (!validOrderId(id)) return NextResponse.json({ error: "Orden inválida." }, { status: 400 });
    return NextResponse.json(await getClosure(id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return closureApiError(error); }
}
export async function PUT(request, { params }) {
  try {
    const { actor, response } = await closureActor(true);
    if (response) return response;
    const { id } = await params;
    if (!validOrderId(id)) return NextResponse.json({ error: "Orden inválida." }, { status: 400 });
    const parsed = closureActionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
    return NextResponse.json(await updateClosure(id, parsed.data, actor));
  } catch (error) { return closureApiError(error); }
}
