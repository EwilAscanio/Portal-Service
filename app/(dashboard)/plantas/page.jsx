"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Factory, Hash, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { createPlant, deletePlant, getClients, getPlants, updatePlant } from "@/lib/api";
import { notify } from "@/lib/toast";
import { getPublicError } from "@/lib/ui-errors";
import { plantSchema } from "@/lib/validators";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ClientSearch } from "@/components/ui/ClientSearch";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { FadeInUp } from "@/components/ui/animated";
import { DataTable } from "@/components/tables/DataTable";
import { RowActions } from "@/components/tables/RowActions";
import { PlantCardGrid } from "@/components/catalog/PlantCardGrid";

const EMPTY_FORM = { name: "", code: "", address: "", clientId: "" };

function validatePlant(values) {
  const parsed = plantSchema.safeParse(values);
  if (parsed.success) return {};
  const errors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export default function PlantasPage() {
  usePageTitle("Plantas");
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [confirm, setConfirm] = useState(null);

  const [view, setView, viewHydrated] = useLocalStorage("mq-plantas-view", "table");
  const effectiveView = viewHydrated ? view : "table";
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);
  const [clientFilter, setClientFilter] = useState("Todos");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plantsData, clientsData] = await Promise.all([getPlants(), getClients()]);
      setRows(plantsData);
      setClients(clientsData);
    } catch (err) { notify.error(getPublicError(err, "No se pudieron cargar las plantas.")); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde API
  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    let data = rows;
    if (clientFilter !== "Todos") data = data.filter((row) => row.client_id === clientFilter);
    const q = debouncedQuery.trim().toLowerCase();
    if (q) data = data.filter((row) => ["name", "code", "client_name", "client_code", "address"].some((key) => String(row[key] ?? "").toLowerCase().includes(q)));
    return data;
  }, [rows, clientFilter, debouncedQuery]);

  const openForm = (plant = null) => {
    setEditing(plant);
    setForm(plant ? { name: plant.name || "", code: plant.code || "", address: plant.address || "", clientId: plant.client_id || "" } : EMPTY_FORM);
    setFieldErrors({});
    setServerError("");
    setModalOpen(true);
  };

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setServerError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = { name: form.name.trim(), code: form.code.trim(), address: form.address.trim() || null, clientId: form.clientId };
    const errors = validatePlant(payload);
    if (Object.keys(errors).length) { setFieldErrors(errors); setServerError(""); return; }
    setFieldErrors({});
    setSaving(true);
    try {
      if (editing) await updatePlant(editing.id, payload); else await createPlant(payload);
      notify.success(editing ? "Planta actualizada." : "Planta creada.");
      setModalOpen(false);
      await loadData();
    } catch (err) { setServerError(getPublicError(err, "No se pudo guardar la planta.")); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: "code", header: "Código" },
    { key: "name", header: "Planta" },
    { key: "client_name", header: "Cliente" },
    { key: "client_code", header: "Código Cliente", className: "hidden md:table-cell" },
    { key: "address", header: "Dirección", className: "hidden lg:table-cell", render: (row) => row.address || "—" },
    { key: "actions", header: "", sortable: false, className: "w-12", render: (row) => <RowActions row={row} actions={[{ label: "Editar", icon: Pencil, onClick: openForm }, { label: "Eliminar", icon: Trash2, danger: true, onClick: setConfirm }]} /> },
  ];

  return <div className="space-y-6">
    <PageHeader title="Plantas" description="Sedes y plantas asociadas a cada cliente." actions={<Button icon={Plus} onClick={() => openForm()}>Nueva Planta</Button>} />
    <FadeInUp>
      <Card>
        <CardContent>
          <div className="mb-4 flex flex-nowrap items-center justify-between gap-3">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar por planta, cliente, código o dirección…" className="w-56 shrink-0" />
            <div className="w-56 shrink-0">
              <ClientSearch clients={clients} value={clientFilter === "Todos" ? "" : clientFilter} onChange={(id) => setClientFilter(id || "Todos")} label="" placeholder="Buscar Cliente…" />
            </div>
            <Badge variant="info" className="shrink-0 text-xs">{filtered.length} plantas</Badge>
            <ViewToggle view={effectiveView} onChange={setView} />
          </div>
          {effectiveView === "table" ? (
            <DataTable columns={columns} data={filtered} loading={loading} searchable={false} emptyTitle="No hay plantas registradas" emptyDescription="Ajusta la búsqueda o cambia el filtro de cliente." />
          ) : (
            <PlantCardGrid plants={filtered} loading={loading} onEdit={openForm} onDelete={setConfirm} />
          )}
        </CardContent>
      </Card>
    </FadeInUp>
    <Modal
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      title={editing ? "Editar planta" : "Nueva planta"}
      description={editing ? "Modifica los datos de la planta." : "Completa los campos para registrar una nueva planta."}
      size="lg"
      footer={<><Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button><Button form="plant-form" type="submit" loading={saving}>{editing ? "Guardar cambios" : "Crear planta"}</Button></>}
    >
      <form id="plant-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {serverError}
          </motion.div>
        )}
        <Input label="Código *" icon={Hash} placeholder="Código de la planta" autoFocus value={form.code} error={fieldErrors.code} onChange={(event) => setField("code", event.target.value)} />
        <Input label="Nombre *" icon={Factory} placeholder="Nombre de la planta" value={form.name} error={fieldErrors.name} onChange={(event) => setField("name", event.target.value)} />
        <ClientSearch clients={editing ? clients : clients.filter((client) => client.status === "1")} value={form.clientId} error={fieldErrors.clientId} onChange={(clientId) => setField("clientId", clientId)} />
        <Input label="Dirección" icon={MapPin} placeholder="Dirección de la planta" value={form.address} error={fieldErrors.address} onChange={(event) => setField("address", event.target.value)} />
      </form>
    </Modal>
    <ConfirmDialog open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Eliminar planta" description="Sólo se eliminará si no está asociada a equipos, contactos, PAR u órdenes." onConfirm={async () => { try { await deletePlant(confirm.id); setConfirm(null); notify.success("Planta eliminada."); await loadData(); } catch (err) { notify.error(getPublicError(err)); } }} />
  </div>;
}
