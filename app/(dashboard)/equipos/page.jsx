"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Cog, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { notify } from "@/lib/toast";
import {
  getEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getClients,
} from "@/lib/api";
import { DataTable } from "@/components/tables/DataTable";
import { RowActions } from "@/components/tables/RowActions";
import { EquipmentCardGrid } from "@/components/equipment/EquipmentCardGrid";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { ClientSearch } from "@/components/ui/ClientSearch";
import { FadeInUp } from "@/components/ui/animated";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatDate } from "@/lib/format";
import { downloadCsv } from "@/utils/csv";
import { cn } from "@/utils/cn";
import { EQUIPMENT_STATUS_VARIANTS } from "@/lib/status";

const EQUIPMENT_STATUSES = Object.keys(EQUIPMENT_STATUS_VARIANTS);

function toDateInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function fromDateInputValue(value) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toISOString();
}

const EMPTY_FORM = {
  name: "",
  brand: "",
  model: "",
  serial: "",
  clientId: "",
  location: "",
  status: "Operativo",
  lastMaintenance: "",
  nextMaintenance: "",
};

export default function EquiposPage() {
  usePageTitle("Equipos");

  const [equipment, setEquipment] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [clientFilter, setClientFilter] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, equipment: null });

  const [view, setView, viewHydrated] = useLocalStorage(
    "mq-equipos-view",
    "table"
  );
  const effectiveView = viewHydrated ? view : "table";
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);

  const loadData = useCallback(async () => {
    try {
      const [equipmentData, clientsData] = await Promise.all([
        getEquipment(),
        getClients(),
      ]);
      setEquipment(equipmentData);
      setClients(clientsData);
    } catch (err) {
      notify.error("Error al cargar equipos.", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    let rows = equipment;
    if (statusFilter !== "Todos") {
      rows = rows.filter((row) => row.status === statusFilter);
    }
    if (clientFilter !== "Todos") {
      rows = rows.filter((row) => row.client_id === clientFilter);
    }
    const q = debouncedQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) =>
        ["name", "brand", "model", "serial", "client_name", "location"].some(
          (key) => String(row[key] ?? "").toLowerCase().includes(q)
        )
      );
    }
    return rows;
  }, [equipment, statusFilter, clientFilter, debouncedQuery]);

  const setField = (field) => (event) => {
    setForm((c) => ({ ...c, [field]: event.target.value }));
    setErrors((c) => ({ ...c, [field]: undefined }));
    setServerError("");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setServerError("");
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name ?? "",
      brand: row.brand ?? "",
      model: row.model ?? "",
      serial: row.serial ?? "",
      clientId: row.client_id ?? "",
      location: row.location ?? "",
      status: row.status ?? "Operativo",
      lastMaintenance: toDateInputValue(row.last_maintenance),
      nextMaintenance: toDateInputValue(row.next_maintenance),
    });
    setErrors({});
    setServerError("");
    setModalOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "El nombre del equipo es obligatorio.";
    if (!form.brand.trim()) errs.brand = "La marca es obligatoria.";
    if (!form.model.trim()) errs.model = "El modelo es obligatorio.";
    if (!form.serial.trim()) errs.serial = "El serial es obligatorio.";
    if (!form.clientId) errs.clientId = "Selecciona un cliente.";
    return errs;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setServerError("");
    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        serial: form.serial.trim(),
        clientId: form.clientId,
        location: form.location.trim() || null,
        status: form.status,
        lastMaintenance: fromDateInputValue(form.lastMaintenance),
        nextMaintenance: fromDateInputValue(form.nextMaintenance),
      };
      if (editing) {
        await updateEquipment(editing.id, payload);
      } else {
        await createEquipment(payload);
      }
      notify.success(editing ? "Equipo actualizado." : "Equipo creado.");
      setModalOpen(false);
      loadData();
    } catch (err) {
      setServerError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row) => {
    setConfirm({ open: true, equipment: row });
  };

  const confirmDelete = async () => {
    const { equipment: target } = confirm;
    try {
      await deleteEquipment(target.id);
      notify.success(`${target.name} fue dado de baja.`);
      setConfirm({ open: false, equipment: null });
      loadData();
    } catch (err) {
      notify.error(err.response?.data?.error || err.message);
    }
  };

  const handleExport = () => {
    downloadCsv(
      "equipos-maquitech.csv",
      filtered.map((row) => ({
        ID: row.id,
        Equipo: row.name,
        Marca: row.brand,
        Modelo: row.model,
        Serial: row.serial,
        Cliente: row.client_name || "",
        Ubicacion: row.location || "",
        Estado: row.status,
        "Proximo mantenimiento": row.next_maintenance
          ? formatDate(row.next_maintenance)
          : "",
      }))
    );
    notify.success("Exportacion completa", {
      description: "Se descargo el archivo CSV de equipos.",
    });
  };

  const rowActions = [
    {
      label: "Editar",
      icon: Pencil,
      onClick: openEdit,
    },
    {
      label: "Eliminar",
      icon: Trash2,
      danger: true,
      onClick: handleDelete,
    },
  ];

  const columns = [
    {
      key: "name",
      header: "Equipo",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
            <Cog className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.name}</p>
            <p className="truncate text-xs text-muted">
              {row.brand} · {row.model}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "client_name",
      header: "Cliente",
      sortable: true,
      render: (row) => (
        <span className="text-sm">{row.client_name || "—"}</span>
      ),
    },
    {
      key: "serial",
      header: "Serial",
      sortable: true,
      className: "hidden lg:table-cell",
      render: (row) => (
        <span className="font-mono text-xs text-muted">{row.serial}</span>
      ),
    },
    {
      key: "location",
      header: "Ubicación",
      className: "hidden xl:table-cell",
      render: (row) => <span className="text-sm">{row.location || "—"}</span>,
    },
    {
      key: "status",
      header: "Estado",
      sortable: true,
      render: (row) => (
        <StatusBadge status={row.status} variants={EQUIPMENT_STATUS_VARIANTS} />
      ),
    },
    {
      key: "next_maintenance",
      header: "Próx. mantenimiento",
      className: "hidden md:table-cell",
      sortable: true,
      accessor: (row) => row.next_maintenance ?? "",
      render: (row) =>
        row.next_maintenance ? formatDate(row.next_maintenance) : "—",
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      className: "w-12 text-right",
      render: (row) => <RowActions row={row} actions={rowActions} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipos"
        description="Inventario de equipos instalados en cliente."
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={handleExport}>
              Exportar
            </Button>
            <Button icon={Plus} onClick={openCreate}>
              Nuevo Equipo
            </Button>
          </>
        }
      />

      <FadeInUp>
        <Card>
          <CardContent>
            <div className="mb-4 flex flex-nowrap items-center justify-between gap-3">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Buscar por equipo, marca, serial, cliente…"
                className="w-56 shrink-0"
              />
              <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-surface p-1">
                {["Todos", ...EQUIPMENT_STATUSES].map((status) => {
                  const active = statusFilter === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium transition-colors",
                        active
                          ? "bg-blue-600 text-white"
                          : "text-muted hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      {status === "Todos" ? "Todos" : status}
                    </button>
                  );
                })}
              </div>
              <div className="w-56 shrink-0">
                <ClientSearch
                  clients={clients}
                  value={clientFilter === "Todos" ? "" : clientFilter}
                  onChange={(id) => setClientFilter(id || "Todos")}
                  label=""
                  placeholder="Buscar Cliente…"
                />
              </div>
              <Badge variant="info" className="shrink-0 text-xs">
                {filtered.length} equipos
              </Badge>
              <ViewToggle view={effectiveView} onChange={setView} />
            </div>

            {effectiveView === "table" ? (
              <DataTable
                columns={columns}
                data={filtered}
                loading={loading}
                searchable={false}
                pageSize={10}
                emptyTitle="No se encontraron equipos"
                emptyDescription="Ajusta la búsqueda o cambia el filtro de estado."
              />
            ) : (
              <EquipmentCardGrid
                equipment={filtered}
                loading={loading}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            )}
          </CardContent>
        </Card>
      </FadeInUp>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar equipo" : "Nuevo equipo"}
        description={
          editing
            ? "Modifica los datos del equipo."
            : "Registra maquinaria en el inventario."
        }
        size="xl"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" form="equipment-form" loading={saving}>
              {editing ? "Guardar cambios" : "Registrar"}
            </Button>
          </>
        }
      >
        <form
          id="equipment-form"
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
        >
          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {serverError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nombre del equipo"
              placeholder="Compresor de Aire GA55"
              value={form.name}
              error={errors.name}
              onChange={setField("name")}
            />
            <Input
              label="Marca"
              placeholder="Atlas Copco"
              value={form.brand}
              error={errors.brand}
              onChange={setField("brand")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Modelo"
              placeholder="GA55"
              value={form.model}
              error={errors.model}
              onChange={setField("model")}
            />
            <Input
              label="Serial"
              placeholder="APX-2024-001"
              value={form.serial}
              error={errors.serial}
              onChange={setField("serial")}
              disabled={Boolean(editing)}
            />
          </div>

          <div className="grid gap-4">
            <ClientSearch
              clients={clients}
              value={form.clientId}
              onChange={(clientId) => {
                setForm((c) => ({ ...c, clientId }));
                setErrors((c) => ({ ...c, clientId: undefined }));
                setServerError("");
              }}
              error={errors.clientId}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Ubicación"
              placeholder="Planta principal"
              value={form.location}
              onChange={setField("location")}
            />
            <Select
              label="Estado"
              value={form.status}
              onChange={setField("status")}
              options={EQUIPMENT_STATUSES.map((status) => ({
                value: status,
                label: status,
              }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Último mantenimiento"
              type="date"
              value={form.lastMaintenance}
              onChange={setField("lastMaintenance")}
            />
            <Input
              label="Próximo mantenimiento"
              type="date"
              value={form.nextMaintenance}
              onChange={setField("nextMaintenance")}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, equipment: null })}
        onConfirm={confirmDelete}
        title="Eliminar equipo"
        description={`¿Seguro que deseas dar de baja ${confirm.equipment?.name}? Pasara a estado "Fuera de Servicio".`}
        confirmLabel="Dar de baja"
      />
    </div>
  );
}
