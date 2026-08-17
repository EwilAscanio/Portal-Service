"use client";

import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ReadonlyField } from "@/components/ui/ReadonlyField";
import { formatDate } from "@/lib/format";

/** Modal de consulta del técnico (estructura espejo de TechnicalFormModal). */
export function TechnicalViewModal({ tech, onClose, onEdit }) {
  return (
    <Modal
      open={Boolean(tech)}
      onClose={onClose}
      size="md"
      title={tech?.name}
      description={tech ? `Cédula ${tech.cedula}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button icon={Pencil} onClick={() => onEdit(tech)}>
            Editar
          </Button>
        </>
      }
    >
      {tech && (
        <div className="space-y-4">
          <ReadonlyField label="Cédula">
            <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
              {tech.cedula}
            </span>
          </ReadonlyField>

          <ReadonlyField label="Nombre completo">{tech.name}</ReadonlyField>

          <div className="grid gap-4 sm:grid-cols-2">
            <ReadonlyField label="Teléfono">{tech.phone || "—"}</ReadonlyField>
            <ReadonlyField label="Correo electrónico">
              {tech.email || "—"}
            </ReadonlyField>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Estado
            </label>
            <Badge variant={tech.status === "Activo" ? "success" : "danger"} dot>
              {tech.status}
            </Badge>
          </div>

          <ReadonlyField label="Registro">
            {tech.created_at
              ? formatDate(tech.created_at, {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </ReadonlyField>
        </div>
      )}
    </Modal>
  );
}
