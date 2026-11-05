import { NextResponse } from "next/server";

/** Lee el cursor incremental. Sin parámetro, la descarga es el catálogo completo que corresponde. */
export function readUpdatedSince(request) {
  const raw = new URL(request.url).searchParams.get("updated_since");
  if (!raw) return { updatedSince: null };
  const time = Date.parse(raw);
  if (Number.isNaN(time)) {
    return { response: NextResponse.json({ error: "updated_since no es una fecha válida." }, { status: 400 }) };
  }
  return { updatedSince: new Date(time) };
}
