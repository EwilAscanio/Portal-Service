"use client";

import { parPurposeLabel } from "@/lib/warranty";
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
import { ParConsultationModal } from "@/components/par/ParConsultationModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/Modal";
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
        <p className="font-semibold text-foreground">{row.par_number}<span className="block text-xs font-normal text-muted">{parPurposeLabel(row.purpose)}{Number(row.warranty_open_orders)>0 ? ` · ${row.warranty_open_orders} garantías abiertas` : ""}</span></p>
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
      header: "Total final USD",
      className: "text-right",
      render: (row) => (
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          {formatCurrency(row.total_usd)}
        </span>
      ),
    },
    {
      key: "total_bs",
      header: "Total final Bs",
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
              setViewPar(row);
            }}
            onKeyDown={(event) => event.stopPropagation()}
            title="Ver PAR"
            aria-label={`Ver PAR ${row.par_number}`}
            aria-haspopup="dialog"
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
                onApprove={(par) => handleTransition(par, "Aprobado")}
                onDelete={(par) => setToDelete(par)}
                onReject={(par) => handleTransition(par, "Rechazado")}
              />
            )}
          </CardContent>
        </Card>
      </FadeInUp>

      {viewPar && (
        <ParConsultationModal
          key={viewPar.id}
          par={viewPar}
          onClose={() => setViewPar(null)}
          onManage={(par) => {
            setViewPar(null);
            if (par) router.push(`/par/${par.id}`);
          }}
        />
      )}

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
