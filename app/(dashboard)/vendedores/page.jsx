"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, IdCard, Mail, MapPin, Phone } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getVendors } from "@/lib/api";
import { notify } from "@/lib/toast";
import { getPublicError } from "@/lib/ui-errors";
import { CLIENT_STATUS_VARIANTS } from "@/lib/status";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ReadonlyField } from "@/components/ui/ReadonlyField";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { FadeInUp } from "@/components/ui/animated";
import { DataTable } from "@/components/tables/DataTable";
import { VendorCardGrid } from "@/components/catalog/VendorCardGrid";

const STATUS_OPTIONS = [
  { value: "Todos", label: "Todos los estados" },
  { value: "1", label: "Activos" },
  { value: "0", label: "Inactivos" },
];

function vendorStatusLabel(status) {
  return status === "1" ? "Activo" : "Inactivo";
}

function placeName(name, code) {
  return name || code || "—";
}

function formatSyncedAt(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" });
}

export default function VendedoresPage() {
  usePageTitle("Vendedores");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [view, setView, viewHydrated] = useLocalStorage("mq-vendedores-view", "table");
  const effectiveView = viewHydrated ? view : "table";
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);
  const [statusFilter, setStatusFilter] = useState("Todos");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getVendors());
    } catch (error) {
      notify.error(getPublicError(error, "No se pudieron cargar los vendedores."));
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde API
  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    let data = rows;
    if (statusFilter !== "Todos") data = data.filter((row) => row.status === statusFilter);
    const text = debouncedQuery.trim().toLowerCase();
    if (!text) return data;
    return data.filter((row) =>
      ["codvend", "description", "cedula", "phone", "email", "country_name", "state_name", "city_name"].some((key) =>
        String(row[key] ?? "").toLowerCase().includes(text)
      )
    );
  }, [rows, statusFilter, debouncedQuery]);

  const columns = [
    { key: "codvend", header: "Código" },
    { key: "description", header: "Nombre", render: (row) => row.description || "—" },
    { key: "cedula", header: "Cédula", render: (row) => row.cedula || "—" },
    { key: "phone", header: "Teléfono", className: "hidden md:table-cell", render: (row) => row.phone || "—" },
    { key: "email", header: "Correo", className: "hidden lg:table-cell", render: (row) => row.email || "—" },
    { key: "country_name", header: "País", className: "hidden xl:table-cell", render: (row) => placeName(row.country_name, row.country) },
    { key: "state_name", header: "Estado", className: "hidden xl:table-cell", render: (row) => placeName(row.state_name, row.state) },
    { key: "city_name", header: "Ciudad", className: "hidden lg:table-cell", render: (row) => placeName(row.city_name, row.city) },
    {
      key: "status",
      header: "Situación",
      render: (row) => <StatusBadge status={vendorStatusLabel(row.status)} variants={CLIENT_STATUS_VARIANTS} />,
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      className: "w-12 text-right",
      render: (row) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setDetail(row);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          title="Ver detalle"
          aria-label={`Ver ${row.description || row.codvend}`}
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendedores"
        description="Catálogo comercial sincronizado desde Saint. La consulta no modifica el registro."
      />
      <FadeInUp>
        <Card>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Buscar por código, nombre, cédula, teléfono o correo…"
                className="w-full shrink-0 sm:w-96"
              />
              <Select
                aria-label="Filtrar por estado"
                value={statusFilter}
                options={STATUS_OPTIONS}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full shrink-0 sm:w-52"
              />
              <Badge variant="info" className="shrink-0 text-xs">{filtered.length} vendedores</Badge>
              <ViewToggle view={effectiveView} onChange={setView} />
            </div>
            {effectiveView === "table" ? (
              <DataTable
                columns={columns}
                data={filtered}
                loading={loading}
                searchable={false}
                emptyTitle="No hay vendedores registrados"
                emptyDescription="Sincroniza el catálogo desde Configuración."
                onRowClick={setDetail}
              />
            ) : (
              <VendorCardGrid key={`${statusFilter}:${debouncedQuery}`} vendors={filtered} loading={loading} onSelect={setDetail} />
            )}
          </CardContent>
        </Card>
      </FadeInUp>
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Detalle del vendedor"
        description="Datos recibidos desde Saint."
        size="2xl"
        footer={<Button variant="secondary" onClick={() => setDetail(null)}>Cerrar</Button>}
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-2/60 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">{detail.description || "—"}</p>
                <p className="text-sm text-muted">Código {detail.codvend}</p>
              </div>
              <StatusBadge status={vendorStatusLabel(detail.status)} variants={CLIENT_STATUS_VARIANTS} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ReadonlyField label="Cédula" icon={IdCard}>{detail.cedula || "—"}</ReadonlyField>
              <ReadonlyField label="Teléfono" icon={Phone}>{detail.phone || "—"}</ReadonlyField>
              <ReadonlyField label="Correo" icon={Mail}>{detail.email || "—"}</ReadonlyField>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ReadonlyField label="País" icon={MapPin}>{detail.country_name || "—"}</ReadonlyField>
              <ReadonlyField label="Estado" icon={MapPin}>{detail.state_name || "—"}</ReadonlyField>
              <ReadonlyField label="Ciudad" icon={MapPin}>{detail.city_name || "—"}</ReadonlyField>
            </div>
            <p className="text-xs text-muted">Última sincronización: {formatSyncedAt(detail.last_synced_at)}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
