"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, Plus } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { notify } from "@/lib/toast";
import { getClients, getOrders, getOrderCatalogs } from "@/lib/api";
import { getPublicError } from "@/lib/ui-errors";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ClientSearch } from "@/components/ui/ClientSearch";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { Badge } from "@/components/ui/Badge";
import { FadeInUp } from "@/components/ui/animated";
import { ServiceOrderCardGrid } from "@/components/service-orders/ServiceOrderCardGrid";
import { ORDER_STATUS_VARIANTS, PRIORITY_VARIANTS } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { downloadCsv } from "@/utils/csv";
import { cn } from "@/utils/cn";

const PRIORITIES = ["Alta", "Media", "Baja"];
const STATUSES = ["Pendiente", "Aprobada", "En Proceso", "Completada", "Cancelada"];

export default function OrdenesPage() {
  usePageTitle("Órdenes de Servicio");
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [clientFilter, setClientFilter] = useState("");
  const [plantFilter, setPlantFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("Todos");
  const [view, setView, viewHydrated] = useLocalStorage("mq-ordenes-view", "table");
  const debouncedQuery = useDebounce(query, 200);
  const effectiveView = viewHydrated ? view : "table";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [orders, clientRows, catalogs] = await Promise.all([getOrders(), getClients(), getOrderCatalogs()]);
      setRows(orders); setClients(clientRows); setPlants(catalogs.plants || []);
    } catch (error) {
      notify.error("No se pudieron cargar las órdenes.", { description: getPublicError(error) });
    } finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de órdenes y catálogos
  useEffect(() => { load(); }, [load]);

  const filterPlants = useMemo(() => clientFilter ? plants.filter((plant) => String(plant.client_id) === String(clientFilter)) : plants, [plants, clientFilter]);
  const visibleRows = useMemo(() => {
    const q = debouncedQuery.trim().toLocaleLowerCase("es");
    return rows.filter((row) => {
      const text = [row.order_code, row.par_number, row.purchase_order_number, row.quotation_number, row.client_name, row.plant_name, row.contact_name, row.technician_display_name, row.service_type, row.work_type, row.status, row.priority].filter(Boolean).join(" ").toLocaleLowerCase("es");
      return (statusFilter === "Todos" || row.status === statusFilter) && (priorityFilter === "Todos" || row.priority === priorityFilter) && (!clientFilter || String(row.client_id) === String(clientFilter)) && (!plantFilter || String(row.plant_id) === String(plantFilter)) && (!q || text.includes(q));
    });
  }, [rows, statusFilter, priorityFilter, clientFilter, plantFilter, debouncedQuery]);

  const openOrder = (row) => router.push(`/ordenes/${row.id}`);
  const handleExport = () => {
    downloadCsv("ordenes-maquitech.csv", visibleRows.map((row) => ({ Orden: row.order_code, PAR: row.par_number, Compra: row.purchase_order_number || "", Cotización: row.quotation_number || "", Cliente: row.client_name, Planta: row.plant_name, Contacto: row.contact_name, Equipos: (row.equipment || []).map((item) => item.name).join(", "), Técnicos: row.technician_display_name, Estado: row.status, Horas_reales: row.actual_hours ?? "", Horas_estimadas: row.labor_review_required ? "" : row.worked_hours, Horas_anteriores: row.legacy_worked_hours ?? "", Revision_horas: row.labor_review_required ? (row.status === "Cancelada" ? "Sin distribución histórica" : "Pendiente") : "Distribuidas" })));
    notify.success("Exportación completa.");
  };

  const columns = [
    { key: "order_code", header: "Orden / PAR", render: (row) => <div><p className="font-semibold text-foreground">{row.order_code}</p><p className="text-xs text-muted">{row.par_number}</p></div> },
    { key: "client_name", header: "Cliente / Planta", render: (row) => <div><p className="font-medium text-foreground">{row.client_name}</p><p className="text-xs text-muted">{row.plant_name}</p></div> },
    { key: "technician_display_name", header: "Técnicos", className: "hidden lg:table-cell" },
    { key: "priority", header: "Prioridad", className: "hidden md:table-cell", render: (row) => <StatusBadge status={row.priority} variants={PRIORITY_VARIANTS} dot={false} /> },
    { key: "status", header: "Estado", render: (row) => <StatusBadge status={row.status} variants={ORDER_STATUS_VARIANTS} /> },
    { key: "scheduled_start", header: "Programada", className: "hidden xl:table-cell", render: (row) => formatDate(row.scheduled_start) },
    { key: "worked_hours", header: "Horas estimadas", className: "text-right", render: (row) => row.labor_review_required ? <span className="text-amber-600">{row.status === "Cancelada" ? "Sin distribución histórica" : "Revisar horas"}</span> : row.worked_hours },
    { key: "actual_hours", header: "Horas reales", className: "text-right", render: (row) => row.actual_hours ?? "—" },
    { key: "actions", header: "", sortable: false, className: "w-12 text-right", render: (row) => <Button variant="ghost" size="sm" icon={Eye} onClick={(event) => { event.stopPropagation(); openOrder(row); }} title="Abrir orden" /> },
  ];

  return <div className="space-y-6">
    <PageHeader title="Órdenes de Servicio" description="Cada orden nace de un PAR aprobado y conserva su contexto operativo." actions={<><Button variant="secondary" icon={Download} onClick={handleExport}>Exportar</Button><Button icon={Plus} onClick={() => router.push("/ordenes/nueva")}>Nueva Orden</Button></>} />
    <FadeInUp><Card><CardContent>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><SearchInput value={query} onChange={setQuery} placeholder="Buscar orden, PAR, cliente, planta o técnico…" className="w-full xl:w-72 xl:shrink-0" /><div className="overflow-x-auto pb-1 xl:flex-1 xl:pb-0"><div className="flex w-max items-center gap-1 rounded-xl border border-border bg-surface p-1">{["Todos", ...STATUSES].map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status)} aria-pressed={statusFilter === status} className={cn("h-8 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors", statusFilter === status ? "bg-blue-600 text-white" : "text-muted hover:bg-surface-2 hover:text-foreground")}>{status}</button>)}</div></div><div className="flex shrink-0 items-center justify-between gap-3"><Badge variant="info">{visibleRows.length} {visibleRows.length === 1 ? "orden" : "órdenes"}</Badge><ViewToggle view={effectiveView} onChange={setView} /></div></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><ClientSearch clients={clients} value={clientFilter} onChange={(value) => { setClientFilter(value); setPlantFilter(""); }} label="" placeholder="Todos los clientes" /><Select aria-label="Filtrar por planta" value={plantFilter} onChange={(event) => setPlantFilter(event.target.value)} options={[{ value: "", label: "Todas las plantas" }, ...filterPlants.map((plant) => ({ value: plant.id, label: plant.name }))]} /><Select aria-label="Filtrar por prioridad" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} options={["Todos", ...PRIORITIES].map((priority) => ({ value: priority, label: priority === "Todos" ? "Todas las prioridades" : priority }))} /></div>
      </div>
      {effectiveView === "table" ? <DataTable columns={columns} data={visibleRows} loading={loading} searchable={false} onRowClick={openOrder} emptyTitle="No se encontraron órdenes" emptyDescription="Ajusta la búsqueda o crea una orden desde un PAR aprobado." /> : <ServiceOrderCardGrid orders={visibleRows} loading={loading} onNavigate={openOrder} />}
    </CardContent></Card></FadeInUp>
  </div>;
}
