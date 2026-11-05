import { NextResponse } from "next/server";
import { z } from "zod";
import { closureActor,closureApiError } from "@/lib/service-order-closure-api";
import { completePending } from "@/lib/repositories/service-pending.repository";

export async function PATCH(request,{params}) {
  try {
    const { actor,response }=await closureActor(true);
    if(response) return response;
    const { id }=await params;
    if(!z.string().uuid().safeParse(id).success) return NextResponse.json({error:"Pendiente inválido."},{status:400});
    return NextResponse.json(await completePending(id,await request.json(),actor));
  } catch(error) { return closureApiError(error); }
}
