"use client";

import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ReadonlyField } from "@/components/ui/ReadonlyField";
import { formatDate } from "@/lib/format";
import { ROLE_BADGE } from "@/lib/status";

/** Modal de consulta del usuario en solo lectura. */
export function UserViewModal({ user, onClose, onEdit }) {
  return (
    <Modal
      open={Boolean(user)}
      onClose={onClose}
      size="xl"
      title={user?.name}
      description={user?.email || user?.login}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button icon={Pencil} onClick={() => onEdit(user)}>
            Editar
          </Button>
        </>
      }
    >
      {user && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReadonlyField label="Login">
            <span className="font-medium text-sm text-foreground">
              {user.login}
            </span>
          </ReadonlyField>

          <ReadonlyField label="Nombre">{user.name}</ReadonlyField>

          <ReadonlyField label="Rol">
            <Badge variant={ROLE_BADGE[user.role] || "neutral"} dot>
              {user.role}
            </Badge>
          </ReadonlyField>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Estado
            </label>
            <div className="flex h-11 items-center">
              <Badge variant={user.status === "Activo" ? "success" : "danger"} dot>
                {user.status}
              </Badge>
            </div>
          </div>

          <ReadonlyField label="Correo electrónico" className="lg:col-span-2">
            <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
              {user.email || "—"}
            </span>
          </ReadonlyField>

          <ReadonlyField label="Último acceso" className="lg:col-span-2">
            {user.last_access_at ? formatDate(user.last_access_at) : "—"}
          </ReadonlyField>
        </div>
      )}
    </Modal>
  );
}
