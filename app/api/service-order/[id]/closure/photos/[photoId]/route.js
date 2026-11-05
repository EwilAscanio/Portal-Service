import { NextResponse } from "next/server";
import { z } from "zod";
import { closureActor, closureApiError, validOrderId } from "@/lib/service-order-closure-api";
import { retireFileSchema } from "@/lib/validators/service-order-closure.schema";
import { findOrderPhoto,retireOrderPhoto } from "@/lib/repositories/service-order-closure.repository";
import { readClosureFile } from "@/lib/service-order-storage";

export const runtime="nodejs";
export async function GET(request,{params}) {
  try {
    const { actor,response }=await closureActor();
    if(response) return response;
    const { id,photoId }=await params;
    if(!validOrderId(id)||!z.string().uuid().safeParse(photoId).success) return NextResponse.json({error:"Referencia inválida."},{status:400});
    const photo=await findOrderPhoto(id,photoId,actor);
    const content=await readClosureFile(photo);
    const disposition=new URL(request.url).searchParams.get("download")==="1" ? "attachment" : "inline";
    const name=encodeURIComponent(photo.original_name).replace(/['()*]/g,(char)=>"%"+char.charCodeAt(0).toString(16).toUpperCase());
    return new Response(content,{headers:{"Content-Type":photo.mime_type,"Content-Length":String(photo.byte_size),
      "Content-Disposition":disposition+"; filename=\"foto\"; filename*=UTF-8''"+name,"Cache-Control":"private, no-store",
      "X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox"}});
  } catch(error) { return closureApiError(error); }
}
export async function DELETE(request,{params}) {
  try {
    const { actor,response }=await closureActor();
    if(response) return response;
    const { id,photoId }=await params;
    if(!validOrderId(id)||!z.string().uuid().safeParse(photoId).success) return NextResponse.json({error:"Referencia inválida."},{status:400});
    const parsed=retireFileSchema.safeParse(await request.json());
    if(!parsed.success) return NextResponse.json({error:parsed.error.issues[0].message},{status:400});
    return NextResponse.json(await retireOrderPhoto(id,photoId,parsed.data,actor));
  } catch(error) { return closureApiError(error); }
}
