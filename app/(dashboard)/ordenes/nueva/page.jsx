"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { notify } from "@/lib/toast";
import { createOrder } from "@/lib/api";
import { getSchedulingError as getPublicError } from "@/lib/ui-errors";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { FadeInUp } from "@/components/ui/animated";
import { ServiceOrderForm, buildServiceOrderDefaults } from "@/components/service-orders/ServiceOrderForm";

function NuevaOrdenContent() {
  const search = useSearchParams();
  const initialOriginId = search.get("garantiaDe");
  const [orderKind, setOrderKind] = useState(initialOriginId !== null ? "Garantia" : "Normal");
  const [readyToCreate, setReadyToCreate] = useState(false);
  const warranty = initialOriginId !== null || orderKind === "Garantia";
  usePageTitle(warranty ? "Nueva O/S de garantía" : "Nueva Orden de Servicio");
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleCreate = async (payload) => {
    try {
      setSaving(true);
      const created = await createOrder(payload);
      notify.success("Orden de servicio creada", { description: `${created.order_code} quedó pendiente de aprobación.` });
      router.push(`/ordenes/${created.id}`);
    } catch (error) {
      notify.error("No se pudo crear la orden", { description: getPublicError(error) });
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={warranty ? "Nueva O/S de garantía" : "Nueva Orden de Servicio"}
        description={warranty ? "Registra la atención de garantía, su motivo y su programación operativa." : "Crea la orden desde un PAR aprobado y completa su programación operativa."}
        actions={<Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/ordenes")}>Volver</Button>}
      />
      <FadeInUp>
        <ServiceOrderForm key={initialOriginId ?? "new"} initialOriginId={initialOriginId} onReadyChange={setReadyToCreate} onKindChange={setOrderKind} formId="service-order-create-form" defaultValues={buildServiceOrderDefaults()} loading={saving} onSubmit={handleCreate} />
      </FadeInUp>
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => router.push("/ordenes")} disabled={saving}>Cancelar</Button>
        <Button type="submit" form="service-order-create-form" icon={Plus} loading={saving} disabled={!readyToCreate}>{warranty ? "Crear O/S de garantía" : "Crear Orden"}</Button>
      </div>
    </div>
  );
}

export default function NuevaOrdenPage(){return <Suspense fallback={<p>Cargando formulario…</p>}><NuevaOrdenContent /></Suspense>;}
