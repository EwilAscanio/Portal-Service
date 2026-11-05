"use client";

import { Briefcase, Building2, Factory, Mail, Pencil, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ReadonlyField } from "@/components/ui/ReadonlyField";

function ContactField({ label, icon, value }) {
  return (
    <ReadonlyField
      label={label}
      icon={icon}
      className="min-w-0 [&>div]:h-auto [&>div]:min-h-11 [&>div]:py-2.5"
    >
      <span className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">
        {value || "—"}
      </span>
    </ReadonlyField>
  );
}

/** Tabla y cards consultan el mismo registro del listado, sin duplicar campos ni consultas. */
export function ContactConsultationModal({ contact, onClose, onEdit }) {
  return (
    <Modal
      open={Boolean(contact)}
      onClose={onClose}
      size="xl"
      scrollable
      title="Detalle de contacto"
      description="Información del contacto."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} autoFocus>Cerrar</Button>
          <Button icon={Pencil} onClick={() => onEdit(contact)}>Editar</Button>
        </>
      }
    >
      {contact && (
        <div className="space-y-4">
          <ContactField label="Nombre y Apellido" icon={User} value={contact.name} />
          <ContactField label="Cliente" icon={Building2} value={contact.client_name} />
          <ContactField label="Planta" icon={Factory} value={contact.plant_name} />
          <div className="grid gap-4 sm:grid-cols-2">
            <ContactField label="Departamento" icon={Briefcase} value={contact.department} />
            <ContactField label="Teléfono" icon={Phone} value={contact.phone} />
          </div>
          <ContactField label="Email" icon={Mail} value={contact.email} />
        </div>
      )}
    </Modal>
  );
}
