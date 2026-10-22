"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Clock3, FileText } from "lucide-react";
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

const PRIORITIES = ["Alta", "Media", "Baja"];
const WORK_TYPES = [{ value: "Internal", label: "Interna" }, { value: "External", label: "Externa" }];
const SERVICE_TYPES = [
  { value: "Inspection", label: "Revisión" },
  { value: "Maintenance", label: "Mantenimiento" },
  { value: "Emergency", label: "Emergencia" },
  { value: "Other", label: "Otro" },
];

function localDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function buildServiceOrderDefaults(order) {
  if (!order) {
    const now = localDateTime();
    return {
      orderCode: "", purchaseOrderNumber: "", quotationNumber: "", parId: "",
      workType: "External", serviceType: "Maintenance", callDate: now,
      scheduledStart: now, scheduledEnd: now,
      laborAllocations: [], leadTechnicianId: "", equipmentIds: [], priority: "Media",
    };
  }
  return {
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

export function ServiceOrderForm({ formId, defaultValues, context, lockPar = false, loading, onSubmit }) {
  const { user } = useAuth();
  const [form, setForm] = useState(defaultValues);
  const [catalogs, setCatalogs] = useState({ pars: [], technicians: [] });
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
        pars: data.pars || [],
        technicians: data.technicians || [],
      });
    } catch (error) {
      setCatalogsError(getPublicError(error, "No se pudieron cargar los catálogos."));
    } finally {
      setCatalogsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del formulario
    loadCatalogs();
  }, [loadCatalogs]);

  const selectedPar = useMemo(
    () => catalogs.pars.find((item) => String(item.id) === String(form.parId)) || context || null,
    [catalogs.pars, form.parId, context]
  );
  const equipment = selectedPar?.equipment || context?.equipment || [];
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
    if (!form.parId) next.parId = "Seleccione un PAR aprobado.";
    if (!form.equipmentIds.length) next.equipmentIds = "Seleccione al menos un equipo que atenderá esta O/S.";
    if (!form.callDate) next.callDate = "La fecha de llamada es obligatoria.";
    if (!form.scheduledStart) next.scheduledStart = "La fecha desde es obligatoria.";
    if (!form.scheduledEnd) next.scheduledEnd = "La fecha hasta es obligatoria.";
    if (form.scheduledStart && form.scheduledEnd && new Date(form.scheduledEnd) <= new Date(form.scheduledStart)) {
      next.scheduledEnd = "Debe ser posterior a la fecha desde.";
    }
    const laborError = validateLaborDistribution(form.laborAllocations, labor.loading ? null : labor.budget);
    if (laborError) next.laborAllocations = laborError;
    const activeIds = new Set(catalogs.technicians.filter((item) => item.status === "Activo").map((item) => item.id));
    if (form.laborAllocations.some((row) => !activeIds.has(row.technicalId))) next.laborAllocations = "Seleccione técnicos activos antes de guardar.";
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    await onSubmit({
      purchaseOrderNumber: form.purchaseOrderNumber.trim() || null,
      quotationNumber: form.quotationNumber.trim() || null,
      parId: Number(form.parId),
      equipmentIds: form.equipmentIds,
      workType: form.workType,
      serviceType: form.serviceType,
      callDate: new Date(form.callDate).toISOString(),
      scheduledStart: new Date(form.scheduledStart).toISOString(),
      scheduledEnd: new Date(form.scheduledEnd).toISOString(),
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
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Número de orden" value={form.orderCode} readOnly className="bg-surface-2" placeholder="Se asignará automáticamente al guardar" />
            <Input label="Orden de compra" value={form.purchaseOrderNumber} onChange={setField("purchaseOrderNumber")} />
            <Input label="Cotización" value={form.quotationNumber} onChange={setField("quotationNumber")} />
          </div>
          <ParSearch
            pars={catalogs.pars}
            value={form.parId}
            selectedFallback={context}
            disabled={lockPar || catalogsLoading}
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
            <Textarea label="Descripción del trabajo (equipos seleccionados del PAR)" value={description} readOnly className="bg-surface-2" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-blue-500" />Programación del servicio</CardTitle></CardHeader>
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

      <LaborAllocationEditor budget={labor.budget} loading={labor.loading} loadError={labor.error} reload={labor.reload}
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
