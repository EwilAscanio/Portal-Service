"use client";

import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { allocationTechnicianIds, hourUnits, sumLaborHours } from "@/lib/labor-hours";
import { MAX_SERVICE_ORDER_TECHNICIANS } from "@/lib/service-order-policy";
import { unavailabilityOverlapping } from "@/lib/technician-unavailability";

export function validateLaborDistribution(value, budget, { reviewing = false, warranty = false } = {}) {
  if (!budget) return "Espere a que se cargue el saldo de horas.";
  if (!reviewing && !warranty && budget.pendingReviewOrders.length) return "Primero debe revisar las órdenes anteriores de este PAR.";
  if (!reviewing && !value.length) return "Asigne horas de mano de obra a uno o más técnicos.";
  if (allocationTechnicianIds(value).length > MAX_SERVICE_ORDER_TECHNICIANS) return `Puede asignar hasta ${MAX_SERVICE_ORDER_TECHNICIANS} técnicos distintos en toda la orden.`;
  const totals = new Map();
  const pairs = new Set();
  for (const row of value) {
    const item = budget.items.find((item) => item.id === Number(row.parItemId));
    const units = hourUnits(row.hours);
    const pair = `${row.parItemId}:${row.technicalId}`;
    if (!item || !row.technicalId || !Number.isFinite(Number(row.hours)) || units <= 0 || Math.abs(Number(row.hours) * 100 - units) > 0.000001) return "Complete el técnico y las horas positivas (máximo dos decimales) de cada asignación.";
    if (pairs.has(pair)) return "Un técnico solo puede aparecer una vez en cada renglón; sume sus horas.";
    pairs.add(pair);
    totals.set(item.id, (totals.get(item.id) || 0) + units);
    if (!warranty && totals.get(item.id) > hourUnits(item.available_hours)) return `Las horas del renglón ${item.item_no} superan su saldo disponible.`;
  }
  return "";
}

export function LaborAllocationEditor({ warranty = false, budget, loading, loadError, reload, technicians, value, onChange, leadTechnicianId, onLeadChange, reviewing = false, disabled = false, error, scheduledStart, scheduledEnd }) {
  const ids = allocationTechnicianIds(value);
  const updateRow = (index, field, next) => onChange(value.map((row, i) => i === index ? { ...row, [field]: next } : row));
  const options = technicians.filter((t) => reviewing || t.status === "Activo" || ids.includes(t.id));
  const absences = new Map(options.map((t) => [t.id, reviewing ? [] : unavailabilityOverlapping(t.unavailability, scheduledStart, scheduledEnd)]));
  return (
    <Card>
      <CardHeader><CardTitle>Distribución de mano de obra</CardTitle><Button type="button" variant="ghost" size="sm" onClick={reload} disabled={loading}>Actualizar saldo</Button></CardHeader>
      <CardContent className="space-y-4">
        {warranty ? <p className="text-sm text-muted">Estime las horas de esta garantía por renglón y técnico. No consumen saldo del PAR; máximo cuatro técnicos por orden.</p> : <p className="text-sm text-muted">Las horas presupuestadas del PAR se distribuyen como estimaciones entre los técnicos y las órdenes. Las horas reales se registran al cierre. El multiplicador del precio no cambia las horas. Máximo {MAX_SERVICE_ORDER_TECHNICIANS} técnicos distintos por orden, incluido el responsable.</p>}
        {loading && <p role="status" className="text-sm">Cargando presupuesto…</p>}
        {options.filter((t) => ids.includes(t.id) && absences.get(t.id).length).map((t) => <p key={t.id} role="alert" className="text-sm text-red-600">{t.name} no está disponible durante la programación seleccionada: {absences.get(t.id).map((v) => `${v.start_date} al ${v.end_date}`).join(", ")}. Cambie las fechas o sustituya al técnico.</p>)}
        {loadError && <p role="alert" className="text-sm text-red-500">{loadError}</p>}
        {budget && !warranty && <p className="font-semibold">Total de horas presupuestadas del PAR: {Number(budget.budgeted_hours).toFixed(2)} h</p>}
        {!warranty && !!budget?.pendingReviewOrders.length && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">Distribución pendiente en {budget.pendingReviewOrders.map((order) => order.order_code).join(", ")}. {reviewing ? "El saldo mostrado todavía no incluye sus horas; complete la revisión de todas las órdenes." : "Revise esas órdenes antes de reservar nuevas horas."}</p>}
        {budget && !budget.items.length && <p className="text-sm text-muted">Este PAR no contiene productos marcados como mano de obra. Clasifique los productos y vuelva a seleccionarlos en el PAR cuando su estado permita editarlo.</p>}
        {budget?.items.map((item) => {
          const rows = value.map((row, index) => ({ ...row, index })).filter((row) => Number(row.parItemId) === item.id);
          const assigned = sumLaborHours(rows);
          const remaining = (hourUnits(item.available_hours) - hourUnits(assigned)) / 100;
          return <section key={item.id} className="space-y-3 rounded-xl border border-border p-4">
            <h3 className="font-semibold">{item.item_no}. {item.description} <span className="text-xs font-normal text-muted">{item.product_code}</span></h3>
            {warranty ? <p className="text-sm">Horas estimadas de garantía: <strong>{assigned.toFixed(2)} h</strong></p> : <div className="grid gap-2 text-sm sm:grid-cols-4"><p>Presupuestadas: <strong>{Number(item.budgeted_hours).toFixed(2)} h</strong></p><p>En otras órdenes: <strong>{Number(item.committed_hours).toFixed(2)} h</strong></p><p>En esta orden: <strong>{assigned.toFixed(2)} h</strong></p><p className={remaining < 0 ? "text-red-500" : ""}>Saldo tras guardar: <strong>{remaining.toFixed(2)} h</strong></p></div>}
            {rows.map((row) => <div key={row.index} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Select label="Técnico" value={row.technicalId} onChange={(event) => updateRow(row.index, "technicalId", event.target.value)} disabled={disabled}>
                <option value="">Seleccione un técnico</option>
                {options.map((t) => <option key={t.id} value={t.id} disabled={!!absences.get(t.id).length || (!reviewing && t.status !== "Activo") || (t.id !== row.technicalId && rows.some((other) => other.technicalId === t.id)) || (!ids.includes(t.id) && ids.length >= MAX_SERVICE_ORDER_TECHNICIANS)}>{t.name}{t.status === "Inactivo" ? " (inactivo)" : ""}{absences.get(t.id).length ? ` (no disponible: ${absences.get(t.id).map((v) => `${v.start_date} al ${v.end_date}`).join(", ")})` : ""}</option>)}
              </Select>
              <Input label="Horas estimadas" type="number" min="0.01" max={warranty ? 999999.99 : Number(item.available_hours)} step="0.01" value={row.hours} onChange={(event) => updateRow(row.index, "hours", event.target.value)} disabled={disabled} />
              <Button type="button" variant="ghost" icon={Trash2} aria-label={`Quitar asignación del renglón ${item.item_no}`} onClick={() => onChange(value.filter((_, index) => index !== row.index))} disabled={disabled} />
            </div>)}
            <Button type="button" size="sm" variant="secondary" icon={Plus} disabled={disabled || rows.length >= MAX_SERVICE_ORDER_TECHNICIANS || (!warranty && remaining <= 0)} onClick={() => onChange([...value, { parItemId: item.id, technicalId: "", hours: "" }])}>Asignar técnico</Button>
          </section>;
        })}
        <div className="rounded-xl bg-surface-2 p-4">
          <p className="font-semibold">Horas estimadas de mano de obra: {sumLaborHours(value).toFixed(2)} h</p>
          {ids.map((id) => <p key={id} className="text-sm">{technicians.find((t) => t.id === id)?.name || "Técnico"}: {sumLaborHours(value.filter((row) => row.technicalId === id)).toFixed(2)} h</p>)}
        </div>
        {!reviewing && !!ids.length && <Select label="Técnico responsable" value={ids.includes(leadTechnicianId) ? leadTechnicianId : ids[0]} onChange={(event) => onLeadChange(event.target.value)} disabled={disabled} options={ids.map((id) => ({ value: id, label: technicians.find((t) => t.id === id)?.name || "Técnico" }))} />}
        {error && <p role="alert" className="text-sm font-medium text-red-500">{error}</p>}
      </CardContent>
    </Card>
  );
}
