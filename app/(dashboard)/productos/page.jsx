"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, PackageCheck, Pencil, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { notify } from "@/lib/toast";
import {
  getProducts,
  createProduct,
  updateProduct,
  updateProductStatus,
} from "@/lib/api";
import { DataTable } from "@/components/tables/DataTable";
import { ProductCardGrid } from "@/components/products/ProductCardGrid";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { FadeInUp } from "@/components/ui/animated";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/utils/cn";

const CATEGORIES = ["Todos", "Principal", "Servicio", "Repuestos"];

const EMPTY_FORM = {
  code: "",
  description: "",
  type: "",
  brand: "",
  serial: "",
  modelo: "",
  cost: "",
  price: "",
  category: "Principal",
  stock: "",
  status: "Activo",
};

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProductosPage() {
  usePageTitle("Catálogo");

  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, product: null });

  const [view, setView, viewHydrated] = useLocalStorage(
    "mq-productos-view",
    "table"
  );
  const effectiveView = viewHydrated ? view : "table";
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);

  const canEditCost = user?.role === "Administrador" || user?.role === "Supervisor";

  const loadData = useCallback(async () => {
    try {
      const params = categoryFilter !== "Todos" ? { category: categoryFilter } : undefined;
      setProducts(await getProducts(params));
    } catch (err) {
      notify.error("Error al cargar productos.", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((row) =>
      ["code", "description", "brand"].some((key) =>
        String(row[key] ?? "").toLowerCase().includes(q)
      )
    );
  }, [products, debouncedQuery]);

  const setField = (field) => (event) => {
    setForm((c) => ({ ...c, [field]: event.target.value }));
    setErrors((c) => ({ ...c, [field]: undefined }));
    setServerError("");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setServerError("");
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      code: product.code ?? "",
      description: product.description ?? "",
      type: product.type ?? "",
      brand: product.brand ?? "",
      serial: product.serial ?? "",
      modelo: product.modelo ?? "",
      cost: product.cost ?? "",
      price: product.price ?? "",
      category: product.category ?? "Principal",
      stock: product.stock ?? "",
      status: product.status ?? "Activo",
    });
    setErrors({});
    setServerError("");
    setModalOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.code.trim()) errs.code = "El código es obligatorio.";
    if (!form.description.trim()) errs.description = "La descripción es obligatoria.";
    if (!form.type.trim()) errs.type = "El tipo es obligatorio.";
    if (form.cost === "" || form.cost == null) errs.cost = "El costo es obligatorio.";
    else if (Number(form.cost) < 0) errs.cost = "El costo no puede ser negativo.";
    if (form.price === "" || form.price == null) errs.price = "El precio es obligatorio.";
    else if (Number(form.price) < 0) errs.price = "El precio no puede ser negativo.";
    if (form.stock !== "" && form.stock != null && Number(form.stock) < 0) {
      errs.stock = "La existencia no puede ser negativa.";
    }
    return errs;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setServerError("");
    try {
      if (editing) {
        await updateProduct(editing.id, {
          code: form.code.trim(),
          description: form.description.trim(),
          type: form.type.trim(),
          brand: form.brand.trim() || null,
          serial: form.serial.trim() || null,
          modelo: form.modelo.trim() || null,
          cost: Number(form.cost),
          price: Number(form.price),
          category: form.category,
          stock: form.stock !== "" ? Number(form.stock) : 0,
          status: form.status,
        });
      } else {
        await createProduct({
          code: form.code.trim(),
          description: form.description.trim(),
          type: form.type.trim(),
          brand: form.brand.trim() || null,
          serial: form.serial.trim() || null,
          modelo: form.modelo.trim() || null,
          cost: Number(form.cost),
          price: Number(form.price),
          category: form.category,
          stock: form.stock !== "" ? Number(form.stock) : 0,
        });
      }
      notify.success(editing ? "Producto actualizado." : "Producto creado.");
      setModalOpen(false);
      loadData();
    } catch (err) {
      setServerError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (product) => {
    setConfirm({ open: true, product });
  };

  const confirmToggle = async () => {
    const { product } = confirm;
    const newStatus = product.status === "Activo" ? "Inactivo" : "Activo";
    try {
      await updateProductStatus(product.id, newStatus);
      notify.success(`Producto ${newStatus === "Activo" ? "activado" : "desactivado"}.`);
      setConfirm({ open: false, product: null });
      loadData();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const columns = [
    {
      key: "code",
      header: "Código",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
          {row.code}
        </span>
      ),
    },
    {
      key: "description",
      header: "Descripción",
      sortable: true,
      render: (row) => <p className="font-medium text-foreground">{row.description}</p>,
    },
    {
      key: "type",
      header: "Tipo",
      sortable: true,
      render: (row) => <span className="text-sm">{row.type}</span>,
    },
    {
      key: "brand",
      header: "Marca",
      sortable: true,
      render: (row) => <span className="text-sm">{row.brand || "—"}</span>,
    },
    {
      key: "cost",
      header: "Costo",
      sortable: true,
      accessor: (row) => Number(row.cost),
      render: (row) => (
        <span className="text-sm font-medium">{formatCurrency(row.cost)}</span>
      ),
    },
    {
      key: "price",
      header: "Precio",
      sortable: true,
      accessor: (row) => Number(row.price),
      render: (row) => (
        <span className="text-sm font-medium">{formatCurrency(row.price)}</span>
      ),
    },
    {
      key: "category",
      header: "Categoría",
      sortable: true,
      render: (row) => {
        const variants = { Principal: "info", Servicio: "purple", Repuestos: "warning" };
        return <Badge variant={variants[row.category] || "neutral"}>{row.category}</Badge>;
      },
    },
    {
      key: "stock",
      header: "Existencia",
      sortable: true,
      accessor: (row) => Number(row.stock),
      render: (row) => (
        <span className={cn("text-sm font-medium", row.stock === 0 && "text-muted")}>
          {row.stock}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === "Activo" ? "success" : "danger"} dot>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      sortable: false,
      className: "w-24",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEdit(row)}
            aria-label={`Editar ${row.description}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(row)}
            aria-label={row.status === "Activo" ? `Desactivar ${row.description}` : `Activar ${row.description}`}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              row.status === "Activo"
                ? "text-muted hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                : "text-muted hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
            )}
          >
            {row.status === "Activo" ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de Productos"
        description="Gestión del catálogo maestro de productos y servicios."
        actions={
          <Button icon={Plus} onClick={openCreate}>
            Nuevo Producto
          </Button>
        }
      />

      <FadeInUp>
        <Card>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Buscar por código, descripción o marca…"
                className="sm:max-w-xs"
              />
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      aria-pressed={categoryFilter === cat}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                        categoryFilter === cat
                          ? "bg-blue-600 text-white"
                          : "text-muted hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      {cat === "Todos" ? "Todas" : cat}
                    </button>
                  ))}
                </div>
                <Badge variant="info" className="text-xs">
                  <PackageCheck className="h-3.5 w-3.5" />
                  {filtered.length} productos
                </Badge>
                <ViewToggle view={effectiveView} onChange={setView} />
              </div>
            </div>

            {effectiveView === "table" ? (
              <DataTable
                columns={columns}
                data={filtered}
                loading={loading}
                searchable={false}
                pageSize={10}
                emptyTitle="No se encontraron productos"
                emptyDescription="Ajusta la búsqueda o agrega un nuevo producto al catálogo."
              />
            ) : (
              <ProductCardGrid
                products={filtered}
                loading={loading}
                onEdit={openEdit}
                onToggleStatus={handleToggleStatus}
                canEditCost={canEditCost}
              />
            )}
          </CardContent>
        </Card>
      </FadeInUp>

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar producto" : "Nuevo producto"}
        description={
          editing
            ? "Modifica los datos del producto."
            : "Completa los campos para agregar un producto al catálogo."
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="product-form" loading={saving}>
              {editing ? "Guardar cambios" : "Crear producto"}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {serverError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Código"
              placeholder="EQP-001"
              value={form.code}
              error={errors.code}
              onChange={setField("code")}
              disabled={Boolean(editing)}
            />
            <Select
              label="Tipo"
              value={form.type}
              error={errors.type}
              onChange={setField("type")}
              options={[
                { value: "Repuesto", label: "Repuesto" },
                { value: "Servicio", label: "Servicio" },
              ]}
            />
          </div>

          <Input
            label="Descripción"
            placeholder="Nombre o descripción del producto"
            value={form.description}
            error={errors.description}
            onChange={setField("description")}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Marca"
              placeholder="Ingelsonrand"
              value={form.brand}
              onChange={setField("brand")}
            />
            <Select
              label="Categoría"
              value={form.category}
              onChange={setField("category")}
              error={errors.category}
              options={[
                { value: "Principal", label: "Principal" },
                { value: "Servicio", label: "Servicio" },
                { value: "Repuestos", label: "Repuestos" },
              ]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Serial"
              placeholder="IR998231"
              value={form.serial}
              onChange={setField("serial")}
            />
            <Input
              label="Modelo"
              placeholder="NIRVANA 150"
              value={form.modelo}
              onChange={setField("modelo")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Costo ($)"
              type="number"
              placeholder="0"
              min="0"
              value={form.cost}
              error={errors.cost}
              onChange={setField("cost")}
              disabled={!canEditCost}
              hint={!canEditCost ? "Solo Admin/Supervisor." : undefined}
            />
            <Input
              label="Precio ($)"
              type="number"
              placeholder="0"
              min="0"
              value={form.price}
              error={errors.price}
              onChange={setField("price")}
              disabled={!canEditCost}
              hint={!canEditCost ? "Solo Admin/Supervisor." : undefined}
            />
            <Input
              label="Existencia"
              type="number"
              placeholder="0"
              min="0"
              value={form.stock}
              error={errors.stock}
              onChange={setField("stock")}
            />
          </div>

          {editing && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Estado</label>
              <select
                value={form.status}
                onChange={setField("status")}
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none dark:hover:border-slate-600"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, product: null })}
        onConfirm={confirmToggle}
        title={
          confirm.product?.status === "Activo"
            ? "¿Desactivar producto?"
            : "¿Activar producto?"
        }
        description={
          confirm.product?.status === "Activo"
            ? `El producto ${confirm.product?.description} no podrá agregarse a nuevos PAR.`
            : `El producto ${confirm.product?.description} volverá a estar disponible.`
        }
        confirmLabel={confirm.product?.status === "Activo" ? "Desactivar" : "Activar"}
      />
    </div>
  );
}
