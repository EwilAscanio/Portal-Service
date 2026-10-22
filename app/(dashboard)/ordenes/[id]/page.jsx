"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, FileText, Pencil, Play, Printer, XCircle } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { notify } from "@/lib/toast";
import { deleteOrder, getOrderById, updateOrder } from "@/lib/api";
import { getPublicError } from "@/lib/ui-errors";
import { canApproveServiceOrder, canEditServiceOrder } from "@/lib/service-order-policy";
import { canCloseServiceOrder } from "@/lib/service-order-closure";
import { ServiceOrderClosure } from "@/components/service-orders/ServiceOrderClosure";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Modal";
import { LegacyLaborReview } from "@/components/service-orders/LegacyLaborReview";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FadeInUp } from "@/components/ui/animated";
import { ORDER_STATUS_VARIANTS } from "@/lib/status";
import { ServiceOrderForm, buildServiceOrderDefaults } from "@/components/service-orders/ServiceOrderForm";
import { ServiceOrderPreview } from "@/components/service-orders/ServiceOrderPreview";
import { ServiceOrderPrintSheet } from "@/components/service-orders/ServiceOrderPrintSheet";

export default function OrdenDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("preview");
  const [confirmAction, setConfirmAction] = useState(null);
  const [scheduleConflicts, setScheduleConflicts] = useState([]);

  usePageTitle(order ? `Orden ${order.order_code}` : "Orden de Servicio");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOrderById(id);
      setOrder(data);
    } catch (error) {
      if (error.response?.status === 404) setNotFound(true);
      else notify.error("No se pudo cargar la orden", { description: getPublicError(error) });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del documento
    load();
  }, [load]);

  const handleSave = async (payload) => {
    try {
      setSaving(true);
      const updated = await updateOrder(id, payload);
      setOrder(updated);
      setView("preview");
      notify.success("Orden actualizada.");
    } catch (error) {
      notify.error("No se pudo guardar la orden", { description: getPublicError(error) });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status, confirmScheduleConflict = false) => {
    try {
      setSaving(true);
      const updated = status === "Cancelada"
        ? (await deleteOrder(id), await getOrderById(id))
        : await updateOrder(id, { status, confirmScheduleConflict });
      setOrder(updated);
      setConfirmAction(null);
      setScheduleConflicts([]);
      notify.success(`Orden marcada como ${status.toLowerCase()}.`);
    } catch (error) {
      if (error.response?.data?.code === "ORDER_SCHEDULE_CONFLICT") {
        setConfirmAction(null);
        setScheduleConflicts(error.response.data.conflicts || []);
        return;
      }
      notify.error("No se pudo cambiar el estado", { description: getPublicError(error) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Card><CardContent className="py-10 text-center text-sm text-muted">Cargando…</CardContent></Card>;
  if (notFound || !order) return <Card><CardContent className="space-y-4 py-10 text-center"><p>La orden solicitada no existe.</p><Button icon={ArrowLeft} onClick={() => router.push("/ordenes")}>Volver a Órdenes</Button></CardContent></Card>;

  const editable = canEditServiceOrder(order.status) && !order.labor_review_required;
  const canApprove = order.status === "Pendiente" && !order.labor_review_required && canApproveServiceOrder(user?.role);
  const canReview = order.labor_review_required && order.status !== "Cancelada" && canApproveServiceOrder(user?.role);
  const canCancel = !["Completada", "Cancelada"].includes(order.status);

  return (
    <div className="space-y-6">
      <PageHeader
        className="print:hidden"
        title={<span className="flex flex-wrap items-center gap-3">{order.order_code}<StatusBadge status={order.status} variants={ORDER_STATUS_VARIANTS} /></span>}
        description={`PAR ${order.par_number} · ${order.client_name}`}
        actions={<>
          {canReview && view !== "review" && <Button variant="secondary" onClick={() => setView("review")}>Revisar horas anteriores</Button>}
          {editable && <Button variant="secondary" icon={view === "preview" ? Pencil : Eye} onClick={() => setView(view === "preview" ? "edit" : "preview")}>{view === "preview" ? "Editar" : "Vista previa"}</Button>}
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/ordenes")}>Volver</Button>
          {view === "preview" && <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Imprimir / Guardar PDF</Button>}
          {view === "edit" && <Button type="submit" form="service-order-edit-form" icon={FileText} loading={saving}>Guardar cambios</Button>}
          {canApprove && <Button variant="success" icon={CheckCircle2} onClick={() => setConfirmAction("Aprobada")}>Aprobar</Button>}
          {order.status === "Aprobada" && !order.labor_review_required && <Button icon={Play} onClick={() => setConfirmAction("En Proceso")}>Iniciar servicio</Button>}
          {["En Proceso", "Completada", "Cancelada"].includes(order.status) && <Button variant={order.status === "En Proceso" && canCloseServiceOrder(user?.role) ? "success" : "secondary"} icon={FileText} onClick={() => setView(view === "closure" ? "preview" : "closure")}>{view === "closure" ? "Vista previa" : order.status === "En Proceso" && canCloseServiceOrder(user?.role) ? "Cerrar O/S" : "Expediente de cierre"}</Button>}
          {canCancel && <Button variant="danger" icon={XCircle} onClick={() => setConfirmAction("Cancelada")}>Cancelar</Button>}
        </>}
      />

      {order.labor_review_required && order.status !== "Cancelada" && view === "preview" && <Card className="print:hidden"><CardContent><p className="text-sm">Esta orden conserva horas anteriores pendientes de distribuir. Un Superadministrador, Administrador o Supervisor debe revisarlas para continuar.</p></CardContent></Card>}

      <FadeInUp className="print:hidden">
        {view === "closure" ? <ServiceOrderClosure key={id} orderId={id} role={user?.role} onOrderChanged={async () => setOrder(await getOrderById(id))} onCompleted={async () => { setView("preview"); await load(); }} /> : view === "review" ? <LegacyLaborReview order={order} saving={saving} onSave={handleSave} onClose={() => setView("preview")} /> : view === "edit" ? <ServiceOrderForm formId="service-order-edit-form" defaultValues={buildServiceOrderDefaults(order)} context={order} lockPar loading={saving} onSubmit={handleSave} /> : <ServiceOrderPreview order={order} />}
      </FadeInUp>
      {view === "preview" && <ServiceOrderPrintSheet order={order} />}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => changeStatus(confirmAction)}
        loading={saving}
        danger={confirmAction === "Cancelada"}
        title={confirmAction === "Aprobada" ? "¿Aprobar esta orden?" : confirmAction === "En Proceso" ? "¿Iniciar este servicio?" : "¿Cancelar esta orden?"}
        description={confirmAction === "Aprobada" ? "La orden quedará aprobada y se registrarán el usuario y la fecha de aprobación." : confirmAction === "En Proceso" ? "La orden pasará a En Proceso. Se habilitará el registro de documentos y horas reales para su cierre." : "La orden quedará cancelada y no podrá continuar su flujo."}
        confirmLabel={confirmAction === "Aprobada" ? "Aprobar" : confirmAction === "En Proceso" ? "Iniciar servicio" : "Cancelar orden"}
      />
      <ConfirmDialog
        open={scheduleConflicts.length > 0}
        onClose={() => setScheduleConflicts([])}
        onConfirm={() => changeStatus("Aprobada", true)}
        loading={saving}
        danger={false}
        title="Conflicto de horario detectado"
        description={`La agenda ya contiene ${scheduleConflicts.map((item) => `${item.order_code} para ${item.technician_name}`).join(", ")}. Si continúas, ambas órdenes permanecerán programadas en el mismo horario.`}
        confirmLabel="Aprobar con conflicto"
      />
    </div>
  );
}
