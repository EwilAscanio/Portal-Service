"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card,CardHeader,CardTitle,CardDescription,CardContent } from "@/components/ui/Card";

export function PendingDashboardCard({summary,loading,error}) {
  return <Card><CardHeader><div><CardTitle>Lista de pendientes{summary ? ` · ${summary.total}` : ""}</CardTitle><CardDescription>Pendientes abiertos de órdenes cerradas · los más antiguos primero</CardDescription></div>
    <Link href="/pendientes" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-blue-600">Ver todos<ArrowRight className="h-4 w-4" /></Link></CardHeader>
    <CardContent className="space-y-3 pt-4">{error ? <p role="alert" className="text-sm text-red-600">No se pudieron cargar los pendientes. Actualice la página.</p> : loading ? <p role="status" className="text-sm text-muted">Cargando pendientes…</p> : !summary?.items.length ? <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">No hay pendientes abiertos.</p> : summary.items.map((item)=><div key={item.id} className="rounded-xl border border-border p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{item.client_code} · {item.client_name}</span><Link href={`/ordenes/${item.service_order_id}`} className="text-blue-600">{item.order_code}</Link></div>
      <p className="text-muted">{item.plant_name}</p><p className="mt-1 whitespace-pre-wrap break-words">{item.description}</p>
    </div>)}</CardContent>
  </Card>;
}
