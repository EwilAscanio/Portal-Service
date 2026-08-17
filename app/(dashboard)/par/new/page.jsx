"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { notify } from "@/lib/toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { FadeInUp } from "@/components/ui/animated";
import { ParForm } from "@/components/par/ParForm";
import { createPar } from "@/lib/api";

function buildEmptyForm() {
  return {
    clientId: "",
    atencion: "",
    fechaEmision: new Date().toISOString().split("T")[0],
    exchangeRate: "0",
    observations: "",
    elaboradoPor: "",
    equipment: [
      {
        itemNo: 1,
        isMain: true,
        equipmentId: "",
        tipo: "",
        marca: "",
        serial: "",
        modelo: "",
        observaciones: "",
      },
    ],
    items: [],
  };
}

export default function NewParPage() {
  usePageTitle("Nuevo PAR");
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleCreate = async (payload) => {
    try {
      setCreating(true);
      const created = await createPar(payload);
      notify.success("PAR creado", {
        description: `Número ${created.par_number} registrado como creado.`,
      });
      router.push(`/par/${created.id}`);
    } catch (err) {
      notify.error("Error al crear PAR", {
        description: err.response?.data?.error || err.message,
      });
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo PAR"
        description="Registra una nueva planilla de atención de requisiciones."
        actions={
          <>
            <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/par")}>
              Volver
            </Button>
            <Button type="submit" form="par-create-form" icon={Plus} loading={creating}>
              Crear PAR
            </Button>
          </>
        }
      />

      <FadeInUp>
        <ParForm
          formId="par-create-form"
          defaultValues={buildEmptyForm()}
          onSubmit={handleCreate}
          loading={creating}
          submitLabel="Crear PAR"
        />
      </FadeInUp>
    </div>
  );
}
