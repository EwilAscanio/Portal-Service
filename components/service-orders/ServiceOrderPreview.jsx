import { LaborAllocationSummary } from "@/components/service-orders/LaborAllocationSummary";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ORDER_STATUS_VARIANTS, PRIORITY_VARIANTS } from "@/lib/status";
import { formatDate } from "@/lib/format";

const WORK_TYPES = { Internal: "Interna", External: "Externa" };
const SERVICE_TYPES = { Inspection: "Revisión", Maintenance: "Mantenimiento", Emergency: "Emergencia", Other: "Otro" };

export function ServiceOrderPreview({ order }) {
  const equipment = order.equipment || [];

  return (
    <Card className="mx-auto max-w-5xl overflow-hidden">
      <div className="border-b border-border bg-surface-2/50 px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Maquitech · C.A.</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">ORDEN DE SERVICIO</h2>
            <p className="mt-1 text-sm text-muted">N° <span className="font-semibold text-foreground underline">{order.order_code}</span> · PAR {order.par_number}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={order.status} variants={ORDER_STATUS_VARIANTS} />
            <StatusBadge status={order.priority} variants={PRIORITY_VARIANTS} dot={false} />
          </div>
        </div>
      </div>

      <div className="space-y-6 px-8 py-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Cliente" value={order.client_name} detail={order.client_code} />
          <Info label="Planta" value={order.plant_name} detail={order.plant_address} />
          <Info label="Contacto" value={order.contact_name} detail={order.contact_phone || order.contact_email} />
          <Info label="Referencias" value={`OC: ${order.purchase_order_number || "—"}`} detail={`Cotización: ${order.quotation_number || "—"}`} />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Tipo de trabajo" value={WORK_TYPES[order.work_type] || order.work_type} />
          <Info label="Tipo de servicio" value={SERVICE_TYPES[order.service_type] || order.service_type} />
          <Info label="Fecha de llamada" value={formatDate(order.call_date)} />
          <Info label="Programación" value={`${formatDate(order.scheduled_start)} – ${formatDate(order.scheduled_end)}`} />
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Equipos</h3>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2/60"><tr className="text-xs uppercase tracking-wider text-muted"><th className="px-4 py-2.5">Equipo</th><th className="px-4 py-2.5">Marca / modelo</th><th className="px-4 py-2.5">Serial</th><th className="px-4 py-2.5">Descripción</th></tr></thead>
              <tbody>{equipment.map((item, index) => <tr key={`${item.id || "equipo"}-${index}`} className="border-t border-border/60"><td className="px-4 py-2.5 font-medium">{item.name || item.type || "—"}</td><td className="px-4 py-2.5">{[item.brand, item.model].filter(Boolean).join(" · ") || "—"}</td><td className="px-4 py-2.5">{item.serial || "—"}</td><td className="px-4 py-2.5">{item.description || "—"}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface-2/30 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Descripción del trabajo</h3>
          <p className="mt-2 whitespace-pre-line text-sm text-foreground">{order.work_description || "—"}</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Info label="Técnicos asignados" value={order.technician_display_name} />
          <Info label={order.labor_review_required ? (order.status === "Cancelada" ? "Horas anteriores" : "Horas anteriores (pendientes de revisión)") : "Horas estimadas de mano de obra"} value={String(order.worked_hours ?? 0)} />
        </section>

        <LaborAllocationSummary order={order} />
        <section className="grid gap-8 pt-6 sm:grid-cols-2">
          <Signature label="Creado por" value={order.prepared_by_name} />
          <Signature label="Aprobado por" value={order.approved_by_name} detail={order.approved_at ? formatDate(order.approved_at) : "Pendiente de aprobación"} />
        </section>
      </div>
    </Card>
  );
}

function Info({ label, value, detail }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p><p className="font-medium text-foreground">{value || "—"}</p>{detail && <p className="text-xs text-muted">{detail}</p>}</div>;
}

function Signature({ label, value, detail }) {
  return <div className="border-t-2 border-dashed border-border pt-2"><p className="text-sm font-medium text-foreground">{value || "—"}</p>{detail && <p className="text-xs text-muted">{detail}</p>}<p className="mt-1 text-xs uppercase tracking-wider text-muted">{label}</p></div>;
}
