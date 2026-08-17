"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Lock, Mail, User, UserCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const EMPTY = { login: "", name: "", email: "", password: "", roleId: "", status: "Activo" };

function initialValues(user) {
  if (!user) return EMPTY;
  return {
    login: user.login ?? "",
    name: user.name ?? "",
    email: user.email ?? "",
    password: "",
    roleId: String(user.role_id ?? ""),
    status: user.status ?? "Activo",
  };
}

function validate(values, isEdit) {
  const errors = {};
  if (!values.login.trim()) errors.login = "El usuario es obligatorio.";
  if (!values.name.trim()) errors.name = "El nombre es obligatorio.";
  if (!values.email.trim()) errors.email = "El correo es obligatorio.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    errors.email = "El correo no es válido.";
  if (!isEdit && !values.password) errors.password = "La contraseña es obligatoria.";
  else if (values.password && values.password.length < 6)
    errors.password = "Mínimo 6 caracteres.";
  if (!values.roleId) errors.roleId = "Selecciona un rol.";
  return errors;
}

/**
 * Modal con formulario para crear o editar un usuario.
 * `user`: null (crear) o objeto de usuario (editar).
 *
 * Key the component with `key={editing?.id ?? "create"}` in the parent
 * so that state resets automatically when switching between create/edit.
 */
export function UserFormModal({ open, onClose, onSubmit, user, roles, loading: saving }) {
  const isEdit = Boolean(user);
  const [values, setValues] = useState(() => initialValues(user));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const set = (field) => (event) => {
    setValues((c) => ({ ...c, [field]: event.target.value }));
    setErrors((c) => ({ ...c, [field]: undefined }));
    setServerError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errs = validate(values, isEdit);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      const payload = {
        login: values.login.trim(),
        name: values.name.trim(),
        email: values.email.trim(),
        roleId: Number(values.roleId),
        status: values.status,
      };
      if (values.password) payload.password = values.password;
      await onSubmit(payload);
    } catch (err) {
      setServerError(err.message || "Error al guardar el usuario.");
    }
  };

  const roleOptions = roles.map((r) => ({ value: String(r.id), label: r.name }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar usuario" : "Nuevo usuario"}
      description={
        isEdit
          ? "Modifica los datos del usuario. Deja la contraseña vacía para conservar la actual."
          : "Completa los campos para crear un nuevo usuario en el sistema."
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isEdit ? "Guardar cambios" : "Crear usuario"}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Usuario"
            icon={User}
            placeholder="tu.usuario"
            autoComplete="username"
            value={values.login}
            error={errors.login}
            onChange={set("login")}
            disabled={isEdit}
          />
          <Input
            label="Nombre completo"
            icon={UserCheck}
            placeholder="Nombre y apellido"
            autoComplete="name"
            value={values.name}
            error={errors.name}
            onChange={set("name")}
          />
        </div>

        <Input
          label="Correo electrónico"
          type="email"
          icon={Mail}
          placeholder="correo@empresa.com"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          onChange={set("email")}
        />

        <Input
          label={isEdit ? "Nueva contraseña (opcional)" : "Contraseña"}
          type={showPassword ? "text" : "password"}
          icon={Lock}
          placeholder={isEdit ? "••••••••" : "Mínimo 6 caracteres"}
          autoComplete="new-password"
          value={values.password}
          error={errors.password}
          onChange={set("password")}
          hint={isEdit ? "Dejar vacío para conservar la contraseña actual." : undefined}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((c) => !c)}
              aria-label={showPassword ? "Ocultar" : "Mostrar"}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Rol"
            options={[{ value: "", label: "Seleccionar rol…" }, ...roleOptions]}
            value={values.roleId}
            onChange={set("roleId")}
          />
          {isEdit && (
            <Select
              label="Estado"
              options={[
                { value: "Activo", label: "Activo" },
                { value: "Inactivo", label: "Inactivo" },
              ]}
              value={values.status}
              onChange={set("status")}
            />
          )}
        </div>
        {errors.roleId && (
          <p className="-mt-2 text-xs font-medium text-red-500">{errors.roleId}</p>
        )}
      </form>
    </Modal>
  );
}
