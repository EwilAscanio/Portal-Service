"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Download, RefreshCw, Eye } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { notify } from "@/lib/toast";
import { getClients, syncClients } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { DataTable } from "@/components/tables/DataTable";
import { ClientCardGrid } from "@/components/clients/ClientCardGrid";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { ReadonlyField } from "@/components/ui/ReadonlyField";
import { SearchInput } from "@/components/ui/SearchInput";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { FadeInUp } from "@/components/ui/animated";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CLIENT_STATUS_VARIANTS } from "@/lib/status";
import { downloadCsv } from "@/utils/csv";

function getActiveLabel(status) {
  return status === "1" ? "Activo" : "Inactivo";
}

export default function ClientesPage() {
  usePageTitle("Clientes");


  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [detailClient, setDetailClient] = useState(null);
  const [syncResults, setSyncResults] = useState(null);

  const [view, setView, viewHydrated] = useLocalStorage(
    "mq-clientes-view",
    "table"
  );
  const effectiveView = viewHydrated ? view : "table";
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      ["codclie", "description", "rif", "email"].some((key) =>
        String(row[key] ?? "").toLowerCase().includes(q)
      )
    );
  }, [rows, debouncedQuery]);

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      setRows(await getClients());
    } catch (error) {
      notify.error("Error", { description: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadClients(); }, [loadClients]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const data = await syncClients();
      setSyncResults({
        count: data.count ?? 0,
        inserted: data.inserted ?? 0,
        updated: data.updated ?? 0,
        activated: data.activated ?? 0,
        deactivated: data.deactivated ?? 0,
        message: data.message,
      });
      await loadClients();
    } catch (error) {
      notify.error("Error de sincronización", { description: error.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = () => {
    if (!rows.length) return;
    const csvData = rows.map((row) => ({
      Código: row.codclie,
      Nombre: row.description || "",
      RIF: row.rif || "",
      "Dirección": row.address1 || "",
      "Dirección 2": row.address2 || "",
      Estado: getActiveLabel(row.status),
      País: row.country_name || row.country || "",
      "Estado/Depto.": row.state_name || row.state || "",
      Teléfono: row.phone || "",
      Email: row.email || "",
      Móvil: row.mobile || "",
    }));
    downloadCsv("clientes-maquitech.csv", csvData);
    notify.success("Exportación completa", { description: "Se descargó el archivo CSV de clientes." });
  };

  const columns = [
    {
      key: "codclie",
      header: "Código",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.codclie} size="sm" />
          <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
            {row.codclie}
          </span>
        </div>
      ),
    },
    {
      key: "description",
      header: "Nombre",
      sortable: true,
      render: (row) => (
        <span className="truncate text-foreground">{row.description || "—"}</span>
      ),
    },
    {
      key: "rif",
      header: "RIF",
      sortable: true,
      className: "hidden md:table-cell",
      render: (row) => <span className="text-sm">{row.rif || "—"}</span>,
    },
    {
      key: "address1",
      header: "Dirección",
      sortable: true,
      className: "hidden xl:table-cell",
      render: (row) => (
        <span className="truncate max-w-[200px] block text-sm">{row.address1 || "—"}</span>
      ),
    },
    {
      key: "country",
      header: "País",
      sortable: true,
      className: "hidden lg:table-cell",
      render: (row) => <span className="text-sm">{row.country_name || row.country || "—"}</span>,
    },
    {
      key: "state",
      header: "Estado",
      sortable: true,
      className: "hidden lg:table-cell",
      render: (row) => <span className="text-sm">{row.state_name || row.state || "—"}</span>,
    },
    {
      key: "phone",
      header: "Teléfono",
      sortable: true,
      className: "hidden md:table-cell",
      render: (row) => <span className="text-sm">{row.phone || "—"}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      className: "hidden xl:table-cell",
      render: (row) => <span className="text-sm">{row.email || "—"}</span>,
    },
    {
      key: "mobile",
      header: "Móvil",
      sortable: true,
      className: "hidden xl:table-cell",
      render: (row) => <span className="text-sm">{row.mobile || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <StatusBadge
          status={getActiveLabel(row.status)}
          variants={CLIENT_STATUS_VARIANTS}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      className: "w-12 text-right",
      render: (row) => (
        <button
          onClick={(event) => {
            event.stopPropagation();
            setDetailClient(row);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          title="Ver detalle"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Clientes sincronizados desde Saint ERP."
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={handleExport}>
              Exportar
            </Button>
            <Button variant="primary" icon={RefreshCw} onClick={handleSync} loading={syncing}>
              Sincronizar con Saint
            </Button>
          </>
        }
      />

      <FadeInUp>
        <Card>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Buscar por código, nombre, RIF…"
                className="sm:max-w-xs"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="info">{filtered.length} clientes</Badge>
                <ViewToggle view={effectiveView} onChange={setView} />
              </div>
            </div>

            {effectiveView === "table" ? (
              <DataTable
                columns={columns}
                data={filtered}
                loading={loading}
                searchable={false}
                emptyTitle="No se encontraron clientes"
                emptyDescription="Haz clic en 'Sincronizar con Saint' para importar clientes."
                onRowClick={setDetailClient}
              />
            ) : (
              <ClientCardGrid
                clients={filtered}
                loading={loading}
                onView={setDetailClient}
              />
            )}
          </CardContent>
        </Card>
      </FadeInUp>

      <Modal
        open={Boolean(detailClient)}
        onClose={() => setDetailClient(null)}
        title={`Cliente ${detailClient?.codclie || ""}`}
        description="Datos sincronizados desde Saint ERP."
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setDetailClient(null)}>
            Cerrar
          </Button>
        }
      >
        {detailClient && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label="Código">
                <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {detailClient.codclie}
                </span>
              </ReadonlyField>
              <ReadonlyField label="RIF">{detailClient.rif || "—"}</ReadonlyField>
            </div>

            <ReadonlyField label="Nombre">
              {detailClient.description || "—"}
            </ReadonlyField>

            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label="Dirección">
                {detailClient.address1 || "—"}
              </ReadonlyField>
              <ReadonlyField label="Dirección 2">
                {detailClient.address2 || "—"}
              </ReadonlyField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label="País">
                {detailClient.country_name || detailClient.country || "—"}
              </ReadonlyField>
              <ReadonlyField label="Estado/Depto.">
                {detailClient.state_name || detailClient.state || "—"}
              </ReadonlyField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label="Teléfono">
                {detailClient.phone || "—"}
              </ReadonlyField>
              <ReadonlyField label="Email">{detailClient.email || "—"}</ReadonlyField>
            </div>

            <ReadonlyField label="Móvil">{detailClient.mobile || "—"}</ReadonlyField>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Estado
              </label>
              <StatusBadge
                status={getActiveLabel(detailClient.status)}
                variants={CLIENT_STATUS_VARIANTS}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(syncResults)}
        onClose={() => setSyncResults(null)}
        title={syncResults?.count > 0 ? "Sincronización completada" : "Sin cambios"}
        size="sm"
        footer={
          <Button onClick={() => setSyncResults(null)}>
            Aceptar
          </Button>
        }
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {syncResults?.count ?? 0}
          </span>
          <p className="text-sm text-muted">
            {syncResults?.count === 1
              ? "cliente procesado desde Saint ERP."
              : "clientes procesados desde Saint ERP."}
          </p>

          <div className="mt-1 flex flex-wrap justify-center gap-x-8 gap-y-3">
            {(syncResults?.inserted ?? 0) > 0 && (
              <div className="text-center">
                <p className="text-xl font-bold text-emerald-500">{syncResults.inserted}</p>
                <p className="text-sm text-muted">nuevos</p>
              </div>
            )}
            {(syncResults?.updated ?? 0) > 0 && (
              <div className="text-center">
                <p className="text-xl font-bold text-blue-500">{syncResults.updated}</p>
                <p className="text-sm text-muted">actualizados</p>
              </div>
            )}
            {(syncResults?.activated ?? 0) > 0 && (
              <div className="text-center">
                <p className="text-xl font-bold text-teal-500">{syncResults.activated}</p>
                <p className="text-sm text-muted">activados</p>
              </div>
            )}
            {(syncResults?.deactivated ?? 0) > 0 && (
              <div className="text-center">
                <p className="text-xl font-bold text-red-500">{syncResults.deactivated}</p>
                <p className="text-sm text-muted">desactivados</p>
              </div>
            )}
          </div>

          {syncResults?.message && (
            <p className="mt-1 text-sm text-muted/70">{syncResults.message}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
