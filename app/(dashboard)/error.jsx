"use client";

import { useEffect } from "react";
import { RefreshCw, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/** Manejo de errores a nivel de ruta con opción de reintento */
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Error en módulo administrativo:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={ServerCrash}
        title="Algo salió mal"
        description="Ocurrió un error inesperado al cargar este módulo. Inténtalo de nuevo."
        action={
          <Button icon={RefreshCw} onClick={reset}>
            Reintentar
          </Button>
        }
      />
    </div>
  );
}
