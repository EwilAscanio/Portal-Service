"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { notify } from "@/lib/toast";
import { createOrder } from "@/lib/api";
import { getPublicError } from "@/lib/ui-errors";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { FadeInUp } from "@/components/ui/animated";
import { ServiceOrderForm, buildServiceOrderDefaults } from "@/components/service-orders/ServiceOrderForm";

export default function NuevaOrdenPage() {
  usePageTitle("Nueva Orden de Servicio");
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
        title="Nueva Orden de Servicio"
        description="Crea la orden desde un PAR aprobado y completa su programación operativa."
        actions={<Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/ordenes")}>Volver</Button>}
      />
      <FadeInUp>
        <ServiceOrderForm formId="service-order-create-form" defaultValues={buildServiceOrderDefaults()} loading={saving} onSubmit={handleCreate} />
      </FadeInUp>
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => router.push("/ordenes")} disabled={saving}>Cancelar</Button>
        <Button type="submit" form="service-order-create-form" icon={Plus} loading={saving}>Crear Orden</Button>
      </div>
    </div>
  );
}
