"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Briefcase, Mail, Pencil, Phone, Plus, Trash2, User } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { createContact, deleteContact, getClients, getContacts, getPlants, updateContact } from "@/lib/api";
import { notify } from "@/lib/toast";
import { getPublicError } from "@/lib/ui-errors";
import { contactSchema } from "@/lib/validators";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ClientSearch } from "@/components/ui/ClientSearch";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { FadeInUp } from "@/components/ui/animated";
import { DataTable } from "@/components/tables/DataTable";
import { RowActions } from "@/components/tables/RowActions";
import { ContactCardGrid } from "@/components/catalog/ContactCardGrid";

const EMPTY_FORM = { name: "", department: "", clientId: "", plantId: "", phone: "", email: "" };

function validateContact(values) {
  const parsed = contactSchema.safeParse(values);
  if (parsed.success) return {};
  const errors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export default function ContactosPage() {
  usePageTitle("Contactos");
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [confirm, setConfirm] = useState(null);

  const [view, setView, viewHydrated] = useLocalStorage("mq-contactos-view", "table");
  const effectiveView = viewHydrated ? view : "table";
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);
  const [clientFilter, setClientFilter] = useState("Todos");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [contactsData, clientsData, plantsData] = await Promise.all([getContacts(), getClients(), getPlants()]);
      setRows(contactsData);
      setClients(clientsData);
      setPlants(plantsData);
    } catch (err) { notify.error(getPublicError(err, "No se pudieron cargar los contactos.")); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde API
  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    let data = rows;
    if (clientFilter !== "Todos") data = data.filter((row) => row.client_id === clientFilter);
    const q = debouncedQuery.trim().toLowerCase();
    if (q) data = data.filter((row) => ["name", "department", "client_name", "plant_name", "phone", "email"].some((key) => String(row[key] ?? "").toLowerCase().includes(q)));
    return data;
  }, [rows, clientFilter, debouncedQuery]);

  const availablePlants = useMemo(() => plants.filter((plant) => plant.client_id === form.clientId), [plants, form.clientId]);

  const openForm = (contact = null) => {
    setEditing(contact);
    setForm(contact ? { name: contact.name || "", department: contact.department || "", clientId: contact.client_id || "", plantId: contact.plant_id || "", phone: contact.phone || "", email: contact.email || "" } : EMPTY_FORM);
    setFieldErrors({});
    setServerError("");
    setModalOpen(true);
  };

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setServerError("");
  };

  const handleClientChange = (clientId) => {
    setForm((current) => ({ ...current, clientId, plantId: "" }));
    setFieldErrors((current) => ({ ...current, clientId: undefined, plantId: undefined }));
    setServerError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = { name: form.name.trim(), department: form.department.trim() || null, clientId: form.clientId, plantId: form.plantId, phone: form.phone.trim() || null, email: form.email.trim() || null };
    const errors = validateContact(payload);
    if (Object.keys(errors).length) { setFieldErrors(errors); setServerError(""); return; }
    setFieldErrors({});
    setSaving(true);
    try {
      if (editing) await updateContact(editing.id, payload); else await createContact(payload);
      notify.success(editing ? "Contacto actualizado." : "Contacto creado.");
      setModalOpen(false);
      await loadData();
    } catch (err) { setServerError(getPublicError(err, "No se pudo guardar el contacto.")); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: "name", header: "Nombre" },
    { key: "client_name", header: "Cliente" },
    { key: "plant_name", header: "Planta" },
    { key: "department", header: "Departamento", className: "hidden lg:table-cell", render: (row) => row.department || "—" },
    { key: "phone", header: "Teléfono", className: "hidden md:table-cell", render: (row) => row.phone || "—" },
    { key: "email", header: "Email", className: "hidden lg:table-cell", render: (row) => row.email || "—" },
    { key: "actions", header: "", sortable: false, className: "w-12", render: (row) => <RowActions row={row} actions={[{ label: "Editar", icon: Pencil, onClick: openForm }, { label: "Eliminar", icon: Trash2, danger: true, onClick: setConfirm }]} /> },
  ];

  return <div className="space-y-6">
    <PageHeader title="Contactos" description="Personas de contacto por cliente y planta." actions={<Button icon={Plus} onClick={() => openForm()}>Nuevo Contacto</Button>} />
    <FadeInUp>
      <Card>
        <CardContent>
          <div className="mb-4 flex flex-nowrap items-center justify-between gap-3">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre, cliente, planta, teléfono o email…" className="w-56 shrink-0" />
            <div className="w-56 shrink-0">
              <ClientSearch clients={clients} value={clientFilter === "Todos" ? "" : clientFilter} onChange={(id) => setClientFilter(id || "Todos")} label="" placeholder="Buscar Cliente…" />
            </div>
            <Badge variant="info" className="shrink-0 text-xs">{filtered.length} contactos</Badge>
            <ViewToggle view={effectiveView} onChange={setView} />
          </div>
          {effectiveView === "table" ? (
            <DataTable columns={columns} data={filtered} loading={loading} searchable={false} emptyTitle="No hay contactos registrados" emptyDescription="Ajusta la búsqueda o cambia el filtro de cliente." />
          ) : (
            <ContactCardGrid contacts={filtered} loading={loading} onEdit={openForm} onDelete={setConfirm} />
          )}
        </CardContent>
      </Card>
    </FadeInUp>
    <Modal
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      title={editing ? "Editar contacto" : "Nuevo contacto"}
      description={editing ? "Modifica los datos del contacto." : "Completa los campos para registrar un nuevo contacto."}
      size="lg"
      footer={<><Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button><Button form="contact-form" type="submit" loading={saving}>{editing ? "Guardar cambios" : "Crear contacto"}</Button></>}
    >
      <form id="contact-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {serverError}
          </motion.div>
        )}
        <Input label="Nombre y Apellido *" icon={User} placeholder="Nombre y apellido" autoFocus value={form.name} error={fieldErrors.name} onChange={(event) => setField("name", event.target.value)} />
        <ClientSearch clients={editing ? clients : clients.filter((client) => client.status === "1")} value={form.clientId} error={fieldErrors.clientId} onChange={handleClientChange} />
        <Select label="Planta *" value={form.plantId} disabled={!form.clientId} error={fieldErrors.plantId} onChange={(event) => setField("plantId", event.target.value)} options={[{ value: "", label: form.clientId ? "Seleccione una planta" : "Seleccione primero un cliente" }, ...availablePlants.map((plant) => ({ value: plant.id, label: plant.name }))]} />
        <Input label="Departamento" icon={Briefcase} placeholder="Área o departamento" value={form.department} error={fieldErrors.department} onChange={(event) => setField("department", event.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2"><Input label="Teléfono" icon={Phone} placeholder="+57 300 000 0000" value={form.phone} onChange={(event) => setField("phone", event.target.value)} /><Input label="Email" type="email" icon={Mail} placeholder="correo@empresa.com" value={form.email} error={fieldErrors.email} onChange={(event) => setField("email", event.target.value)} /></div>
      </form>
    </Modal>
    <ConfirmDialog open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Eliminar contacto" description="No se podrá eliminar si está asociado a una orden." onConfirm={async () => { try { await deleteContact(confirm.id); setConfirm(null); notify.success("Contacto eliminado."); await loadData(); } catch (err) { notify.error(getPublicError(err)); } }} />
  </div>;
}
