import { NextResponse } from "next/server";

export async function PATCH(_request, { params }) {
  return NextResponse.json({ id: (await params).id, read: true });
}
