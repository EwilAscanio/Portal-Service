"use client";

import { useState } from "react";
import {
  Ban,
  CheckCircle2,
  Download,
  Eye,
  Plus,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { notify } from "@/lib/toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { DataTable } from "@/components/tables/DataTable";
import { RowActions } from "@/components/tables/RowActions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FadeInUp } from "@/components/ui/animated";
import { ORDER_STATUS_VARIANTS, PRIORITY_VARIANTS } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import { downloadCsv } from "@/utils/csv";

const ORDER_PRIORITIES = ["Alta", "Media", "Baja"];
const ORDER_STATUSES = ["Pendiente", "En Proceso", "Completada", "Cancelada"];
const ORDER_TYPES = ["Mantenimiento", "Instalación", "Reparación", "Visita"];

const EMPTY_FORM = {
  client: "",
  equipment: "",
  type: ORDER_TYPES[0],
  technician: "",
  priority: "Media",
};

export default function OrdenesPage() {
  usePageTitle("Órdenes de Servicio");


  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const setField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const visibleRows =
    statusFilter === "Todos"
      ? rows
      : rows.filter((row) => row.status === statusFilter);

  const handleCreate = (event) => {
    event.preventDefault();
    if (!form.equipment.trim()) {
      notify.warning("Campos incompletos", {
        description: "Indica el equipo asociado a la orden.",
      });
      return;
    }
    const newOrder = {
      id: `OS-${2416 + rows.length}`,
      ...form,
      status: "Pendiente",
      scheduled: new Date(Date.now() + 2 * 86400000).toISOString(),
      amount: 1500,
    };
    setRows((current) => [newOrder, ...current]);
    setModalOpen(false);
    setForm(EMPTY_FORM);
    notify.success("Orden creada", {
      description: `${newOrder.id} quedó pendiente de asignación (simulado).`,
    });
  };

  const updateStatus = (row, status, message) => {
    setRows((current) =>
      current.map((item) => (item.id === row.id ? { ...item, status } : item))
    );
    notify.success(message, { description: `${row.id} · ${row.client}` });
  };

  const handleExport = () => {
    downloadCsv(
      "ordenes-maquitech.csv",
      rows.map((row) => ({
        ID: row.id,
        Cliente: row.client,
        Equipo: row.equipment,
        Tipo: row.type,
        Técnico: row.technician,
        Prioridad: row.priority,
        Estado: row.status,
        Monto: row.amount,
      }))
    );
    notify.success("Exportación completa", {
      description: "Se descargó el archivo CSV de órdenes.",
    });
  };

  const rowActions = [
    {
      label: "Ver detalle",
      icon: Eye,
      onClick: (row) =>
        notify.info("Vista de demostración", {
          description: `El detalle de ${row.id} estará disponible próximamente.`,
        }),
    },
    {
      label: "Marcar completada",
      icon: CheckCircle2,
      onClick: (row) => updateStatus(row, "Completada", "Orden completada"),
    },
    {
      label: "Cancelar orden",
      icon: Ban,
      danger: true,
      onClick: (row) => updateStatus(row, "Cancelada", "Orden cancelada"),
    },
  ];

  const columns = [
    {
      key: "id",
      header: "Orden",
      render: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.id}</p>
          <p className="text-xs text-muted">{row.type}</p>
        </div>
      ),
    },
    {
      key: "client",
      header: "Cliente",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{row.client}</p>
          <p className="truncate text-xs text-muted">{row.equipment}</p>
        </div>
      ),
    },
    { key: "technician", header: "Técnico", className: "hidden lg:table-cell" },
    {
      key: "priority",
      header: "Prioridad",
      className: "hidden md:table-cell",
      render: (row) => (
        <StatusBadge status={row.priority} variants={PRIORITY_VARIANTS} dot={false} />
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (row) => (
        <StatusBadge status={row.status} variants={ORDER_STATUS_VARIANTS} />
      ),
    },
    {
      key: "scheduled",
      header: "Programada",
      className: "hidden xl:table-cell",
      render: (row) => formatDate(row.scheduled),
    },
    {
      key: "amount",
      header: "Monto",
      className: "text-right",
      render: (row) => (
        <span className="font-semibold text-foreground">
          {formatCurrency(row.amount)}
        </span>
      ),
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
        title="Órdenes de Servicio"
        description="Seguimiento y gestión de las órdenes de mantenimiento."
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={handleExport}>
              Exportar
            </Button>
            <Button icon={Plus} onClick={() => setModalOpen(true)}>
              Nueva Orden
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
              searchPlaceholder="Buscar por orden, cliente, técnico…"
              toolbar={
                <Select
                  aria-label="Filtrar por estado"
                  className="w-52"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  options={["Todos", ...ORDER_STATUSES].map((status) => ({
                    value: status,
                    label: status === "Todos" ? "Todos los estados" : status,
                  }))}
                />
              }
              emptyTitle="No se encontraron órdenes"
              emptyDescription="Ajusta la búsqueda o crea una nueva orden."
            />
          </CardContent>
        </Card>
      </FadeInUp>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva orden de servicio"
        description="Crea una orden y asígnala a un técnico (demostración)."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="order-form" icon={Plus}>
              Crear Orden
            </Button>
          </>
        }
      >
        <form id="order-form" onSubmit={handleCreate} className="space-y-4" noValidate>
          <Input
            label="Cliente"
            placeholder="Nombre del cliente"
            value={form.client}
            onChange={setField("client")}
          />
          <Input
            label="Equipo"
            placeholder="Compresor de Aire GA55"
            value={form.equipment}
            onChange={setField("equipment")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Tipo de servicio"
              options={ORDER_TYPES.map((type) => ({ value: type, label: type }))}
              value={form.type}
              onChange={setField("type")}
            />
            <Select
              label="Prioridad"
              options={ORDER_PRIORITIES.map((priority) => ({
                value: priority,
                label: priority,
              }))}
              value={form.priority}
              onChange={setField("priority")}
            />
          </div>
          <Input
            label="Técnico asignado"
            placeholder="Nombre del técnico"
            value={form.technician}
            onChange={setField("technician")}
          />
        </form>
      </Modal>
    </div>
  );
}
