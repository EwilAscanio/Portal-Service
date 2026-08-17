"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HardHat, Pencil, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { notify } from "@/lib/toast";
import {
  getTechnicians,
  createTechnician,
  updateTechnician,
  updateTechnicianStatus,
} from "@/lib/api";
import { DataTable } from "@/components/tables/DataTable";
import { TechnicalCardGrid } from "@/components/technical/TechnicalCardGrid";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { FadeInUp } from "@/components/ui/animated";
import { PageHeader } from "@/components/layout/PageHeader";
import { TechnicalFormModal } from "@/components/technical/TechnicalFormModal";
import { TechnicalViewModal } from "@/components/technical/TechnicalViewModal";
import { cn } from "@/utils/cn";

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

export default function TecnicosPage() {
  usePageTitle("Técnicos");

  const { user } = useAuth();

  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewTech, setViewTech] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, technician: null });

  const [view, setView, viewHydrated] = useLocalStorage(
    "mq-tecnicos-view",
    "table"
  );
  const effectiveView = viewHydrated ? view : "table";
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return technicians;
    return technicians.filter((row) =>
      ["cedula", "name", "phone"].some((key) =>
        String(row[key] ?? "").toLowerCase().includes(q)
      )
    );
  }, [technicians, debouncedQuery]);

  const loadData = useCallback(async () => {
    try {
      setTechnicians(await getTechnicians());
    } catch (err) {
      notify.error("Error al cargar técnicos.", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = () => { setEditing(null); setFormOpen(true); };
  const handleEdit = (tech) => { setEditing(tech); setFormOpen(true); };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await updateTechnician(editing.id, payload);
      } else {
        await createTechnician(payload);
      }
      notify.success(editing ? "Técnico actualizado." : "Técnico creado.");
      setFormOpen(false);
      loadData();
    } catch (err) {
      notify.error("Error al guardar.", { description: err.response?.data?.error || err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (tech) => {
    setConfirm({ open: true, technician: tech });
  };

  const confirmToggle = async () => {
    const { technician } = confirm;
    const newStatus = technician.status === "Activo" ? "Inactivo" : "Activo";
    try {
      await updateTechnicianStatus(technician.id, newStatus);
      notify.success(`Técnico ${newStatus === "Activo" ? "activado" : "desactivado"}.`);
      setConfirm({ open: false, technician: null });
      loadData();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const columns = [
    {
      key: "cedula",
      header: "Cédula",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
          {row.cedula}
        </span>
      ),
    },
    {
      key: "name",
      header: "Nombre",
      sortable: true,
      render: (row) => <p className="font-medium text-foreground">{row.name}</p>,
    },
    {
      key: "phone",
      header: "Teléfono",
      sortable: false,
      render: (row) => <span className="text-sm">{row.phone || "—"}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      render: (row) => <span className="text-sm">{row.email || "—"}</span>,
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
      key: "created_at",
      header: "Registro",
      sortable: true,
      accessor: (row) => (row.created_at ? new Date(row.created_at).getTime() : 0),
      render: (row) => (
        <span className="text-xs text-muted">{formatDateTime(row.created_at)}</span>
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
            onClick={(event) => {
              event.stopPropagation();
              handleEdit(row);
            }}
            aria-label={`Editar ${row.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleToggleStatus(row);
            }}
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
        title="Técnicos"
        description="Registro y gestión del equipo técnico."
        actions={
          <Button icon={Plus} onClick={handleCreate}>
            Nuevo técnico
          </Button>
        }
      />

      <FadeInUp>
        <Card>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Buscar por cédula, nombre o teléfono…"
                className="sm:max-w-xs"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="info" className="text-xs">
                  <HardHat className="h-3.5 w-3.5" />
                  {filtered.length} técnicos
                </Badge>
                <ViewToggle view={effectiveView} onChange={setView} />
              </div>
            </div>

            {effectiveView === "table" ? (
              <DataTable
                columns={columns}
                data={filtered}
                loading={loading}
                searchable={false}
                pageSize={10}
                emptyTitle="No se encontraron técnicos"
                emptyDescription="Registra el primer técnico para comenzar."
                onRowClick={setViewTech}
              />
            ) : (
              <TechnicalCardGrid
                technicians={filtered}
                loading={loading}
                onView={setViewTech}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
              />
            )}
          </CardContent>
        </Card>
      </FadeInUp>

      <TechnicalFormModal
        key={editing?.id ?? "create"}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        technician={editing}
        loading={saving}
      />

      <TechnicalViewModal
        tech={viewTech}
        onClose={() => setViewTech(null)}
        onEdit={(tech) => {
          setViewTech(null);
          handleEdit(tech);
        }}
      />

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, technician: null })}
        onConfirm={confirmToggle}
        title={
          confirm.technician?.status === "Activo"
            ? "¿Desactivar técnico?"
            : "¿Activar técnico?"
        }
        description={
          confirm.technician?.status === "Activo"
            ? `El técnico ${confirm.technician?.name} no podrá ser asignado mientras esté desactivado.`
            : `El técnico ${confirm.technician?.name} volverá a estar disponible.`
        }
        confirmLabel={confirm.technician?.status === "Activo" ? "Desactivar" : "Activar"}
      />
    </div>
  );
}
