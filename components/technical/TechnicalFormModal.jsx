"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, IdCard, Mail, Phone, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { getAssignableTechnicianUsers } from "@/lib/api";

const EMPTY = { cedula: "", name: "", phone: "", email: "", status: "Activo", userId: "" };

function initialValues(technician) {
  if (!technician) return EMPTY;
  return {
    cedula: technician.cedula ?? "",
    name: technician.name ?? "",
    phone: technician.phone ?? "",
    email: technician.email ?? "",
    status: technician.status ?? "Activo",
    userId: technician.user_id ?? "",
  };
}

function validate(values) {
  const errors = {};
  if (!values.cedula.trim()) errors.cedula = "La cédula es obligatoria.";
  if (!values.name.trim()) errors.name = "El nombre es obligatorio.";
  return errors;
}

export function TechnicalFormModal({ open, onClose, onSubmit, technician, loading: saving }) {
  const isEdit = Boolean(technician);
  const [values, setValues] = useState(() => initialValues(technician));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    getAssignableTechnicianUsers(technician?.id)
      .then((rows) => { if (active) setUsers(rows); })
      .catch(() => { if (active) setUsers([]); });
    return () => { active = false; };
  }, [open, technician?.id]);

  const set = (field) => (event) => {
    setValues((c) => ({ ...c, [field]: event.target.value }));
    setErrors((c) => ({ ...c, [field]: undefined }));
    setServerError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errs = validate(values);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      await onSubmit({
        cedula: values.cedula.trim(),
        name: values.name.trim(),
        phone: values.phone.trim() || null,
        email: values.email.trim() || null,
        status: isEdit ? values.status : undefined,
        userId: values.userId || null,
      });
    } catch (err) {
      setServerError(err.message || "Error al guardar el técnico.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar técnico" : "Nuevo técnico"}
      description={
        isEdit
          ? "Modifica los datos del técnico."
          : "Completa los campos para registrar un nuevo técnico."
      }
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isEdit ? "Guardar cambios" : "Crear técnico"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {serverError}
          </motion.div>
        )}

        <Input
          label="Cédula"
          icon={IdCard}
          placeholder="1020304050"
          value={values.cedula}
          error={errors.cedula}
          onChange={set("cedula")}
          disabled={isEdit}
        />

        <Input
          label="Nombre completo"
          icon={User}
          placeholder="Nombre y apellido"
          value={values.name}
          error={errors.name}
          onChange={set("name")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Teléfono"
            icon={Phone}
            placeholder="+57 310 224 8890"
            value={values.phone}
            onChange={set("phone")}
          />
          <Input
            label="Correo electrónico"
            icon={Mail}
            placeholder="correo@empresa.com"
            type="email"
            value={values.email}
            onChange={set("email")}
          />
        </div>

        <Select
          label="Usuario asociado"
          value={values.userId}
          onChange={set("userId")}
        >
          <option value="">Sin usuario asociado</option>
          {users.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.login})
            </option>
          ))}
        </Select>
        <p className="-mt-2 text-xs text-muted">
          Esta relación permite que el usuario Técnico consulte únicamente su propia agenda.
        </p>

        {isEdit && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Estado</label>
            <select
              value={values.status}
              onChange={set("status")}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none dark:hover:border-slate-600"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        )}
      </form>
    </Modal>
  );
}
