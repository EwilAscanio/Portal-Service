"use client";

import { useState } from "react";
import { Cog, Download, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { notify } from "@/lib/toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { DataTable } from "@/components/tables/DataTable";
import { RowActions } from "@/components/tables/RowActions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FadeInUp } from "@/components/ui/animated";
import { EQUIPMENT_STATUS_VARIANTS } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { downloadCsv } from "@/utils/csv";

const EMPTY_FORM = { name: "", brand: "", client: "" };

export default function EquiposPage() {
  usePageTitle("Equipos");


  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const setField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const visibleRows =
    statusFilter === "Todos"
      ? rows
      : rows.filter((row) => row.status === statusFilter);

  const handleCreate = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.brand.trim()) {
      notify.warning("Campos incompletos", {
        description: "Nombre y marca del equipo son obligatorios.",
      });
      return;
    }
    const newEquipment = {
      id: `EQ-${1043 + rows.length}`,
      ...form,
      model: "—",
      serial: `SIM-${Date.now().toString().slice(-6)}`,
      location: "Planta principal",
      status: "Operativo",
      lastMaintenance: new Date().toISOString(),
      nextMaintenance: new Date(Date.now() + 90 * 86400000).toISOString(),
    };
    setRows((current) => [newEquipment, ...current]);
    setModalOpen(false);
    setForm(EMPTY_FORM);
    notify.success("Equipo registrado", {
      description: `${form.name} quedó operativo en el sistema (simulado).`,
    });
  };

  const handleExport = () => {
    downloadCsv(
      "equipos-maquitech.csv",
      rows.map((row) => ({
        ID: row.id,
        Equipo: row.name,
        Marca: row.brand,
        Cliente: row.client,
        Estado: row.status,
        "Próximo mantenimiento": formatDate(row.nextMaintenance),
      }))
    );
    notify.success("Exportación completa", {
      description: "Se descargó el archivo CSV de equipos.",
    });
  };

  const confirmDelete = () => {
    setRows((current) => current.filter((row) => row.id !== deleteTarget.id));
    notify.success("Equipo eliminado", {
      description: `${deleteTarget.name} fue eliminado del inventario.`,
    });
    setDeleteTarget(null);
  };

  const rowActions = [
    {
      label: "Ver ficha técnica",
      icon: Eye,
      onClick: (row) =>
        notify.info("Vista de demostración", {
          description: `La ficha de ${row.name} estará disponible próximamente.`,
        }),
    },
    {
      label: "Editar",
      icon: Pencil,
      onClick: (row) =>
        notify.info("Edición de demostración", {
          description: `La edición de ${row.name} estará disponible pronto.`,
        }),
    },
    {
      label: "Eliminar",
      icon: Trash2,
      danger: true,
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  const columns = [
    {
      key: "name",
      header: "Equipo",
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
    { key: "client", header: "Cliente", className: "hidden lg:table-cell" },
    { key: "location", header: "Ubicación", className: "hidden xl:table-cell" },
    {
      key: "status",
      header: "Estado",
      render: (row) => (
        <StatusBadge status={row.status} variants={EQUIPMENT_STATUS_VARIANTS} />
      ),
    },
    {
      key: "nextMaintenance",
      header: "Próx. mantenimiento",
      className: "hidden md:table-cell",
      render: (row) => formatDate(row.nextMaintenance),
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
        description="Inventario y estado de la maquinaria gestionada."
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={handleExport}>
              Exportar
            </Button>
            <Button icon={Plus} onClick={() => setModalOpen(true)}>
              Nuevo Equipo
            </Button>
          </>
        }
      />

      <FadeInUp>
        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={visibleRows}
              searchPlaceholder="Buscar por equipo, marca, cliente…"
              toolbar={
                <Select
                  aria-label="Filtrar por estado"
                  className="w-52"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  options={["Todos", ...EQUIPMENT_STATUSES].map((status) => ({
                    value: status,
                    label: status === "Todos" ? "Todos los estados" : status,
                  }))}
                />
              }
              emptyTitle="No se encontraron equipos"
              emptyDescription="Ajusta la búsqueda o cambia el filtro de estado."
            />
          </CardContent>
        </Card>
      </FadeInUp>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo equipo"
        description="Registra maquinaria en el inventario (demostración)."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="equipment-form" icon={Plus}>
              Registrar
            </Button>
          </>
        }
      >
        <form
          id="equipment-form"
          onSubmit={handleCreate}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Nombre del equipo"
            placeholder="Compresor de Aire GA55"
            value={form.name}
            onChange={setField("name")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Marca"
              placeholder="Atlas Copco"
              value={form.brand}
              onChange={setField("brand")}
            />
            <Input
              label="Cliente"
              placeholder="Nombre del cliente"
              value={form.client}
              onChange={setField("client")}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Eliminar equipo"
        description={`¿Seguro que deseas eliminar ${deleteTarget?.name}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
      />
    </div>
  );
}
