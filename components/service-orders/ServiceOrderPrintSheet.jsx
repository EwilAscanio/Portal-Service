import { LaborAllocationSummary } from "@/components/service-orders/LaborAllocationSummary";
const WORK_TYPES = { Internal: "INTERNA", External: "EXTERNA" };
const SERVICE_TYPES = { Inspection: "REVISIÓN", Maintenance: "MANTENIMIENTO", Emergency: "EMERGENCIA", Other: "OTRO" };

function dateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-VE", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function ServiceOrderPrintSheet({ order }) {
  const equipment = order.equipment || [];
  return (
    <div className="hidden print:block">
      <div className="mx-auto max-w-5xl px-4 print:m-0 print:max-w-none print:px-0">
        <div className="border border-slate-900 bg-white p-5 font-sans text-slate-900 print:p-4">
          <header className="mb-3 flex items-center justify-between gap-4 border-b-2 border-slate-900 pb-3">
            <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center bg-slate-900 text-xl font-black text-white">M</div><div><h1 className="text-lg font-black">MAQUITECH Distribuidores C.A.</h1><p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Venta, servicio y mantenimiento de equipos industriales</p></div></div>
            <div className="text-right"><h2 className="text-base font-black uppercase">Orden de Servicio</h2><p className="text-lg font-black text-indigo-900">NRO. <span className="underline">{order.order_code}</span></p><p className="text-[10px] font-bold uppercase">Estado: {order.status}</p></div>
          </header>

          <div className="mb-3 divide-y divide-slate-900 border border-slate-900 text-xs">
            <PrintRow label="EMPRESA" value={order.client_name} />
            <PrintRow label="PLANTA" value={`${order.plant_name || "—"}${order.plant_address ? ` · ${order.plant_address}` : ""}`} />
            <PrintRow label="CONTACTO" value={`${order.contact_name || "—"}${order.contact_phone ? ` · ${order.contact_phone}` : ""}${order.contact_email ? ` · ${order.contact_email}` : ""}`} />
            <div className="grid grid-cols-12 divide-x divide-slate-900"><CellLabel>PAR</CellLabel><Cell>{order.par_number}</Cell><CellLabel>ORDEN DE COMPRA</CellLabel><Cell>{order.purchase_order_number || "—"}</Cell><CellLabel>COTIZACIÓN</CellLabel><Cell>{order.quotation_number || "—"}</Cell></div>
          </div>

          <div className="mb-3 grid grid-cols-4 divide-x divide-slate-900 border border-slate-900 text-[10px]"><PrintBox label="TIPO DE TRABAJO" value={WORK_TYPES[order.work_type] || order.work_type} /><PrintBox label="TIPO DE SERVICIO" value={SERVICE_TYPES[order.service_type] || order.service_type} /><PrintBox label="FECHA DE LLAMADA" value={dateTime(order.call_date)} /><PrintBox label="PRIORIDAD" value={order.priority} /></div>
          <div className="mb-3 grid grid-cols-3 divide-x divide-slate-900 border border-slate-900 text-[10px]"><PrintBox label="PROGRAMADA DESDE" value={dateTime(order.scheduled_start)} /><PrintBox label="PROGRAMADA HASTA" value={dateTime(order.scheduled_end)} /><PrintBox label={order.labor_review_required ? (order.status === "Cancelada" ? "HORAS ANTERIORES" : "HORAS ANTERIORES (POR REVISAR)") : "HORAS ESTIMADAS DE MANO DE OBRA"} value={String(order.worked_hours ?? 0)} /></div>

          <PrintTable title="Equipos" headers={["Equipo", "Marca / modelo", "Serial", "Descripción"]} rows={equipment.map((item) => [item.name || item.type || "—", [item.brand, item.model].filter(Boolean).join(" / ") || "—", item.serial || "—", item.description || "—"])} />

          <div className="mb-3 border border-slate-900"><div className="bg-slate-200 py-1 text-center text-xs font-bold uppercase">Descripción del trabajo</div><p className="min-h-20 whitespace-pre-line p-2 text-xs">{order.work_description || "—"}</p></div>

          <div className="mb-8 border border-slate-900"><div className="bg-slate-200 py-1 text-center text-xs font-bold uppercase">Técnicos asignados</div><p className="p-2 text-xs font-semibold">{order.technician_display_name || "—"}</p></div>

          <div className="mb-8"><LaborAllocationSummary order={order} /></div>
          <div className="grid grid-cols-2 gap-12 text-center text-xs"><Signature label="CREADO POR" value={order.prepared_by_name} /><Signature label="APROBADO POR" value={order.approved_by_name} detail={order.approved_at ? dateTime(order.approved_at) : "PENDIENTE"} /></div>
        </div>
      </div>
    </div>
  );
}

function CellLabel({ children }) { return <div className="col-span-2 bg-slate-100 p-1.5 text-[10px] font-bold uppercase">{children}</div>; }
function Cell({ children }) { return <div className="col-span-2 p-1.5 font-semibold">{children}</div>; }
function PrintRow({ label, value }) { return <div className="grid grid-cols-12 divide-x divide-slate-900"><CellLabel>{label}</CellLabel><div className="col-span-10 p-1.5 font-bold uppercase">{value || "—"}</div></div>; }
function PrintBox({ label, value }) { return <div className="p-1.5"><p className="font-bold text-slate-600">{label}</p><p className="mt-0.5 font-semibold">{value || "—"}</p></div>; }
function Signature({ label, value, detail }) { return <div className="border-t border-slate-900 pt-1"><p className="font-bold">{value || "—"}</p>{detail && <p>{detail}</p>}<p className="mt-1 text-[10px] font-bold">{label}</p></div>; }
function PrintTable({ title, headers, rows }) { return <div className="mb-3"><div className="border border-b-0 border-slate-900 bg-slate-200 py-1 text-center text-xs font-bold uppercase">{title}</div><table className="w-full border-collapse border border-slate-900 text-left text-[10px]"><thead><tr className="bg-slate-100">{headers.map((header) => <th key={header} className="border border-slate-900 p-1 font-bold uppercase">{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((value, index) => <td key={index} className="border border-slate-900 p-1">{value}</td>)}</tr>)}</tbody></table></div>; }
