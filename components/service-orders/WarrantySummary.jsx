import Link from "next/link";
import { orderKindLabel } from "@/lib/warranty";

export function WarrantySummary({ order }) {
  return <section className="space-y-2 rounded-xl border border-border p-4 text-sm">
    <p className="font-semibold">Clasificación: {orderKindLabel(order.order_kind)}</p>
    {order.order_kind === "Garantia" && <>
      <p>Origen: {order.warranty_origin_order_id ? <Link className="text-blue-600 underline" href={`/ordenes/${order.warranty_origin_order_id}`}>{order.warranty_origin_order_code || "O/S original"}</Link> : order.warranty_reference}</p>
      {order.warranty_service_date && <p>Fecha del servicio anterior: {String(order.warranty_service_date).slice(0,10).split("-").reverse().join("/")}</p>}
      <p className="whitespace-pre-line">Motivo: {order.warranty_reason}</p>
      <p>Horas de garantía independientes del presupuesto comercial del PAR.</p>
    </>}
    {!!order.warranties?.length && <div>Garantías vinculadas: {order.warranties.map((row)=><Link key={row.id} href={`/ordenes/${row.id}`} className="mr-3 inline-block text-blue-600 underline">{row.order_code} · {row.status}</Link>)}</div>}
  </section>;
}
