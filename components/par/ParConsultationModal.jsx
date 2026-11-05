"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { ParPreview } from "@/components/par/ParPreview";
import { getParById } from "@/lib/api";

function ParConsultationDetails({ parId }) {
  const [result, setResult] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;

    // La fila del listado no contiene equipos ni ítems: consultar el documento completo.
    getParById(parId).then(
      (par) => {
        if (!ignore) setResult({ status: "ready", par });
      },
      (error) => {
        if (ignore) return;
        const status = error.response?.status;
        const message = status === 404
          ? "Este PAR ya no está disponible."
          : status === 403
            ? "No tienes permiso para consultar este PAR."
            : "No se pudo cargar el PAR. Intenta nuevamente.";
        setResult({ status: "error", message });
      },
    );

    // Cerrar o elegir otro PAR invalida la respuesta pendiente de esta consulta.
    return () => { ignore = true; };
  }, [parId, attempt]);

  if (result.status === "loading") {
    return (
      <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted">
        <Spinner />
        Cargando el PAR completo…
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-4 text-center">
        <p role="alert" className="text-sm text-foreground">{result.message}</p>
        <Button
          variant="secondary"
          onClick={() => {
            setResult({ status: "loading" });
            setAttempt((current) => current + 1);
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return <ParPreview par={result.par} className="max-w-none" />;
}

/** Consulta compartida desde tabla y tarjetas; cada apertura carga el detalle vigente. */
export function ParConsultationModal({ par, onClose, onManage }) {
  return (
    <Modal
      open={Boolean(par)}
      onClose={onClose}
      size="3xl"
      scrollable
      title={par ? `Consulta del PAR ${par.par_number}` : "Consulta del PAR"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button disabled={!par} onClick={() => onManage(par)}>Gestionar PAR</Button>
        </>
      }
    >
      {par && <ParConsultationDetails key={par.id} parId={par.id} />}
    </Modal>
  );
}
