"use client";
/* eslint-disable @next/next/no-img-element -- Fotos privadas mediante API autenticada con la sesión del navegador. */
import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { MAX_ORDER_PHOTOS, MAX_PENDING_LINES,createPendingLineId } from "@/lib/service-pending";
import { Card,CardHeader,CardTitle,CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input,Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

const date=(value)=>value ? new Date(value).toLocaleString("es-VE") : "—";
export function ServiceOrderFieldWork({orderId,fieldWork,items,dirty,busy,onChange,onSave,onUpload,onRetire}) {
  const [preview,setPreview]=useState(null);
  if(!fieldWork) return null;
  const {photos,pendingItems,editable}=fieldWork;
  const active=photos.filter((photo)=>!photo.retired_at);
  const url=(photo)=>`/api/service-order/${orderId}/closure/photos/${photo.id}`;
  const select=(event,replaceId)=>{const files=Array.from(event.target.files || []);event.target.value="";onUpload(files,replaceId);};
  return <>
    <Card><CardHeader><CardTitle>Fotos del servicio · {active.length}/{MAX_ORDER_PHOTOS}</CardTitle></CardHeader><CardContent className="space-y-4">
      <p className="text-sm text-muted">Hasta cinco fotos por O/S. Son opcionales y se conservan con el expediente.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{active.map((photo)=><div key={photo.id} className="space-y-2 rounded-xl border border-border p-3">
        <button type="button" className="block w-full overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500" onClick={()=>setPreview(photo)} aria-label={"Ampliar " + photo.original_name}>
          <img src={url(photo)} alt={photo.original_name} width={320} height={200} loading="lazy" className="h-40 w-full object-contain bg-surface-2" />
        </button>
        <p className="break-all text-sm font-medium">{photo.original_name}</p><p className="text-xs text-muted">{photo.uploaded_by_name} · {date(photo.uploaded_at)}</p>
        <a href={url(photo)+"?download=1"} className="text-sm text-blue-600">Descargar</a>
        {editable && <><Button size="sm" variant="ghost" disabled={busy} onClick={()=>onRetire(photo)}>Retirar foto</Button>
          <Input type="file" label="Reemplazar foto" accept=".jpg,.jpeg,.png" disabled={busy} onChange={(event)=>select(event,photo.id)} /></>}
      </div>)}</div>
      {!active.length && <p className="text-sm text-muted">No hay fotos registradas.</p>}
      {editable && <Input type="file" label="Agregar fotos" multiple accept=".jpg,.jpeg,.png" disabled={busy || active.length>=MAX_ORDER_PHOTOS} hint="JPG o PNG · hasta 10 MB por foto" onChange={(event)=>select(event)} />}
      {photos.some((photo)=>photo.retired_at) && <details><summary className="cursor-pointer text-sm">Fotos anteriores</summary><div className="mt-3 space-y-2">{photos.filter((photo)=>photo.retired_at).map((photo)=><div key={photo.id} className="rounded-lg border border-border p-3 text-sm">
        <button type="button" className="break-all text-blue-600 underline" onClick={()=>setPreview(photo)}>{photo.original_name}</button>
        <p>{photo.retirement_reason} · {photo.retired_by_name} · {date(photo.retired_at)}</p>
      </div>)}</div></details>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Lista de pendientes</CardTitle></CardHeader><CardContent className="space-y-4">
      <p className="text-sm text-muted">Escriba un pendiente por línea para esta O/S. Cliente y planta se tomarán de la orden. Los pendientes se publican al confirmar el cierre.</p>
      {editable ? <>
        {items.map((item,index)=><div key={item.id} className="flex items-start gap-2">
          <Textarea className="flex-1" label={`Pendiente ${index+1}`} maxLength={2000} value={item.description} disabled={busy} onChange={(event)=>onChange(items.map((row)=>row.id===item.id ? {...row,description:event.target.value} : row))} />
          <Button className="mt-7" variant="ghost" size="icon" icon={Trash2} aria-label={`Retirar pendiente ${index+1}`} disabled={busy} onClick={()=>onChange(items.filter((row)=>row.id!==item.id))} />
        </div>)}
        {!items.length && <p className="text-sm">Sin pendientes. Puede cerrar la orden sin agregar líneas.</p>}
        <div className="flex flex-wrap gap-3"><Button variant="secondary" icon={Plus} disabled={busy || items.length>=MAX_PENDING_LINES} onClick={()=>onChange([...items,{id:createPendingLineId(),description:""}])}>Agregar pendiente</Button>
          <Button icon={Save} disabled={busy || !dirty} onClick={onSave}>Guardar pendientes</Button></div>
        {dirty && <p role="status" className="text-sm text-amber-600">Hay cambios en los pendientes sin guardar.</p>}
      </> : <>
        {!pendingItems.length && <p className="text-sm">Sin pendientes registrados.</p>}
        {pendingItems.map((item)=><div key={item.id} className="space-y-1 rounded-xl border border-border p-3 text-sm">
          <p className="whitespace-pre-wrap break-words">{item.description}</p><p className="text-muted">Reportado por {item.created_by_name} · Seguimiento: {item.status}</p>
          {item.completed_at && <p className="whitespace-pre-wrap">Solución: {item.resolution} · {item.completed_by_name} · {date(item.completed_at)}</p>}
        </div>)}
      </>}
    </CardContent></Card>
    <Modal open={!!preview} onClose={()=>setPreview(null)} title="Foto del servicio" description={preview?.original_name} size="2xl" scrollable>
      {preview && <img src={url(preview)} alt={preview.original_name} width={1200} height={900} className="max-h-[70vh] w-full object-contain" />}
    </Modal>
  </>;
}
