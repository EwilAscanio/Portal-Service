"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Barcode, Boxes, Cog, Download, Gauge, Handshake, Pencil, Plus, Tag, Trash2, Zap } from "lucide-react";
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
  getPlants,
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
import { downloadCsv } from "@/utils/csv";
import { cn } from "@/utils/cn";
import { EQUIPMENT_STATUS_VARIANTS } from "@/lib/status";
import { getPublicError } from "@/lib/ui-errors";
import { equipmentFormSchema } from "@/lib/validators";

const EQUIPMENT_STATUSES = Object.keys(EQUIPMENT_STATUS_VARIANTS);

function validateEquipment(values) {
  const parsed = equipmentFormSchema.safeParse(values);
  if (parsed.success) return {};
  const issues = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (key && !issues[key]) issues[key] = issue.message;
  }
  return issues;
}

const EMPTY_FORM = {
  name: "",
  brand: "",
  model: "",
  serial: "",
  clientId: "",
  plantId: "",
  consortium: "",
  hp: "",
  pressure: "",
  status: "Operativo",
};

export default function EquiposPage() {
  usePageTitle("Equipos");

  const [equipment, setEquipment] = useState([]);
  const [clients, setClients] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [clientFilter, setClientFilter] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
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
      const [equipmentData, clientsData, plantsData] = await Promise.all([
        getEquipment(),
        getClients(),
        getPlants(),
      ]);
      setEquipment(equipmentData);
      setClients(clientsData);
      setPlants(plantsData);
    } catch (err) {
      notify.error("Error al cargar equipos.", { description: getPublicError(err, "No se pudieron cargar los equipos.") });
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
        ["name", "brand", "model", "serial", "client_name", "plant_name", "location", "consortium", "hp", "pressure"].some(
          (key) => String(row[key] ?? "").toLowerCase().includes(q)
        )
      );
    }
    return rows;
  }, [equipment, statusFilter, clientFilter, debouncedQuery]);

  const availablePlants = useMemo(
    () => plants.filter((plant) => plant.client_id === form.clientId),
    [plants, form.clientId]
  );

  const setField = (field) => (event) => {
    setForm((c) => ({ ...c, [field]: event.target.value }));
    setFieldErrors((c) => ({ ...c, [field]: undefined }));
    setServerError("");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
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
      plantId: row.plant_id ?? "",
      consortium: row.consortium ?? "",
      hp: row.hp ?? "",
      pressure: row.pressure ?? "",
      status: row.status ?? "Operativo",
    });
    setFieldErrors({});
    setServerError("");
    setModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errs = validateEquipment(form);
    if (Object.keys(errs).length) { setFieldErrors(errs); setServerError(""); return; }
    setFieldErrors({});

    setSaving(true);
    setServerError("");
    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        serial: form.serial.trim(),
        clientId: form.clientId,
        plantId: form.plantId,
        consortium: form.consortium.trim() || null,
        hp: form.hp === "" ? null : Number(form.hp),
        pressure: form.pressure === "" ? null : Number(form.pressure),
        status: form.status,
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
      setServerError(getPublicError(err, "No se pudo guardar el equipo."));
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
      notify.error(getPublicError(err, "No se pudo completar la operación con el equipo."));
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
        Planta: row.plant_name || "",
        Consorcio: row.consortium || "",
        HP: row.hp ?? "",
        "Presion (PSI)": row.pressure ?? "",
        Ubicacion: row.location || "",
        Estado: row.status,
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
      key: "plant_name",
      header: "Planta",
      className: "hidden xl:table-cell",
      render: (row) => <span className="text-sm">{row.plant_name || "—"}</span>,
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
      key: "specifications",
      header: "Especificaciones",
      className: "hidden xl:table-cell",
      render: (row) => <span className="text-sm">{[row.consortium, row.hp != null ? `${row.hp} HP` : null, row.pressure != null ? `${row.pressure} PSI` : null].filter(Boolean).join(" · ") || "—"}</span>,
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
              <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
                {["Todos", ...EQUIPMENT_STATUSES].map((status) => {
                  const active = statusFilter === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors",
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
        size="2xl"
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Tipo de Equipo *"
              icon={Cog}
              placeholder="Compresor de aire"
              autoFocus
              value={form.name}
              error={fieldErrors.name}
              onChange={setField("name")}
              containerClassName="sm:col-span-2 lg:col-span-2"
            />
            <Input
              label="Marca *"
              icon={Tag}
              placeholder="Atlas Copco"
              value={form.brand}
              error={fieldErrors.brand}
              onChange={setField("brand")}
            />
            <Input
              label="Modelo *"
              icon={Boxes}
              placeholder="GA55"
              value={form.model}
              error={fieldErrors.model}
              onChange={setField("model")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <ClientSearch
                clients={editing ? clients : clients.filter((client) => client.status === "1")}
                value={form.clientId}
                onChange={(clientId) => {
                  setForm((c) => ({ ...c, clientId, plantId: "" }));
                  setFieldErrors((c) => ({ ...c, clientId: undefined, plantId: undefined }));
                  setServerError("");
                }}
                error={fieldErrors.clientId}
              />
            </div>
            <div>
              <Select
                label="Planta *"
                value={form.plantId}
                disabled={!form.clientId}
                error={fieldErrors.plantId}
                onChange={setField("plantId")}
                options={[
                  { value: "", label: form.clientId ? "Seleccione una planta" : "Seleccione primero un cliente" },
                  ...availablePlants.map((plant) => ({ value: plant.id, label: plant.name })),
                ]}
              />
            </div>
            <Input
              label="Serial *"
              icon={Barcode}
              placeholder="APX-2024-001"
              value={form.serial}
              error={fieldErrors.serial}
              onChange={setField("serial")}
              disabled={Boolean(editing)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Estado"
              value={form.status}
              onChange={setField("status")}
              options={EQUIPMENT_STATUSES.map((status) => ({
                value: status,
                label: status,
              }))}
            />
            <Input label="Consorcio" icon={Handshake} value={form.consortium} onChange={setField("consortium")} />
            <Input label="HP" icon={Zap} type="number" min="0" step="0.01" value={form.hp} error={fieldErrors.hp} onChange={setField("hp")} />
            <Input label="Presión (PSI)" icon={Gauge} type="number" min="0" step="0.01" value={form.pressure} error={fieldErrors.pressure} onChange={setField("pressure")} />
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
