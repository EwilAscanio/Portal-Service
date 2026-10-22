"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileText,
  Pencil,
  Printer,
  Trash2,
  XCircle,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { notify } from "@/lib/toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/Modal";
import { FadeInUp } from "@/components/ui/animated";
import { PAR_STATUS_VARIANTS } from "@/lib/status";
import { getParEditError } from "@/lib/par-policy";
import { ParForm } from "@/components/par/ParForm";
import { ParPreview } from "@/components/par/ParPreview";
import { ParPrintSheet } from "@/components/par/ParPrintSheet";
import { getParById, updatePar, updateParStatus, deletePar } from "@/lib/api";

function toFormDefaults(par) {
  return {
    clientId: par.client_id || "",
    plantId: par.plant_id || "",
    contactId: par.contact_id || "",
    fechaEmision: par.fecha_emision
      ? String(par.fecha_emision).slice(0, 10)
      : new Date().toISOString().split("T")[0],
    exchangeRate: par.exchange_rate?.toString() ?? "0",
    observations: par.observations || "",
    elaboradoPor: par.elaborado_por || "",
    equipment: (par.equipment ?? []).map((eq) => ({
      itemNo: eq.item_no,
      isMain: eq.is_main,
      equipmentId: eq.equipment_id || "",
      tipo: eq.tipo || "",
      marca: eq.marca || "",
      serial: eq.serial || "",
      modelo: eq.modelo || "",
      observaciones: eq.observaciones || "",
    })),
    items: (par.items ?? []).map((item) => ({
      itemNo: item.item_no,
      sourceItemId: item.id,
      requiresTechnician: item.requires_technician,
      productId: item.product_id || "",
      descripcion: item.descripcion || "",
      qty: item.qty?.toString() ?? "",
      categoria: item.categoria || "",
      ccn: item.ccn || "",
      usList: item.us_list || "",
      multiplicador: item.multiplicador?.toString() ?? "1",
      valorUnitUsd: item.valor_unit_usd?.toString() ?? "",
      valorPercent: item.valor_percent?.toString() ?? "",
    })),
  };
}

export default function ParDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [par, setPar] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("preview");
  const [toDelete, setToDelete] = useState(false);
  const [toReject, setToReject] = useState(false);

  usePageTitle(par ? `PAR-${par.par_number}` : "PAR");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getParById(id);
      setPar(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        notify.error("Error al cargar el PAR", {
          description: err.response?.data?.error || err.message,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
  useEffect(() => { load(); }, [load]);

  const handleSave = async (payload) => {
    if (!canEditItems) return;
    try {
      setSaving(true);
      const updated = await updatePar(id, { items: payload.items });
      setPar(updated);
      setView("preview");
      notify.success("Ítems actualizados", {
        description: `Los ítems de ${updated.par_number} fueron guardados.`,
      });
    } catch (err) {
      notify.error("Error al guardar", {
        description: err.response?.data?.error || err.message,
      });
      if (err.response?.status === 403) {
        setView("preview");
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTransition = async (status) => {
    try {
      const updated = await updateParStatus(id, status);
      setPar(updated);
      setToReject(false);
      notify.success(
        status === "Aprobado" ? "PAR aprobado" : "PAR rechazado",
        { description: `${par.par_number} pasó a ${status}.` }
      );
    } catch (err) {
      notify.error("Error al cambiar el estado", {
        description: err.response?.data?.error || err.message,
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deletePar(id);
      notify.success("PAR eliminado", {
        description: `${par.par_number} fue eliminado.`,
      });
      router.push("/par");
    } catch (err) {
      notify.error("Error al eliminar", {
        description: err.response?.data?.error || err.message,
      });
      setToDelete(false);
    }
  };

  if (loading || authLoading) {
    return <Card><CardContent className="py-10 text-center text-sm text-muted">Cargando…</CardContent></Card>;
  }

  if (notFound || !par) {
    return (
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <p className="text-foreground">El PAR solicitado no existe o fue eliminado.</p>
          <Button icon={ArrowLeft} onClick={() => router.push("/par")}>
            Volver a PAR
          </Button>
        </CardContent>
      </Card>
    );
  }

  const status = par.display_status ?? par.status;
  const editError = getParEditError(par.status, {
    role: user?.role,
    hasActiveOrders: Number(par.total_orders ?? 0) > 0,
  });
  const canEditItems = Boolean(user) && !editError;
  const editingItems = canEditItems && view === "items";
  const canReject = ["Creado", "Aprobado"].includes(status);

  return (
    <div className="space-y-6">
      <PageHeader
        className="print:hidden"
        title={
          <span className="flex flex-wrap items-center gap-3">
            PAR-{par.par_number}
            <StatusBadge status={status} variants={PAR_STATUS_VARIANTS} />
          </span>
        }
        description={par.client_name ? `Cliente: ${par.client_name}` : undefined}
        actions={
          <>
            {canEditItems && (
              <Button
                variant="secondary"
                icon={editingItems ? Eye : Pencil}
                onClick={() => setView(editingItems ? "preview" : "items")}
              >
                {editingItems ? "Vista previa" : "Editar ítems"}
              </Button>
            )}
            <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/par")}>
              Volver
            </Button>
            {!editingItems && (
              <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
                Imprimir / Guardar PDF
              </Button>
            )}
            {editingItems && (
              <Button
                type="submit"
                form="par-items-form"
                icon={FileText}
                loading={saving}
              >
                Guardar ítems
              </Button>
            )}
            {status === "Creado" && (
              <Button
                variant="success"
                icon={CheckCircle2}
                onClick={() => handleTransition("Aprobado")}
              >
                Aprobar
              </Button>
            )}
            {canReject && (
              <Button variant="danger" icon={XCircle} onClick={() => setToReject(true)}>
                Rechazar
              </Button>
            )}
            {status === "Creado" && (
              <Button variant="danger" icon={Trash2} onClick={() => setToDelete(true)}>
                Eliminar
              </Button>
            )}
          </>
        }
      />

      {editError && par.status === "Aprobado" && (
        <p className="print:hidden text-sm text-muted" role="status">{editError.message}</p>
      )}

      <FadeInUp className="print:hidden">
        {editingItems ? (
          <ParForm
            formId="par-items-form"
            variant="items"
            defaultValues={toFormDefaults(par)}
            onSubmit={handleSave}
            loading={saving}
            submitLabel="Guardar ítems"
          />
        ) : (
          <ParPreview par={par} />
        )}
      </FadeInUp>

      {!editingItems && <ParPrintSheet par={par} />}

      <ConfirmDialog
        open={toReject}
        onClose={() => setToReject(false)}
        onConfirm={() => handleTransition("Rechazado")}
        title="¿Rechazar este PAR?"
        description={`El PAR ${par.par_number} quedará en estado Rechazado y no podrá vincularse a órdenes de servicio.`}
        confirmLabel="Rechazar"
      />

      <ConfirmDialog
        open={toDelete}
        onClose={() => setToDelete(false)}
        onConfirm={handleDelete}
        title="¿Eliminar este PAR?"
        description={`El PAR ${par.par_number} se eliminará junto con sus equipos e ítems. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
      />
    </div>
  );
}
