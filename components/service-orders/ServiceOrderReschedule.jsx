"use client";

import { useEffect, useState } from "react";
import { getOrderCatalogs, rescheduleOrder } from "@/lib/api";
import { useLaborBudget } from "@/hooks/useLaborBudget";
import { LaborAllocationEditor, validateLaborDistribution } from "./LaborAllocationEditor";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { operationDateTimeInput, operationInputToInstant, unavailabilityOverlapping } from "@/lib/technician-unavailability";
import { allocationTechnicianIds, hourUnits } from "@/lib/labor-hours";
import { getSchedulingError } from "@/lib/ui-errors";

export function ServiceOrderReschedule({ order, onSaved, onClose }) {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [retry, setRetry] = useState(0);
  const [start, setStart] = useState(operationDateTimeInput(order.scheduled_start));
  const [end, setEnd] = useState(operationDateTimeInput(order.scheduled_end));
  const [reason, setReason] = useState("");
  const [lead, setLead] = useState(order.technical_id);
  const [allocations, setAllocations] = useState(order.labor_allocations.map((row) => ({ parItemId: row.par_item_id, technicalId: row.technical_id, hours: row.hours })));
  const labor = useLaborBudget(order.par_id, order.id);
  useEffect(() => {
    let ignore = false;
    getOrderCatalogs().then((data) => { if (!ignore) { setTechnicians(data.technicians); setCatalogError(""); } }).catch((err) => { if (!ignore) setCatalogError(getSchedulingError(err)); }).finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [retry]);
  const expected = new Map();
  for (const row of order.labor_allocations) expected.set(row.par_item_id, (expected.get(row.par_item_id) || 0) + hourUnits(row.hours));
  const budget = labor.budget ? { ...labor.budget, items: labor.budget.items.filter((item) => expected.has(item.id)) } : null;
  const submit = async (event) => {
    event.preventDefault(); setError("");
    const invalid = validateLaborDistribution(allocations, budget, {warranty:order.order_kind === "Garantia"});
    if (invalid) { setError(invalid); return; }
    const from = operationInputToInstant(start), to = operationInputToInstant(end);
    if (new Date(to) <= new Date(from)) { setError("La fecha final debe ser posterior a la inicial."); return; }
    const ids = allocationTechnicianIds(allocations, lead);
    if (ids.some((id) => { const tech = technicians.find((t) => t.id === id); return !tech || tech.status !== "Activo" || unavailabilityOverlapping(tech.unavailability, from, to).length; })) { setError("Seleccione técnicos activos y disponibles para las fechas indicadas."); return; }
    for (const [itemId, units] of expected) {
      if (allocations.filter((row) => Number(row.parItemId) === itemId).reduce((total, row) => total + hourUnits(row.hours), 0) !== units) { setError("Conserve las horas estimadas de cada renglón; puede repartirlas entre otros técnicos."); return; }
    }
    try {
      setSaving(true);
      const updated = await rescheduleOrder(order.id, { scheduleRevision: order.schedule_revision, scheduledStart: from, scheduledEnd: to, laborAllocations: allocations.map((row) => ({ ...row, hours: Number(row.hours) })), leadTechnicianId: ids[0], reason });
      onSaved(updated);
    } catch (err) { setError(getSchedulingError(err)); } finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="space-y-4">
    <Card><CardContent className="space-y-4"><h2 className="font-semibold">Reprogramar {order.order_code}</h2><p className="text-sm text-muted">La orden quedará Pendiente y necesitará nueva aprobación. Se conservarán su PAR, equipos y horas por renglón. La programación anterior quedará en el historial.</p><div className="grid gap-3 sm:grid-cols-2"><Input label="Desde (hora de Venezuela)" type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} disabled={saving} /><Input label="Hasta (hora de Venezuela)" type="datetime-local" required value={end} onChange={(e) => setEnd(e.target.value)} disabled={saving} /></div>{order.labor_allocations.filter((row, index, list) => list.findIndex((other) => other.par_item_id === row.par_item_id) === index).map((row) => <p key={row.par_item_id} className="text-sm">Renglón {row.source_item_no}: conservar <strong>{(expected.get(row.par_item_id) / 100).toFixed(2)} h</strong>.</p>)}<Textarea label="Motivo de la reprogramación" minLength={5} maxLength={2000} required value={reason} onChange={(e) => setReason(e.target.value)} disabled={saving} /></CardContent></Card>
    {catalogError && <div role="alert" className="space-y-2"><p>{catalogError}</p><Button type="button" variant="secondary" onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Reintentar catálogo</Button></div>}
    <LaborAllocationEditor warranty={order.order_kind === "Garantia"} budget={budget} loading={labor.loading || loading} loadError={labor.error} reload={labor.reload} technicians={technicians} value={allocations} onChange={setAllocations} leadTechnicianId={lead} onLeadChange={setLead} scheduledStart={start ? operationInputToInstant(start) : undefined} scheduledEnd={end ? operationInputToInstant(end) : undefined} disabled={saving || loading || labor.loading || !!catalogError} />
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Volver</Button><Button type="submit" loading={saving} disabled={loading || labor.loading || !!catalogError}>Guardar y solicitar nueva aprobación</Button></div>
  </form>;
}
