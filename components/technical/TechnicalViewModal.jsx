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
      size="xl"
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReadonlyField label="Cédula">
            <span className="font-medium text-sm  text-foreground">
              {tech.cedula}
            </span>
          </ReadonlyField>

          <ReadonlyField label="Nombre completo">{tech.name}</ReadonlyField>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Estado
            </label>
            <div className="flex h-11 items-center">
              <Badge variant={tech.status === "Activo" ? "success" : "danger"} dot>
                {tech.status}
              </Badge>
            </div>
          </div>

          <ReadonlyField label="Teléfono">{tech.phone || "—"}</ReadonlyField>
          <ReadonlyField label="Correo electrónico" className="lg:col-span-2">
            <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
              {tech.email || "—"}
            </span>
          </ReadonlyField>
          <ReadonlyField label="Usuario asociado" className="lg:col-span-2">
            {tech.user_name ? `${tech.user_name} (${tech.user_login})` : "Sin asociación"}
          </ReadonlyField>
          <ReadonlyField label="Registro" className="lg:col-span-2">
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
