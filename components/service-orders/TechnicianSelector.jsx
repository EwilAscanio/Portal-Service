"use client";

import { useMemo, useState } from "react";
import { Check, Search, Star, UserPlus, Users, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/utils/cn";

export function TechnicianSelector({ technicians = [], historicalTechnicians = [], value = [], onChange, error, loading = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState([]);
  const active = useMemo(() => technicians.filter((item) => item.status === "Activo"), [technicians]);
  const byId = useMemo(() => new Map([...historicalTechnicians, ...technicians].map((item) => [item.id, item])), [historicalTechnicians, technicians]);
  const selected = value.map((id) => byId.get(id) || { id, name: "Técnico no disponible", status: "Inactivo" });
  const activeIds = new Set(active.map((item) => item.id));
  const unavailable = draft.filter((id) => !activeIds.has(id));
  const filtered = active.filter((item) => [item.name, item.cedula, item.phone, item.email].some((field) => String(field || "").toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es"))));

  const showModal = () => { setDraft([...value]); setQuery(""); setOpen(true); };
  const toggle = (id) => setDraft((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  const makeLead = (id) => setDraft((current) => [id, ...current.filter((item) => item !== id)]);
  const apply = () => { onChange(draft); setOpen(false); };

  return <>
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-foreground">Técnicos asignados *</p><p className="text-xs text-muted">Selecciona hasta tres técnicos activos.</p></div><Button type="button" variant="secondary" icon={UserPlus} onClick={showModal} disabled={loading}>{value.length ? "Gestionar técnicos" : "Seleccionar técnicos"}</Button></div>
      {selected.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{selected.map((technician, index) => { const isUnavailable = !loading && !activeIds.has(technician.id); return <div key={technician.id} className={cn("flex items-center gap-3 rounded-xl border p-3", isUnavailable ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-surface")}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600"><Users className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{technician.name}</p><div className="flex gap-1.5">{index === 0 && <Badge variant="info" className="px-2 py-0">Principal</Badge>}{isUnavailable && <Badge variant="warning" className="px-2 py-0">Inactivo</Badge>}</div></div><button type="button" onClick={() => onChange(value.filter((id) => id !== technician.id))} aria-label={`Quitar ${technician.name}`} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-red-500"><X className="h-4 w-4" /></button></div>; })}</div> : <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">No hay técnicos asignados.</div>}
      <p className="text-xs text-muted">{value.length} de 3 seleccionados</p>
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </div>

    <Modal open={open} onClose={() => setOpen(false)} title="Seleccionar técnicos" description="Agrega técnicos activos y define quién será el principal." size="2xl" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={apply} disabled={!draft.length || unavailable.length > 0}>Aplicar selección</Button></>}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, cédula, teléfono o correo…" className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15" /></div><Badge variant={draft.length === 3 ? "warning" : "info"}>{draft.length} de 3 seleccionados</Badge></div>
        {unavailable.length > 0 && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">La orden contiene un técnico inactivo. Quítalo o reemplázalo antes de aplicar la selección.<div className="mt-2 flex flex-wrap gap-2">{unavailable.map((id) => <button key={id} type="button" onClick={() => toggle(id)} className="rounded-lg bg-surface px-2.5 py-1 text-xs font-semibold text-foreground">Quitar {byId.get(id)?.name || "técnico"}</button>)}</div></div>}
        <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {filtered.length ? filtered.map((technician) => { const isSelected = draft.includes(technician.id); const isLead = draft[0] === technician.id; return <div key={technician.id} className={cn("flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center", isSelected ? "border-blue-500/40 bg-blue-500/5" : "border-border")}><button type="button" onClick={() => toggle(technician.id)} disabled={!isSelected && draft.length >= 3} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-50"><span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-border text-muted")}>{isSelected ? <Check className="h-4 w-4" /> : <Users className="h-4 w-4" />}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-foreground">{technician.name}</span><span className="block truncate text-xs text-muted">{technician.cedula || "Sin cédula"}{technician.phone ? ` · ${technician.phone}` : technician.email ? ` · ${technician.email}` : ""}</span></span></button>{isSelected && <Button type="button" variant={isLead ? "primary" : "secondary"} size="sm" icon={Star} onClick={() => makeLead(technician.id)} disabled={isLead}>{isLead ? "Principal" : "Marcar principal"}</Button>}</div>; }) : <div className="py-10 text-center text-sm text-muted">No se encontraron técnicos activos.</div>}
        </div>
      </div>
    </Modal>
  </>;
}
