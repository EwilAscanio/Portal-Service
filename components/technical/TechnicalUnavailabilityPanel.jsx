"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { getTechnicianUnavailability, createTechnicianUnavailability, updateTechnicianUnavailability, cancelTechnicianUnavailability, getUnavailabilityImpact } from "@/lib/api";
import { unavailabilityStatus, UNAVAILABILITY_REASONS, unavailabilityReasonLabel, historicalUnavailabilityReason, OPERATION_TIME_ZONE } from "@/lib/technician-unavailability";
import { getSchedulingError as getPublicError } from "@/lib/ui-errors";

function ConflictList({ impact }) {
  if (!impact) return null;
  return <div role="status" className="space-y-2 rounded-xl border border-border p-3 text-sm">
    {!impact.orders.length && !impact.unavailability.length && <p>No hay coincidencias. Se comprobará nuevamente al guardar.</p>}
    {impact.orders.length > 0 && <><p className="font-semibold text-red-600">Resuelva estas O/S antes de registrar la no disponibilidad:</p><ul className="space-y-2">{impact.orders.map((order) => <li key={order.id}><Link className="font-semibold text-blue-600 underline" href={`/ordenes/${order.id}`}>{order.order_code}</Link> · {order.status}<span className="block text-xs text-muted">{new Intl.DateTimeFormat("es-VE", { timeZone: OPERATION_TIME_ZONE, dateStyle: "short", timeStyle: "short" }).format(new Date(order.scheduled_start))} — {new Intl.DateTimeFormat("es-VE", { timeZone: OPERATION_TIME_ZONE, dateStyle: "short", timeStyle: "short" }).format(new Date(order.scheduled_end))}</span></li>)}</ul></>}
    {impact.unavailability.map((unavailability) => <p key={unavailability.id} className="text-red-600">Período de no disponibilidad coincidente: {unavailability.start_date} al {unavailability.end_date}.</p>)}
  </div>;
}

export function TechnicalUnavailabilityPanel({ technicalId, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ reasonType: "Vacaciones", startDate: "", endDate: "", note: "", reason: "" });
  const [impact, setImpact] = useState(null);
  const load = useCallback(async () => {
    try { setLoading(true); setError(""); setData(await getTechnicianUnavailability(technicalId)); }
    catch (err) { setError(getPublicError(err)); }
    finally { setLoading(false); }
  }, [technicalId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga del expediente del técnico
  useEffect(() => { load(); }, [load]);

  const begin = (action, unavailability = null) => {
    setMode(action); setSelected(unavailability); setImpact(null); setError("");
    setForm({ reasonType: unavailability?.reason_type || "Vacaciones", startDate: unavailability?.start_date || "", endDate: unavailability?.end_date || "", note: unavailability?.note || "", reason: "" });
  };
  const field = (key) => (event) => { setForm((current) => ({ ...current, [key]: event.target.value })); setImpact(null); };
  const showError = (err) => {
    setError(getPublicError(err));
    const body = err.response?.data;
    if (body?.code === "UNAVAILABILITY_OPEN_ORDERS") setImpact({ orders: body.conflicts || [], unavailability: [] });
    if (body?.code === "UNAVAILABILITY_OVERLAP") setImpact({ orders: [], unavailability: body.conflicts || [] });
  };
  const check = async () => {
    try { setSaving(true); setError(""); setImpact(await getUnavailabilityImpact(technicalId, { startDate: form.startDate, endDate: form.endDate, unavailabilityId: selected?.id || null })); }
    catch (err) { showError(err); } finally { setSaving(false); }
  };
  const save = async (event) => {
    event.preventDefault();
    try {
      setSaving(true); setError("");
      if (mode === "cancel") await cancelTechnicianUnavailability(technicalId, selected.id, { revision: selected.revision, reason: form.reason });
      else {
        const payload = { reasonType: form.reasonType, startDate: form.startDate, endDate: form.endDate, note: form.note };
        if (mode === "edit") await updateTechnicianUnavailability(technicalId, selected.id, { ...payload, revision: selected.revision, reason: form.reason });
        else await createTechnicianUnavailability(technicalId, payload);
      }
      setMode(null); setImpact(null); await load(); onChanged?.();
    } catch (err) { showError(err); } finally { setSaving(false); }
  };

  return <section className="space-y-4 border-t border-border pt-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Disponibilidad del técnico</h3><div className="flex gap-2"><Button type="button" size="sm" variant="ghost" onClick={load} disabled={saving || loading}>Actualizar</Button>{data?.canManage && !mode && <Button type="button" size="sm" onClick={() => begin("new")}>Registrar no disponibilidad</Button>}</div></div>
    <p className="text-xs text-muted">Días completos, incluido el último día, en horario de Venezuela. Las O/S abiertas que coincidan deben resolverse antes de guardar.</p>
    {loading && <p role="status">Cargando no disponibilidad…</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {mode && <form onSubmit={save} className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <h4 className="font-semibold">{mode === "new" ? "Registrar no disponibilidad" : mode === "edit" ? "Modificar no disponibilidad" : "Cancelar no disponibilidad"}</h4>
      {mode !== "cancel" ? <><Select label="Motivo de no disponibilidad" required options={UNAVAILABILITY_REASONS} value={form.reasonType} onChange={field("reasonType")} disabled={saving} /><div className="grid gap-3 sm:grid-cols-2"><Input label="Fecha de inicio" type="date" min="1900-01-01" max="9998-12-31" required value={form.startDate} onChange={field("startDate")} disabled={saving} /><Input label="Último día no disponible (incluido)" type="date" min={form.startDate || "1900-01-01"} max="9998-12-31" required value={form.endDate} onChange={field("endDate")} disabled={saving} /></div><Textarea label={form.reasonType === "Otros" ? "Detalle administrativo (obligatorio)" : "Detalle administrativo (opcional)"} required={form.reasonType === "Otros"} minLength={form.reasonType === "Otros" ? 5 : undefined} maxLength={2000} value={form.note} onChange={field("note")} disabled={saving} /></> : <p className="text-sm">{selected.start_date} al {selected.end_date}. Se conservará el historial del período.</p>}
      {mode !== "new" && <Textarea label="Motivo del cambio" minLength={5} maxLength={2000} required value={form.reason} onChange={field("reason")} disabled={saving} />}
      <ConflictList impact={impact} />
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" disabled={saving} onClick={() => { setMode(null); setImpact(null); }}>Volver</Button>{mode !== "cancel" && <Button type="button" variant="secondary" disabled={saving} onClick={check}>Revisar coincidencias</Button>}<Button type="submit" loading={saving} variant={mode === "cancel" ? "danger" : "primary"}>{mode === "cancel" ? "Confirmar cancelación" : "Guardar no disponibilidad"}</Button></div>
    </form>}
    {!loading && data && !data.unavailability.length && <p className="text-sm text-muted">No hay períodos de no disponibilidad registrados.</p>}
    {data?.unavailability.map((unavailability) => <div key={unavailability.id} className="space-y-2 rounded-xl border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{unavailability.start_date} al {unavailability.end_date}</p><Badge variant={unavailability.cancelled_at ? "default" : unavailabilityStatus(unavailability) === "Vigente" ? "warning" : "info"}>{unavailabilityStatus(unavailability)}</Badge></div>{data.canManage && <p className="text-sm font-medium">{unavailabilityReasonLabel(unavailability.reason_type)}</p>}{unavailability.note && <p className="whitespace-pre-wrap text-sm text-muted">{unavailability.note}</p>}{unavailability.cancellation_reason && <p className="text-sm">Cancelación: {unavailability.cancellation_reason}</p>}{data.canManage && !unavailability.cancelled_at && <div className="flex gap-2"><Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => begin("edit", unavailability)}>Modificar</Button><Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => begin("cancel", unavailability)}>Cancelar no disponibilidad</Button></div>}</div>)}
    {data?.canManage && data.events.length > 0 && <details className="text-sm"><summary className="cursor-pointer font-semibold">Historial de disponibilidad</summary><ul className="mt-3 space-y-3">{data.events.map((event) => <li key={event.id} className="border-l-2 border-border pl-3"><p>{({ Registradas: "Registrado", Modificadas: "Modificado", Canceladas: "Cancelado" })[event.action] || event.action} · {event.actor_name} · {new Date(event.created_at).toLocaleString("es-VE", { timeZone: OPERATION_TIME_ZONE })}</p><p>{event.reason}</p>{event.details.before && <p className="text-xs text-muted">Anterior: {historicalUnavailabilityReason(event.details.before)} · {event.details.before.start_date} al {event.details.before.end_date}{event.details.before.note ? ` · ${event.details.before.note}` : ""}</p>}<p className="text-xs text-muted">Registrado: {historicalUnavailabilityReason(event.details.after)} · {event.details.after.start_date} al {event.details.after.end_date}{event.details.after.note ? ` · ${event.details.after.note}` : ""}</p></li>)}</ul></details>}
  </section>;
}
