import { NextResponse } from "next/server";
import { closureActor,closureApiError } from "@/lib/service-order-closure-api";
import { listPending } from "@/lib/repositories/service-pending.repository";

export async function GET(request) {
  try {
    const { actor,response }=await closureActor();
    if(response) return response;
    const filters=Object.fromEntries(new URL(request.url).searchParams);
    return NextResponse.json(await listPending(filters,actor),{headers:{"Cache-Control":"private, no-store"}});
  } catch(error) { return closureApiError(error); }
}
