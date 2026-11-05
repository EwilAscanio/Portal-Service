"use client";

import { useEffect, useState } from "react";
import { getOrderScheduleHistory } from "@/lib/api";
import { getSchedulingError } from "@/lib/ui-errors";
import { OPERATION_TIME_ZONE } from "@/lib/technician-unavailability";
import { Button } from "@/components/ui/Button";

function Snapshot({ value, label }) {
  if (!value) return null;
  const date = (time) => time ? new Date(time).toLocaleString("es-VE", { timeZone: OPERATION_TIME_ZONE }) : "—";
  return <div className="space-y-1 rounded-lg border border-border p-3"><p className="font-semibold">{label}: {value.status}</p><p>{date(value.scheduled_start)} — {date(value.scheduled_end)}</p><p>Responsable: {value.technicians.find((t) => t.id === value.technical_id)?.name || "—"}</p>{value.labor_allocations.map((row) => <p key={row.id}>Renglón {row.source_item_no} · {row.technician_name}: {Number(row.hours).toFixed(2)} h</p>)}<p>Aprobación: {value.approved_by_name || "Pendiente"} · {date(value.approved_at)}</p></div>;
}

export function ServiceOrderScheduleHistory({ orderId }) {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let ignore = false;
    getOrderScheduleHistory(orderId).then((rows) => { if (!ignore) { setEvents(rows); setError(""); } }).catch((err) => { if (!ignore) setError(getSchedulingError(err)); });
    return () => { ignore = true; };
  }, [orderId, retry]);
  return <details className="rounded-xl border border-border bg-surface p-4 print:hidden"><summary className="cursor-pointer font-semibold">Historial de programación y aprobaciones</summary>{error && <div role="alert"><p>{error}</p><Button variant="ghost" onClick={() => setRetry((value) => value + 1)}>Reintentar</Button></div>}{!error && !events.length && <p className="mt-3 text-sm text-muted">No hay eventos de programación registrados desde la incorporación de este historial.</p>}<div className="mt-3 space-y-4">{events.map((event) => <article key={event.id} className="space-y-2 text-sm"><h3 className="font-semibold">{event.action} · {event.actor_name} · {new Date(event.created_at).toLocaleString("es-VE", { timeZone: OPERATION_TIME_ZONE })}</h3>{event.reason && <p className="whitespace-pre-wrap">{event.reason}</p>}<div className="grid gap-3 lg:grid-cols-2"><Snapshot value={event.details.before} label="Programación anterior" /><Snapshot value={event.details.after} label="Programación registrada" /></div></article>)}</div></details>;
}
