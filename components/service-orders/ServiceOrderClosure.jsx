"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, RefreshCw, Save, Upload } from "lucide-react";
import { getOrderClosure, updateOrderClosure, uploadOrderClosureFile, retireOrderClosureFile } from "@/lib/api";
import { CLOSURE_DOCUMENTS, MAX_CLOSURE_FILE_SIZE, canManageClosure, canCloseServiceOrder, requirementStatus } from "@/lib/service-order-closure";
import { hourUnits } from "@/lib/labor-hours";
import { getPublicError } from "@/lib/ui-errors";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";

const hours = (value) => Number(value || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (value) => value ? new Date(value).toLocaleString("es-VE") : "—";
const actionLabels = { equipment: "Equipos confirmados", hours: "Horas reales guardadas", requirement: "Requisito actualizado", upload_file: "Archivo adjunto", replace_file: "Archivo reemplazado", retire_file: "Archivo retirado", close: "O/S cerrada" };

function closureMessage(error) {
  const payload = error?.response?.data;
  return payload?.code?.startsWith("ORDER_CLOSURE_") && typeof payload.error === "string" ? payload.error : getPublicError(error);
}

function draftFrom(snapshot) {
  return { actuals: snapshot.allocations.map((row) => ({ allocationId: String(row.id), hours: row.actual_hours == null ? "" : String(row.actual_hours), note: row.actual_note || "" })),
    notes: snapshot.order.closure_notes || "", excessReason: snapshot.order.excess_reason || "" };
}

export function ServiceOrderClosure({ orderId, role, onCompleted, onOrderChanged }) {
  const [snapshot, setSnapshot] = useState(null);
  const [draft, setDraft] = useState({ actuals: [], notes: "", excessReason: "" });
  const [dirty, setDirty] = useState(false);
  const [equipmentIds, setEquipmentIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);
  const [retiring, setRetiring] = useState(null);
  const [retirementReason, setRetirementReason] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const data = await getOrderClosure(orderId);
      setSnapshot(data); setDraft(draftFrom(data)); setDirty(false); setEquipmentIds([]);
    } catch (failure) { setError(closureMessage(failure)); }
    finally { setBusy(false); }
  }, [orderId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del expediente
  useEffect(() => { load(); }, [load]);

  const run = async (operation) => {
    if (working.current) return null;
    working.current = true; setBusy(true); setError("");
    try {
      const next = await operation();
      setSnapshot(next);
      return next;
    } catch (failure) {
      const message = closureMessage(failure);
      setError(message); notify.error("No se pudo guardar el expediente", { description: message });
      return null;
    } finally { working.current = false; setBusy(false); }
  };

  const action = (data) => run(() => updateOrderClosure(orderId, { ...data, revision: snapshot.order.closure_revision }));
  const editDraft = (next) => { setDraft(next); setDirty(true); };
  const upload = async (requirement, files, replaceId) => {
    if (!files.length) return;
    if (files.some((file) => !file.size || file.size > MAX_CLOSURE_FILE_SIZE || !/\.(pdf|jpe?g|png)$/i.test(file.name))) {
      setError("Seleccione PDF, JPG o PNG no vacíos, de hasta 10 MB cada uno."); return;
    }
    await run(async () => {
      let next = snapshot;
      for (const file of files) {
        const form = new FormData();
        form.set("equipmentId", requirement.equipment_id); form.set("category", requirement.category);
        form.set("revision", String(next.order.closure_revision)); form.set("file", file);
        if (replaceId) form.set("replaceId", replaceId);
        next = await uploadOrderClosureFile(orderId, form);
        // Cada archivo se confirma individualmente; un fallo posterior conserva los ya cargados.
        setSnapshot(next);
      }
      return next;
    });
  };

  if (!snapshot) return <Card><CardContent className="space-y-3"><p role={error ? "alert" : "status"}>{error || "Cargando expediente de cierre…"}</p>{error && <Button onClick={load} disabled={busy}>Reintentar</Button>}</CardContent></Card>;

  const { order, requirements, allocations, equipment, budget } = snapshot;
  const editable = order.status === "En Proceso" && canManageClosure(role);
  const actualById = new Map(draft.actuals.map((row) => [row.allocationId, row]));
  let actualUnits = 0;
  let invalidHours = false;
  let exceeded = false;
  const actualByItem = new Map();
  for (const row of allocations) {
    const actual = actualById.get(String(row.id));
    const value = Number(actual?.hours);
    const units = hourUnits(value);
    if (!actual || actual.hours === "" || !Number.isFinite(value) || value < 0 || value > 999999.99 || Math.abs(value * 100 - units) > 0.000001 || (!units && actual.note.trim().length < 5)) invalidHours = true;
    if (Number.isFinite(units)) {
      actualUnits += units;
      actualByItem.set(row.par_item_id, (actualByItem.get(row.par_item_id) || 0) + units);
      if (units > hourUnits(row.hours)) exceeded = true;
    }
  }
  if (actualUnits > 99999999) invalidHours = true;
  for (const [itemId, units] of actualByItem) if (units > hourUnits(budget.items.find((item) => item.id === itemId)?.available_hours ?? 0)) exceeded = true;
  const resolved = requirements.filter((item) => requirementStatus(item) !== "Pendiente").length;
  const expected = equipment.length * CLOSURE_DOCUMENTS.length;
  const missing = [];
  if (!order.equipment_scope_confirmed) missing.push("Confirmar los equipos atendidos.");
  if (order.labor_review_required) missing.push("Revisar la distribución de horas anteriores desde la vista previa.");
  if (resolved !== expected || !expected) missing.push("Resolver los documentos pendientes de cada equipo.");
  if (invalidHours) missing.push("Completar las horas reales y explicar las asignaciones con cero horas.");
  if (exceeded && draft.excessReason.trim().length < 5) missing.push("Justificar el exceso de horas.");
  if (dirty) missing.push("Guardar las horas y observaciones antes de cerrar.");

  const saveHours = async () => {
    if (invalidHours) { setError("Complete las horas reales, con hasta dos decimales, y explique las asignaciones con cero horas."); return; }
    const next = await action({ action: "hours", ...draft, actuals: draft.actuals.map((row) => ({ ...row, hours: Number(row.hours) })) });
    if (next) { setDraft(draftFrom(next)); setDirty(false); notify.success("Horas reales guardadas."); await onOrderChanged?.(); }
  };

  return <div className="space-y-5">
    <Card><CardHeader><CardTitle>Expediente de cierre · {order.order_code}</CardTitle><Button variant="ghost" icon={RefreshCw} disabled={busy} onClick={() => dirty ? setConfirmReload(true) : load()}>Actualizar</Button></CardHeader><CardContent className="space-y-3">
      {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
      {order.closure_legacy ? <p className="text-sm">Orden completada antes del control de cierre. Sus horas anteriores se conservan; no se consideran horas reales confirmadas.</p> : <p className="text-sm">Documentos resueltos: <strong>{resolved} de {expected}</strong>. Estimadas: <strong>{hours(order.worked_hours)} h</strong>. {order.closed_at ? <>Reales confirmadas: <strong>{hours(order.actual_hours)} h</strong>. Cierre por {order.closed_by_name} · {date(order.closed_at)}.</> : "Las horas reales se confirmarán al cerrar la O/S."}</p>}
      {order.status === "Cancelada" && <p className="text-sm">Orden cancelada: sus horas están liberadas. Los documentos y reportes registrados permanecen en el historial.</p>}
      {order.status !== "En Proceso" && !order.closure_legacy && <p className="text-sm text-muted">El expediente está en consulta. La carga se habilita durante En Proceso.</p>}
    </CardContent></Card>

    {!order.equipment_scope_confirmed && <Card><CardHeader><CardTitle>Confirmar equipos atendidos</CardTitle></CardHeader><CardContent className="space-y-3">
      <p className="text-sm text-muted">Esta orden anterior mostraba todos los equipos del PAR. Seleccione los que corresponden al servicio antes de cargar documentos.</p>
      <fieldset disabled={!editable || busy} className="space-y-2">{snapshot.candidates.map((item) => <label key={item.id} className="flex gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={equipmentIds.includes(item.id)} onChange={(event) => setEquipmentIds(event.target.checked ? [...equipmentIds, item.id] : equipmentIds.filter((id) => id !== item.id))} /><span>{item.name} · {item.serial || "Sin serial"}</span></label>)}</fieldset>
      {editable && <Button disabled={busy || !equipmentIds.length} onClick={async () => { if (await action({ action: "equipment", equipmentIds })) await onOrderChanged?.(); }}>Confirmar equipos</Button>}
    </CardContent></Card>}

    {!order.closure_legacy && order.equipment_scope_confirmed && equipment.map((item) => <Card key={item.id}><CardHeader><CardTitle>{item.name} · {item.serial || "Sin serial"}</CardTitle></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2">
      {CLOSURE_DOCUMENTS.map((category) => {
        const requirement = requirements.find((entry) => entry.equipment_id === item.id && entry.category === category.value);
        return requirement && <RequirementCard key={requirement.id + ":" + requirement.updated_at} orderId={orderId} requirement={requirement} label={category.label} editable={editable} busy={busy}
          upload={upload} onRetire={(file) => { setRetiring(file); setRetirementReason(""); }}
          onException={(notApplicable, justification) => action({ action: "requirement", equipmentId: item.id, category: category.value, notApplicable, justification })} />;
      })}
    </CardContent></Card>)}

    {!order.closure_legacy && <Card><CardHeader><CardTitle>Horas reales del servicio</CardTitle></CardHeader><CardContent className="space-y-4">
      <p className="text-sm text-muted">Registre lo reportado por cada técnico programado. Las horas estimadas se conservan. Si no participó, indique 0 y explique el motivo.</p>
      {order.labor_review_required ? <p role="alert" className="text-sm text-amber-600">Revise primero las horas anteriores desde la vista previa de la orden.</p> : <>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Renglón / técnico programado</th><th className="p-2 text-right">Estimadas</th><th className="min-w-36 p-2">Reales</th><th className="p-2 text-right">Diferencia</th><th className="min-w-48 p-2">Observación</th></tr></thead><tbody>{allocations.map((row) => {
          const actual = actualById.get(String(row.id));
          const change = (field, value) => editDraft({ ...draft, actuals: draft.actuals.map((entry) => entry.allocationId === String(row.id) ? { ...entry, [field]: value } : entry) });
          return <tr key={row.id} className="border-t border-border"><td className="p-2">{row.source_item_no}. {row.description}<span className="block font-semibold">{row.technician_name}</span></td><td className="p-2 text-right">{hours(row.hours)}</td><td className="p-2">{editable ? <Input aria-label={"Horas reales de " + row.technician_name + ", renglón " + row.source_item_no} type="number" min="0" max="999999.99" step="0.01" placeholder="Por reportar" value={actual?.hours ?? ""} disabled={busy} onChange={(event) => change("hours", event.target.value)} /> : row.actual_hours == null ? "Sin reporte" : hours(row.actual_hours)}</td><td className="p-2 text-right">{actual?.hours === "" ? "—" : hours(Number(actual?.hours) - Number(row.hours))}</td><td className="p-2">{editable ? <Input aria-label={"Observación de " + row.technician_name + ", renglón " + row.source_item_no} maxLength={2000} placeholder="Obligatoria si son 0 h" value={actual?.note || ""} disabled={busy} onChange={(event) => change("note", event.target.value)} /> : row.actual_note || "—"}</td></tr>;
        })}</tbody></table></div>
        {!allocations.length && <p className="text-sm">Esta orden no tiene horas presupuestadas distribuidas. Se conserva la explicación de la revisión anterior.</p>}
        <p className="font-semibold">Total real {order.closed_at ? "confirmado" : "reportado"}: {hours(actualUnits / 100)} h</p>
        <div className="rounded-xl border border-border p-3 text-sm"><p className="mb-2 font-semibold">Saldo del PAR después de este cierre, por renglón</p>{budget.items.map((item) => {
          const remaining = (hourUnits(item.available_hours) - (actualByItem.get(item.id) || 0)) / 100;
          return <p key={item.id}>{item.item_no}. {item.description}: {remaining < 0 ? <span className="text-amber-600">Exceso de {hours(-remaining)} h · 0 h disponibles</span> : <span>{hours(remaining)} h disponibles</span>}</p>;
        })}{!!budget.pendingReviewOrders.length && <p className="mt-2 text-amber-600">Saldo provisional: existen otras órdenes con horas anteriores por revisar.</p>}{invalidHours && <p className="mt-2 text-muted">La proyección estará completa al ingresar todas las horas reales.</p>}</div>
        <Textarea label={exceeded ? "Justificación del exceso de horas *" : "Justificación del exceso de horas (si corresponde)"} value={draft.excessReason} maxLength={2000} readOnly={!editable} disabled={busy} onChange={(event) => editDraft({ ...draft, excessReason: event.target.value })} />
        <Textarea label="Observaciones del cierre" value={draft.notes} maxLength={2000} readOnly={!editable} disabled={busy} onChange={(event) => editDraft({ ...draft, notes: event.target.value })} />
        {editable && <Button icon={Save} disabled={busy || !dirty} onClick={saveHours}>Guardar horas y observaciones</Button>}
      </>}
    </CardContent></Card>}

    {editable && canCloseServiceOrder(role) && <Card><CardContent className="space-y-3"><h3 className="font-semibold">Cerrar O/S</h3>{missing.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{missing.map((message) => <li key={message}>{message}</li>)}</ul> : <p className="text-sm">Documentos y horas registrados. Puede confirmar el cierre.</p>}<Button variant="success" icon={CheckCircle2} disabled={busy || !!missing.length} onClick={() => setConfirmClose(true)}>Cerrar O/S</Button></CardContent></Card>}

    {!!snapshot.events.length && <Card><CardHeader><CardTitle>Historial del expediente</CardTitle></CardHeader><CardContent className="space-y-3">{snapshot.events.map((event) => <details key={event.id} className="rounded-xl border border-border p-3 text-sm"><summary className="cursor-pointer">{actionLabels[event.action] || event.action} · {event.actor_name} · {date(event.created_at)}</summary><EventDetails event={event} allocations={allocations} equipment={equipment} /></details>)}</CardContent></Card>}

    <ConfirmDialog open={confirmClose} onClose={() => !busy && setConfirmClose(false)} loading={busy} danger={false} title="¿Cerrar esta O/S?" confirmLabel="Cerrar O/S"
      description={"Se confirmarán " + hours(actualUnits / 100) + " horas reales, los documentos y las justificaciones. El saldo del PAR se actualizará y el expediente quedará en consulta."}
      onConfirm={async () => { const next = await action({ action: "close" }); setConfirmClose(false); if (next) { notify.success("O/S cerrada."); await onCompleted?.(); } }} />
    <ConfirmDialog open={confirmReload} onClose={() => setConfirmReload(false)} title="¿Actualizar el expediente?" description="Los cambios de horas que aún no guardó se descartarán." confirmLabel="Actualizar" onConfirm={async () => { setConfirmReload(false); await load(); }} />
    <Modal open={!!retiring} onClose={() => !busy && setRetiring(null)} title="Retirar archivo" description={retiring?.original_name}
      footer={<><Button variant="secondary" disabled={busy} onClick={() => setRetiring(null)}>Volver</Button><Button variant="danger" loading={busy} disabled={retirementReason.trim().length < 5} onClick={async () => { if (await run(() => retireOrderClosureFile(orderId, retiring.id, { revision: order.closure_revision, reason: retirementReason.trim() }))) setRetiring(null); }}>Retirar archivo</Button></>}>
      <Textarea label="Motivo del retiro *" value={retirementReason} maxLength={2000} onChange={(event) => setRetirementReason(event.target.value)} disabled={busy} hint="El archivo permanecerá en el historial y dejará de contar para el cierre." />
    </Modal>
  </div>;
}

function RequirementCard({ orderId, requirement, label, editable, busy, upload, onRetire, onException }) {
  const [showException, setShowException] = useState(false);
  const [reason, setReason] = useState(requirement.justification || "");
  const files = requirement.files || [];
  const fileLink = (file) => "/api/service-order/" + orderId + "/closure/files/" + file.id;
  return <section className="space-y-3 rounded-xl border border-border p-4"><div className="flex items-start justify-between gap-2"><h4 className="font-semibold">{label}</h4><span className="rounded-lg bg-surface-2 px-2 py-1 text-xs">{requirementStatus(requirement)}</span></div>
    {requirement.not_applicable && <div className="text-sm"><p className="whitespace-pre-wrap">{requirement.justification}</p><p className="text-xs text-muted">{requirement.updated_by_name} · {date(requirement.updated_at)}</p></div>}
    {files.filter((file) => !file.retired_at).map((file) => <div key={file.id} className="space-y-2 rounded-lg bg-surface-2 p-3 text-sm"><FileLinks file={file} href={fileLink(file)} />
      {editable && <div className="flex flex-wrap items-center gap-3"><Button size="sm" variant="ghost" disabled={busy} onClick={() => onRetire(file)}>Retirar</Button><label className="text-xs font-medium">Reemplazar<Input aria-label={"Reemplazar " + file.original_name} type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busy} onChange={(event) => { const selected = Array.from(event.target.files || []); event.target.value = ""; upload(requirement, selected, file.id); }} /></label></div>}
    </div>)}
    {editable && !requirement.not_applicable && <div className="space-y-2"><Input label={<span className="flex items-center gap-2"><Upload className="h-4 w-4" />Adjuntar archivos</span>} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" disabled={busy} hint="PDF, JPG o PNG · hasta 10 MB por archivo" onChange={(event) => { const selected = Array.from(event.target.files || []); event.target.value = ""; upload(requirement, selected); }} />
      {!files.some((file) => !file.retired_at) && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setShowException(!showException)}>Marcar No aplica</Button>}
    </div>}
    {editable && requirement.not_applicable && <Button size="sm" variant="secondary" disabled={busy} onClick={() => onException(false, "")}>Quitar No aplica</Button>}
    {editable && showException && !requirement.not_applicable && <div className="space-y-2"><Textarea label="Justificación de No aplica *" value={reason} maxLength={2000} disabled={busy} onChange={(event) => setReason(event.target.value)} /><Button size="sm" disabled={busy || reason.trim().length < 5} onClick={async () => { if (await onException(true, reason.trim())) setShowException(false); }}>Guardar No aplica</Button></div>}
    {files.some((file) => file.retired_at) && <details className="text-sm"><summary className="cursor-pointer text-muted">Archivos anteriores ({files.filter((file) => file.retired_at).length})</summary><div className="mt-2 space-y-3">{files.filter((file) => file.retired_at).map((file) => <div key={file.id} className="rounded-lg border border-border p-2"><FileLinks file={file} href={fileLink(file)} /><p className="mt-1 text-xs text-muted">Retirado por {file.retired_by_name} · {date(file.retired_at)}. {file.retirement_reason}</p></div>)}</div></details>}
  </section>;
}

function FileLinks({ file, href }) {
  return <><p className="break-all font-medium">{file.original_name}</p><p className="text-xs text-muted">{(file.byte_size / 1024 / 1024).toFixed(2)} MB · {file.uploaded_by_name} · {date(file.uploaded_at)}</p><div className="flex gap-3 text-xs font-semibold text-blue-600"><a href={href} target="_blank" rel="noopener noreferrer">Abrir</a><a href={href + "?download=1"} target="_blank" rel="noopener noreferrer">Descargar</a></div></>;
}

function EventDetails({ event, allocations, equipment }) {
  const details = event.details || {};
  return <div className="mt-2 space-y-1 text-xs text-muted">
    {details.name && <p>{details.name}</p>}
    {details.category && <p>{CLOSURE_DOCUMENTS.find((item) => item.value === details.category)?.label} · {equipment.find((item) => item.id === details.equipmentId)?.name}</p>}
    {details.notApplicable !== undefined && <p>{details.notApplicable ? "No aplica: " + details.justification : "Se retiró No aplica."}</p>}
    {details.before?.notApplicable && <p>Justificación anterior: {details.before.justification}</p>}
    {details.reason && <p>{details.reason}</p>}
    {details.equipmentIds && <p>{details.equipmentIds.map((id) => equipment.find((item) => item.id === id)?.name || "Equipo registrado").join(", ")}</p>}
    {details.after?.map((actual) => { const row = allocations.find((item) => String(item.id) === String(actual.allocationId)); const previous = details.before?.find((item) => String(item.allocationId) === String(actual.allocationId)); return <p key={actual.allocationId}>{row?.technician_name} · {row?.description}: {previous?.hours == null ? "Sin reporte" : hours(previous.hours) + " h"} → {hours(actual.hours)} h. {actual.note}</p>; })}
    {details.actualHours !== undefined && <p>Estimadas: {hours(details.estimatedHours)} h · Reales: {hours(details.actualHours)} h.</p>}
    {details.excessReason && <p>Exceso: {details.excessReason}</p>}{details.notes && <p>Observaciones: {details.notes}</p>}
    {details.previousExcessReason && <p>Justificación anterior: {details.previousExcessReason}</p>}{details.previousNotes && <p>Observaciones anteriores: {details.previousNotes}</p>}
  </div>;
}
