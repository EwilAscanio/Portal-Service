"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { notify } from "@/lib/toast";
import {
  getUsers,
  getRoles,
  createUser,
  updateUser,
  updateUserStatus,
} from "@/lib/api";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Modal";
import { FadeInUp } from "@/components/ui/animated";
import { PageHeader } from "@/components/layout/PageHeader";
import { UserFormModal } from "@/components/users/UserFormModal";
import { cn } from "@/utils/cn";

const ROLE_BADGE = {
  Administrador: "danger",
  Supervisor: "info",
  Coordinador: "purple",
  Técnico: "warning",
  Usuario: "neutral",
};

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UsuariosPage() {
  usePageTitle("Usuarios");


  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, user: null });

  const loadData = useCallback(async () => {
    try {
      const [usersData, rolesData] = await Promise.all([
        getUsers(),
        getRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      notify.error("Error al cargar usuarios.", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = () => { setEditing(null); setFormOpen(true); };
  const handleEdit = (user) => { setEditing(user); setFormOpen(true); };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await updateUser(editing.id, payload);
      } else {
        await createUser(payload);
      }
      notify.success(editing ? "Usuario actualizado." : "Usuario creado.");
      setFormOpen(false);
      loadData();
    } catch (err) {
      notify.error("Error al guardar.", { description: err.response?.data?.error || err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (user) => {
    setConfirm({ open: true, user });
  };

  const confirmToggle = async () => {
    const { user } = confirm;
    const newStatus = user.status === "Activo" ? "Inactivo" : "Activo";
    try {
      await updateUserStatus(user.id, newStatus);
      notify.success(`Usuario ${newStatus === "Activo" ? "activado" : "desactivado"}.`);
      setConfirm({ open: false, user: null });
      loadData();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Nombre",
      sortable: true,
      render: (row) => <span className="font-medium text-foreground">{row.name}</span>,
    },
    {
      key: "login",
      header: "Login",
      sortable: true,
    },
    {
      key: "email",
      header: "Correo",
      sortable: true,
    },
    {
      key: "role",
      header: "Rol",
      sortable: true,
      render: (row) => (
        <Badge variant={ROLE_BADGE[row.role] || "neutral"} dot>
          {row.role}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Estado",
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === "Activo" ? "success" : "danger"} dot>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "last_access_at",
      header: "Último acceso",
      sortable: true,
      accessor: (row) => (row.last_access_at ? new Date(row.last_access_at).getTime() : 0),
      render: (row) => (
        <span className="text-xs text-muted">{formatDateTime(row.last_access_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      sortable: false,
      className: "w-20",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => handleEdit(row)}
            aria-label={`Editar ${row.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(row)}
            aria-label={row.status === "Activo" ? `Desactivar ${row.name}` : `Activar ${row.name}`}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              row.status === "Activo"
                ? "text-muted hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                : "text-muted hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
            )}
          >
            {row.status === "Activo" ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Control de acceso y roles del panel administrativo."
        actions={
          <Button icon={Plus} onClick={handleCreate}>
            Nuevo usuario
          </Button>
        }
      />

      <FadeInUp>
        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={users}
              loading={loading}
              searchPlaceholder="Buscar por nombre, usuario o correo…"
              searchKeys={["name", "login", "email"]}
              pageSize={10}
              toolbar={
                <div className="flex items-center gap-2">
                  <Badge variant="info" className="text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {users.length} usuarios
                  </Badge>
                </div>
              }
              emptyTitle="No se encontraron usuarios"
              emptyDescription="Crea el primer usuario para comenzar."
            />
          </CardContent>
        </Card>
      </FadeInUp>

      <UserFormModal
        key={editing?.id ?? "create"}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        user={editing}
        roles={roles}
        loading={saving}
      />

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, user: null })}
        onConfirm={confirmToggle}
        title={
          confirm.user?.status === "Activo"
            ? "¿Desactivar usuario?"
            : "¿Activar usuario?"
        }
        description={
          confirm.user?.status === "Activo"
            ? `El usuario ${confirm.user?.name} no podrá iniciar sesión mientras esté desactivado.`
            : `El usuario ${confirm.user?.name} volverá a poder iniciar sesión.`
        }
        confirmLabel={confirm.user?.status === "Activo" ? "Desactivar" : "Activar"}
      />
    </div>
  );
}
