"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Clock3, FileText } from "lucide-react";
import Link from "next/link";
import { ORDER_KINDS, canManageWarranty, orderKindLabel } from "@/lib/warranty";
import { getOrderCatalogs } from "@/lib/api";
import { getPublicError } from "@/lib/ui-errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ParSearch } from "@/components/service-orders/ParSearch";
import { LaborAllocationEditor, validateLaborDistribution } from "@/components/service-orders/LaborAllocationEditor";
import { useLaborBudget } from "@/hooks/useLaborBudget";
import { allocationTechnicianIds, sumLaborHours } from "@/lib/labor-hours";
import { ReadonlyField } from "@/components/ui/ReadonlyField";
import { useAuth } from "@/hooks/useAuth";
import { operationDateTimeInput, operationInputToInstant, unavailabilityOverlapping } from "@/lib/technician-unavailability";

const PRIORITIES = ["Alta", "Media", "Baja"];
const WORK_TYPES = [{ value: "Internal", label: "Interna" }, { value: "External", label: "Externa" }];
const SERVICE_TYPES = [
  { value: "Inspection", label: "Revisión" },
  { value: "Maintenance", label: "Mantenimiento" },
  { value: "Emergency", label: "Emergencia" },
  { value: "Other", label: "Otro" },
];

function localDateTime(value = new Date()) {
  return operationDateTimeInput(value);
}

export function buildServiceOrderDefaults(order) {
  if (!order) {
    const now = localDateTime();
    return {
      orderKind: "Normal", warrantyOrigin: "External", warrantyOriginOrderId: "", warrantyReference: "", warrantyServiceDate: "", warrantyReason: "", warrantyWorkByEquipment: {},
      orderCode: "", purchaseOrderNumber: "", quotationNumber: "", parId: "",
      workType: "External", serviceType: "Maintenance", callDate: now,
      scheduledStart: now, scheduledEnd: now,
      laborAllocations: [], leadTechnicianId: "", equipmentIds: [], priority: "Media",
    };
  }
  return {
    orderKind: order.order_kind || "Normal", warrantyOrigin: order.warranty_origin || "External", warrantyOriginOrderId: String(order.warranty_origin_order_id || ""), warrantyReference: order.warranty_reference || "", warrantyServiceDate: order.warranty_service_date ? String(order.warranty_service_date).slice(0,10) : "", warrantyReason: order.warranty_reason || "", warrantyWorkByEquipment: Object.fromEntries((order.equipment || []).map((row)=>[row.id,row.description || ""])),
    orderCode: order.order_code || "",
    purchaseOrderNumber: order.purchase_order_number || "",
    quotationNumber: order.quotation_number || "",
    parId: String(order.par_id || ""),
    equipmentIds: order.equipment_scope_confirmed ? (order.equipment || []).map((item) => item.id) : [],
    workType: order.work_type || "External",
    serviceType: order.service_type || "Maintenance",
    callDate: localDateTime(order.call_date),
    scheduledStart: localDateTime(order.scheduled_start),
    scheduledEnd: localDateTime(order.scheduled_end),
    laborAllocations: (order.labor_allocations || []).map((row) => ({ parItemId: row.par_item_id, technicalId: row.technical_id, hours: String(row.hours) })),
    leadTechnicianId: order.technical_id || "",
    priority: order.priority || "Media",
  };
}

export function ServiceOrderForm({ formId, defaultValues, context, lockPar = false, initialOriginId = null, loading, onSubmit, onReadyChange, onKindChange }) {
  const { user } = useAuth();
  // Una entrada desde O/S completada fija la identidad; no es un valor sugerido.
  const fromCompletedOrder = initialOriginId !== null;
  const [form, setForm] = useState(()=>fromCompletedOrder ? {...defaultValues,orderKind:"Garantia",warrantyOrigin:"Registered",warrantyOriginOrderId:initialOriginId} : defaultValues);
  const [catalogs, setCatalogs] = useState({ pars: [], technicians: [], originals: [] });
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [catalogsError, setCatalogsError] = useState("");
  const [errors, setErrors] = useState({});
  const labor = useLaborBudget(form.parId, lockPar ? context?.id : null);

  const loadCatalogs = useCallback(async () => {
    try {
      setCatalogsLoading(true);
      setCatalogsError("");
      const data = await getOrderCatalogs();
      setCatalogs({
        originals: data.originals || [],
        pars: data.pars || [],
        technicians: data.technicians || [],
      });
      if (fromCompletedOrder) {
        const source = data.originals?.find((row) => String(row.id) === String(initialOriginId));
        setForm((current) => ({ ...current, parId: String(source?.par_id || "") }));
      }
    } catch (error) {
      setCatalogsError(getPublicError(error, "No se pudieron cargar los catálogos."));
    } finally {
      setCatalogsLoading(false);
    }
  }, [initialOriginId, fromCompletedOrder]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del formulario
    loadCatalogs();
  }, [loadCatalogs]);

  const selectedPar = useMemo(
    () => catalogs.pars.find((item) => String(item.id) === String(form.parId)) || context || null,
    [catalogs.pars, form.parId, context]
  );
  const orderKind = fromCompletedOrder ? "Garantia" : form.orderKind;
  const warranty = orderKind === "Garantia";
  const warrantyOrigin = fromCompletedOrder ? "Registered" : form.warrantyOrigin;
  const warrantyOriginOrderId = fromCompletedOrder ? initialOriginId : form.warrantyOriginOrderId;
  const original = catalogs.originals.find((row) => String(row.id) === String(warrantyOriginOrderId));
  const originError = fromCompletedOrder && !catalogsLoading && !catalogsError
    ? !original ? "No se encontró la O/S completada de origen. No se puede crear esta garantía."
      : !selectedPar ? "El PAR de la O/S original no está disponible para crear la garantía." : ""
    : "";
  const readyToSubmit = !catalogsLoading && !catalogsError && !originError;
  useEffect(() => { onReadyChange?.(Boolean(readyToSubmit)); }, [onReadyChange, readyToSubmit]);
  useEffect(() => { onKindChange?.(orderKind); }, [onKindChange, orderKind]);
  const equipment = (selectedPar?.equipment || context?.equipment || []).filter((item)=>!warranty || warrantyOrigin !== "Registered" || original?.equipment_ids.includes(item.id));
  const availablePars = catalogs.pars.filter((par)=>warranty ? (warrantyOrigin !== "Registered" || par.id === original?.par_id) : par.purpose !== "ReferenciaGarantia");
  const selectedEquipment = equipment.filter((item) => form.equipmentIds.includes(item.id));
  const description = selectedEquipment.map((item) => item.description).filter(Boolean).join("\n");

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const setParId = (parId) => {
    setForm((current) => ({ ...current, parId, laborAllocations: [], leadTechnicianId: "", equipmentIds: [] }));
    setErrors((current) => ({ ...current, parId: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.parId || (!lockPar && !availablePars.some((par)=>String(par.id)===String(form.parId)))) next.parId = "Seleccione un PAR aprobado.";
    if (!form.equipmentIds.length) next.equipmentIds = "Seleccione al menos un equipo que atenderá esta O/S.";
    if (!form.callDate) next.callDate = "La fecha de llamada es obligatoria.";
    if (!form.scheduledStart) next.scheduledStart = "La fecha desde es obligatoria.";
    if (!form.scheduledEnd) next.scheduledEnd = "La fecha hasta es obligatoria.";
    if (form.scheduledStart && form.scheduledEnd && new Date(form.scheduledEnd) <= new Date(form.scheduledStart)) {
      next.scheduledEnd = "Debe ser posterior a la fecha desde.";
    }
    if (warranty) {
      if (form.warrantyReason.trim().length < 5) next.warrantyReason="Explique el motivo con al menos cinco caracteres.";
      if (warrantyOrigin === "Registered" && !original) next.warrantyOriginOrderId="Seleccione una O/S completada.";
      if (warrantyOrigin === "External" && form.warrantyReference.trim().length < 5) next.warrantyReference="Identifique el servicio anterior (mínimo cinco caracteres).";
      if (form.equipmentIds.some((id)=>!equipment.some((row)=>row.id===id) || !form.warrantyWorkByEquipment[id]?.trim())) next.equipmentIds="Describa el trabajo de garantía para cada equipo permitido.";
    }
    const laborError = validateLaborDistribution(form.laborAllocations, labor.loading ? null : labor.budget, {warranty});
    if (laborError) next.laborAllocations = laborError;
    const activeIds = new Set(catalogs.technicians.filter((item) => item.status === "Activo").map((item) => item.id));
    if (form.laborAllocations.some((row) => !activeIds.has(row.technicalId))) next.laborAllocations = "Seleccione técnicos activos antes de guardar.";
    if (!next.scheduledStart && !next.scheduledEnd && form.scheduledStart && form.scheduledEnd) {
      const start = operationInputToInstant(form.scheduledStart), end = operationInputToInstant(form.scheduledEnd);
      if (form.laborAllocations.some((row) => unavailabilityOverlapping(catalogs.technicians.find((t) => t.id === row.technicalId)?.unavailability, start, end).length)) next.laborAllocations = "Hay técnicos no disponibles en estas fechas. Cambie la programación o sustituya al técnico.";
    }
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!readyToSubmit) {
      setErrors({ warrantyOriginOrderId: originError || catalogsError || "Espere a que se carguen los datos de la orden." });
      return;
    }
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    await onSubmit({
      orderKind,
      ...(warranty ? {warrantyOrigin,warrantyOriginOrderId:warrantyOrigin === "Registered" ? Number(warrantyOriginOrderId) : null,warrantyReference:warrantyOrigin === "External" ? form.warrantyReference.trim() : null,warrantyServiceDate:warrantyOrigin === "External" ? form.warrantyServiceDate || null : null,warrantyReason:form.warrantyReason.trim(),warrantyWorks:form.equipmentIds.map((id)=>({equipmentId:id,description:form.warrantyWorkByEquipment[id]?.trim() || ""}))} : {}),
      // Omitir referencias de garantía también al editar: no borrar valores históricos ocultos.
      ...(!warranty ? { purchaseOrderNumber: form.purchaseOrderNumber.trim() || null, quotationNumber: form.quotationNumber.trim() || null } : {}),
      parId: Number(fromCompletedOrder ? original.par_id : form.parId),
      equipmentIds: form.equipmentIds,
      workType: form.workType,
      serviceType: form.serviceType,
      callDate: operationInputToInstant(form.callDate),
      scheduledStart: operationInputToInstant(form.scheduledStart),
      scheduledEnd: operationInputToInstant(form.scheduledEnd),
      laborAllocations: form.laborAllocations.map((row) => ({ ...row, hours: Number(row.hours) })),
      leadTechnicianId: allocationTechnicianIds(form.laborAllocations, form.leadTechnicianId)[0],
      priority: form.priority,
    });
    labor.reload();
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-blue-500" />Referencias de la orden</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className={warranty ? "grid gap-4" : "grid gap-4 sm:grid-cols-3"}>
            <Input label="Número de orden" value={form.orderCode} readOnly className="bg-surface-2" placeholder="Se asignará automáticamente al guardar" />
            {!warranty && <>
              <Input label="Orden de compra" value={form.purchaseOrderNumber} onChange={setField("purchaseOrderNumber")} />
              <Input label="Cotización" value={form.quotationNumber} onChange={setField("quotationNumber")} />
            </>}
          </div>
          {fromCompletedOrder || lockPar ? <ReadonlyField label="Clasificación">{orderKindLabel(orderKind)}</ReadonlyField> : <Select label="Clasificación" value={form.orderKind} options={ORDER_KINDS} disabled={lockPar || !canManageWarranty(user?.role)} onChange={(event)=>setForm((current)=>({...current,orderKind:event.target.value,parId:"",equipmentIds:[],laborAllocations:[],leadTechnicianId:"",warrantyWorkByEquipment:{}}))} />}
          {warranty && <div className="space-y-3 rounded-xl border border-border p-4">
            <p className="text-sm text-muted">Las horas de garantía se registran por separado y no consumen el presupuesto comercial del PAR.</p>
            {!fromCompletedOrder && <Select label="Origen de la garantía" value={form.warrantyOrigin} disabled={lockPar} options={[{value:"Registered",label:"O/S completada del portal"},{value:"External",label:"Servicio anterior sin O/S registrada"}]} onChange={(event)=>setForm((current)=>({...current,warrantyOrigin:event.target.value,parId:"",equipmentIds:[],laborAllocations:[],leadTechnicianId:"",warrantyOriginOrderId:"",warrantyWorkByEquipment:{}}))} />}
            {warrantyOrigin === "Registered" ? fromCompletedOrder || lockPar ? <div className="space-y-2">
              <ReadonlyField label="O/S original">{original ? <Link href={`/ordenes/${original.id}`} className="font-semibold text-blue-600 underline">{original.order_code}</Link> : catalogsLoading ? "Cargando O/S original…" : "O/S original no disponible"}</ReadonlyField>
              {(originError || errors.warrantyOriginOrderId) && <p role="alert" className="text-sm text-red-500">{originError || errors.warrantyOriginOrderId}</p>}
            </div> : <Select label="O/S original" value={form.warrantyOriginOrderId} disabled={lockPar || catalogsLoading} error={errors.warrantyOriginOrderId} options={[{value:"",label:"Seleccione una O/S completada"},...catalogs.originals.map((row)=>({value:String(row.id),label:row.order_code+" · "+row.client_name}))]} onChange={(event)=>{const source=catalogs.originals.find((row)=>String(row.id)===event.target.value);setForm((current)=>({...current,warrantyOriginOrderId:event.target.value,parId:String(source?.par_id || ""),equipmentIds:[],laborAllocations:[],leadTechnicianId:"",warrantyWorkByEquipment:{}}));}} /> : <>
              <Textarea label="Referencia del servicio anterior" maxLength={500} value={form.warrantyReference} readOnly={lockPar} error={errors.warrantyReference} onChange={setField("warrantyReference")} />
              <Input label="Fecha del servicio anterior (si se conoce)" type="date" value={form.warrantyServiceDate} readOnly={lockPar} onChange={setField("warrantyServiceDate")} />
              <p className="text-sm">Si no existe su PAR, <Link className="text-blue-600 underline" href="/par/new">cree un PAR de referencia para garantía</Link> y apruébelo antes de continuar.</p>
            </>}
            <Textarea label="Motivo de la garantía" maxLength={2000} value={form.warrantyReason} error={errors.warrantyReason} onChange={setField("warrantyReason")} />
          </div>}
          <ParSearch
            pars={availablePars}
            value={form.parId}
            selectedFallback={context}
            disabled={lockPar || catalogsLoading || (warranty && warrantyOrigin === "Registered")}
            loading={catalogsLoading}
            onChange={setParId}
            error={errors.parId}
          />
          {catalogsError && <div className="flex items-center gap-3" role="alert"><p className="text-xs font-medium text-red-500">{catalogsError}</p><Button type="button" variant="ghost" size="sm" onClick={loadCatalogs}>Reintentar</Button></div>}
        </CardContent>
      </Card>

      {selectedPar && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" />Información heredada del PAR</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-border bg-surface-2 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <p><span className="text-muted">Cliente:</span> {selectedPar.client_name || context?.client_name || "—"}</p>
              <p><span className="text-muted">Planta:</span> {selectedPar.plant_name || context?.plant_name || "—"}</p>
              <p><span className="text-muted">Contacto:</span> {selectedPar.contact_name || context?.contact_name || "—"}</p>
              <p><span className="text-muted">Equipos seleccionados:</span> {selectedEquipment.length}</p>
            </div>
            <fieldset className="space-y-2" disabled={loading || catalogsLoading}><legend className="mb-2 text-sm font-semibold">Equipos que atenderá esta O/S *</legend>
              {equipment.filter((item) => item.id).map((item) => <label key={item.id} className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" className="mt-1" checked={form.equipmentIds.includes(item.id)} onChange={(event) => setForm((current) => ({ ...current, equipmentIds: event.target.checked ? [...current.equipmentIds, item.id] : current.equipmentIds.filter((id) => id !== item.id) }))} /><span>{item.name} · {item.serial || "Sin serial"}<span className="block text-xs text-muted">{item.description}</span></span></label>)}
              {errors.equipmentIds && <p role="alert" className="text-sm text-red-500">{errors.equipmentIds}</p>}
            </fieldset>
            {warranty ? selectedEquipment.map((item)=><Textarea key={item.id} label={"Trabajo de garantía · "+item.name+" · "+(item.serial || "Sin serial")} maxLength={10000} value={form.warrantyWorkByEquipment[item.id] || ""} onChange={(event)=>setForm((current)=>({...current,warrantyWorkByEquipment:{...current.warrantyWorkByEquipment,[item.id]:event.target.value}}))} />) : <Textarea label="Descripción del trabajo (equipos seleccionados del PAR)" value={description} readOnly className="bg-surface-2" />}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-blue-500" />Programación del servicio (hora de Venezuela)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Tipo de trabajo *" value={form.workType} onChange={setField("workType")} options={WORK_TYPES} />
            <Select label="Tipo de servicio *" value={form.serviceType} onChange={setField("serviceType")} options={SERVICE_TYPES} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Fecha de llamada *" type="datetime-local" value={form.callDate} error={errors.callDate} onChange={setField("callDate")} />
            <Input label="Programación desde *" type="datetime-local" value={form.scheduledStart} error={errors.scheduledStart} onChange={setField("scheduledStart")} />
            <Input label="Programación hasta *" type="datetime-local" value={form.scheduledEnd} error={errors.scheduledEnd} onChange={setField("scheduledEnd")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadonlyField label="Horas estimadas de mano de obra">{sumLaborHours(form.laborAllocations).toFixed(2)} h</ReadonlyField>
            <Select label="Prioridad" value={form.priority} onChange={setField("priority")} options={PRIORITIES.map((value) => ({ value, label: value }))} />
          </div>
        </CardContent>
      </Card>

      <LaborAllocationEditor warranty={warranty} budget={labor.budget} loading={labor.loading} loadError={labor.error} reload={labor.reload}
        scheduledStart={form.scheduledStart ? operationInputToInstant(form.scheduledStart) : undefined} scheduledEnd={form.scheduledEnd ? operationInputToInstant(form.scheduledEnd) : undefined}
        technicians={catalogs.technicians} value={form.laborAllocations} disabled={loading || catalogsLoading || labor.loading}
        onChange={(laborAllocations) => { setForm((current) => ({ ...current, laborAllocations })); setErrors((current) => ({ ...current, laborAllocations: "" })); }}
        leadTechnicianId={form.leadTechnicianId} onLeadChange={(leadTechnicianId) => setForm((current) => ({ ...current, leadTechnicianId }))}
        error={errors.laborAllocations} />

      <Card>
        <CardHeader><CardTitle>Auditoría de la orden</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ReadonlyField label="Creado por">{context?.prepared_by_name || user?.name || "Usuario de la sesión"}</ReadonlyField>
          <ReadonlyField label="Aprobado por">{context?.approved_by_name || "Pendiente de aprobación"}</ReadonlyField>
        </CardContent>
      </Card>
    </form>
  );
}
