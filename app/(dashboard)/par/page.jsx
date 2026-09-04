"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, LayoutTemplate, Plus, Trash2, XCircle } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { notify } from "@/lib/toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { DataTable } from "@/components/tables/DataTable";
import { ParCardGrid } from "@/components/par/ParCardGrid";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { ReadonlyField } from "@/components/ui/ReadonlyField";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { FadeInUp } from "@/components/ui/animated";
import { PAR_STATUS_VARIANTS } from "@/lib/status";
import { formatCurrency, formatVes, formatDate } from "@/lib/format";
import { getParList, deletePar, updateParStatus } from "@/lib/api";

const PAR_STATUSES = [
  "Todos",
  "Creado",
  "Aprobado",
  "En Servicio",
  "Finalizado",
  "Rechazado",
];

export default function ParPage() {
  usePageTitle("Par");
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [viewPar, setViewPar] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);

  const [view, setView, viewHydrated] = useLocalStorage(
    "mq-par-view",
    "table"
  );
  const effectiveView = viewHydrated ? view : "table";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getParList();
      setRows(data);
    } catch (err) {
      notify.error("Error al cargar PARs", {
        description: err.response?.data?.error || err.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
  useEffect(() => { load(); }, [load]);

  const effectiveStatus = (row) => row.display_status ?? row.status;

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      ["par_number", "client_name", "client_code"].some((key) =>
        String(row[key] ?? "").toLowerCase().includes(q)
      )
    );
  }, [rows, debouncedQuery]);

  const visibleRows =
    statusFilter === "Todos"
      ? filtered
      : filtered.filter((row) => effectiveStatus(row) === statusFilter);

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      setDeleting(true);
      await deletePar(toDelete.id);
      setRows((current) => current.filter((r) => r.id !== toDelete.id));
      notify.success("PAR eliminado", {
        description: `${toDelete.par_number} fue eliminado.`,
      });
    } catch (err) {
      notify.error("Error al eliminar", {
        description: err.response?.data?.error || err.message,
      });
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const handleTransition = async (row, status) => {
    try {
      const updated = await updateParStatus(row.id, status);
      setRows((current) =>
        current.map((r) => (r.id === row.id ? { ...r, ...updated } : r))
      );
      notify.success(
        status === "Aprobado" ? "PAR aprobado" : "PAR rechazado",
        { description: `${row.par_number} pasó a ${status}.` }
      );
    } catch (err) {
      notify.error("Error al cambiar el estado", {
        description: err.response?.data?.error || err.message,
      });
    }
  };

  const columns = [
    {
      key: "par_number",
      header: "Número",
      render: (row) => (
        <p className="font-semibold text-foreground">{row.par_number}</p>
      ),
    },
    {
      key: "created_at",
      header: "Fecha de creación",
      className: "hidden md:table-cell",
      render: (row) => (
        <span className="whitespace-nowrap text-muted">{formatDate(row.created_at)}</span>
      ),
    },
    {
      key: "client",
      header: "Cliente",
      render: (row) => (
        <p className="truncate font-medium text-foreground">{row.client_name}</p>
      ),
    },
    {
      key: "client_code",
      header: "Código",
      render: (row) => (
        <p className="whitespace-nowrap font-medium text-muted">{row.client_code || "—"}</p>
      ),
    },
    {
      key: "main_equipment",
      header: "Equipo principal",
      className: "hidden lg:table-cell max-w-56",
      render: (row) => (
        <p className="truncate font-medium text-foreground">{row.main_equipment || "—"}</p>
      ),
    },
    {
      key: "total_usd",
      header: "Total $",
      className: "text-right",
      render: (row) => (
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          {formatCurrency(row.total_usd)}
        </span>
      ),
    },
    {
      key: "total_bs",
      header: "Total Bs",
      className: "text-right hidden md:table-cell",
      render: (row) => (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {formatVes(row.total_bs)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (row) => (
        <StatusBadge
          status={effectiveStatus(row)}
          variants={PAR_STATUS_VARIANTS}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      className: "w-12 text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={Eye}
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/par/${row.id}`);
            }}
            title="Ver / editar"
          />
          {effectiveStatus(row) === "Creado" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                icon={CheckCircle2}
                onClick={(event) => {
                  event.stopPropagation();
                  handleTransition(row, "Aprobado");
                }}
                title="Aprobar"
              />
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={(event) => {
                  event.stopPropagation();
                  setToDelete(row);
                }}
                title="Eliminar"
              />
            </>
          )}
          {["Creado", "Aprobado"].includes(effectiveStatus(row)) && (
            <Button
              variant="ghost"
              size="sm"
              icon={XCircle}
              onClick={(event) => {
                event.stopPropagation();
                handleTransition(row, "Rechazado");
              }}
              title="Rechazar"
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planilla de Atención de Requisiciones"
        description="Gestiona las requisiciones de servicio y materiales."
        actions={
          <>
            <Button
              variant="secondary"
              icon={LayoutTemplate}
              onClick={() => router.push("/par/plantillas")}
            >
              Plantillas
            </Button>
            <Button icon={Plus} onClick={() => router.push("/par/new")}>
              Crear PAR
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
                placeholder="Buscar por número, cliente o código…"
                className="sm:max-w-xs"
              />
              <div className="flex flex-nowrap items-center gap-3">
                <Select
                  aria-label="Filtrar por estado"
                  className="w-52"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  options={PAR_STATUSES.map((status) => ({
                    value: status,
                    label: status === "Todos" ? "Todos los estados" : status,
                  }))}
                />
                <Badge variant="info">{visibleRows.length} PARs</Badge>
                <ViewToggle view={effectiveView} onChange={setView} />
              </div>
            </div>

            {effectiveView === "table" ? (
              <DataTable
                columns={columns}
                data={visibleRows}
                loading={loading}
                searchable={false}
                emptyTitle="No se encontraron PARs"
                emptyDescription="Crea una nueva planilla para comenzar."
                onRowClick={setViewPar}
              />
            ) : (
              <ParCardGrid
                pars={visibleRows}
                loading={loading}
                onView={setViewPar}
                onNavigate={(par) => router.push(`/par/${par.id}`)}
                onApprove={(par) => handleTransition(par, "Aprobado")}
                onDelete={(par) => setToDelete(par)}
                onReject={(par) => handleTransition(par, "Rechazado")}
              />
            )}
          </CardContent>
        </Card>
      </FadeInUp>

      <Modal
        open={Boolean(viewPar)}
        onClose={() => setViewPar(null)}
        size="2xl"
        title={viewPar ? `PAR ${viewPar.par_number}` : ""}
        description={
          viewPar
            ? `${viewPar.client_name} · ${viewPar.client_code || "Sin código"}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewPar(null)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                const id = viewPar?.id;
                setViewPar(null);
                if (id) router.push(`/par/${id}`);
              }}
            >
              Abrir PAR
            </Button>
          </>
        }
      >
        {viewPar && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ReadonlyField label="Número">
                <span className="font-semibold text-foreground">
                  {viewPar.par_number}
                </span>
              </ReadonlyField>
              <ReadonlyField label="Fecha de creación">
                {formatDate(viewPar.created_at, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </ReadonlyField>
              <ReadonlyField label="Tasa de cambio">
                {viewPar.exchange_rate ?? "—"}
              </ReadonlyField>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Estado
                </label>
                <div className="flex h-11 items-center">
                  <StatusBadge
                    status={effectiveStatus(viewPar)}
                    variants={PAR_STATUS_VARIANTS}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ReadonlyField label="Cliente">{viewPar.client_name}</ReadonlyField>
              <ReadonlyField label="Código">
                {viewPar.client_code || "—"}
              </ReadonlyField>
              <ReadonlyField label="Total $">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {formatCurrency(viewPar.total_usd)}
                </span>
              </ReadonlyField>
              <ReadonlyField label="Total Bs">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatVes(viewPar.total_bs)}
                </span>
              </ReadonlyField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ReadonlyField label="Equipo principal">
                {viewPar.main_equipment || "—"}
              </ReadonlyField>
              <ReadonlyField label="Atención">
                {viewPar.atencion || "—"}
              </ReadonlyField>
              <ReadonlyField label="Elaborado por">
                {viewPar.created_by_name || "—"}
              </ReadonlyField>
              <ReadonlyField label="Aprobado por">
                {viewPar.approved_by_name || "—"}
              </ReadonlyField>
            </div>

            <ReadonlyField label="Observaciones">
              {viewPar.observations || "—"}
            </ReadonlyField>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="¿Eliminar este PAR?"
        description={
          toDelete
            ? `El PAR ${toDelete.par_number} se eliminará junto con sus equipos e ítems. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
      />
    </div>
  );
}
