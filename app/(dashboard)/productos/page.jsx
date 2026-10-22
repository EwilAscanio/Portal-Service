"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Barcode, Boxes, DollarSign, Factory, FileText, Hash, Layers, PackageCheck, Pencil, Plus, Tag, ToggleLeft, ToggleRight } from "lucide-react";
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
import { ROLES } from "@/lib/permissions";
import { PRODUCT_CATEGORY_FILTERS } from "@/lib/par/constants";
import { getPublicError } from "@/lib/ui-errors";
import { productSchema } from "@/lib/validators";

const CATEGORIES = PRODUCT_CATEGORY_FILTERS;

const EMPTY_FORM = {
  code: "",
  description: "",
  brand: "",
  serial: "",
  modelo: "",
  cost: "",
  price: "",
  category: "Servicio",
  requiresTechnician: false,
  stock: "",
  status: "Activo",
};

function validateProduct(values) {
  const parsed = productSchema.safeParse(values);
  if (parsed.success) return {};
  const issues = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (key && !issues[key]) issues[key] = issue.message;
  }
  return issues;
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
  const [fieldErrors, setFieldErrors] = useState({});
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

  const canEditCost = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR].includes(user?.role);

  const loadData = useCallback(async () => {
    try {
      const params = categoryFilter !== "Todos" ? { category: categoryFilter } : undefined;
      setProducts(await getProducts(params));
    } catch (err) {
      notify.error("Error al cargar productos.", { description: getPublicError(err, "No se pudieron cargar los productos.") });
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
    setForm((c) => ({ ...c, [field]: event.target.value, ...(field === "category" && event.target.value !== "Servicio" ? { requiresTechnician: false } : {}) }));
    setFieldErrors((c) => ({ ...c, [field]: undefined }));
    setServerError("");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setServerError("");
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      code: product.code ?? "",
      description: product.description ?? "",
      brand: product.brand ?? "",
      serial: product.serial ?? "",
      modelo: product.modelo ?? "",
      cost: product.cost ?? "",
      price: product.price ?? "",
      category: product.category ?? "Servicio",
      requiresTechnician: product.requires_technician ?? false,
      stock: product.stock ?? "",
      status: product.status ?? "Activo",
    });
    setFieldErrors({});
    setServerError("");
    setModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errs = validateProduct({
      ...form,
      cost: form.cost === "" ? undefined : form.cost,
      price: form.price === "" ? undefined : form.price,
    });
    if (Object.keys(errs).length) { setFieldErrors(errs); setServerError(""); return; }
    setFieldErrors({});

    setSaving(true);
    setServerError("");
    try {
      if (editing) {
        await updateProduct(editing.id, {
          code: form.code.trim(),
          description: form.description.trim(),
          brand: form.brand.trim() || null,
          serial: form.serial.trim() || null,
          modelo: form.modelo.trim() || null,
          cost: Number(form.cost),
          price: Number(form.price),
          category: form.category,
          requiresTechnician: form.category === "Servicio" && form.requiresTechnician,
          stock: form.stock !== "" ? Number(form.stock) : 0,
          status: form.status,
        });
      } else {
        await createProduct({
          code: form.code.trim(),
          description: form.description.trim(),
          brand: form.brand.trim() || null,
          serial: form.serial.trim() || null,
          modelo: form.modelo.trim() || null,
          cost: Number(form.cost),
          price: Number(form.price),
          category: form.category,
          requiresTechnician: form.category === "Servicio" && form.requiresTechnician,
          stock: form.stock !== "" ? Number(form.stock) : 0,
        });
      }
      notify.success(editing ? "Producto actualizado." : "Producto creado.");
      setModalOpen(false);
      loadData();
    } catch (err) {
      setServerError(getPublicError(err, "No se pudo guardar el producto."));
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
      notify.error(getPublicError(err, "No se pudo cambiar el estado del producto."));
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
      render: (row) => <div><p className="font-medium text-foreground">{row.description}</p>{row.requires_technician && <span className="text-xs text-blue-600">Mano de obra · requiere técnico</span>}</div>,
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
        const variants = { Servicio: "purple", Repuestos: "warning" };
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
        size="2xl"
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
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {serverError}
            </motion.div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Código *"
              icon={Hash}
              placeholder="EQP-001"
              autoFocus
              value={form.code}
              error={fieldErrors.code}
              onChange={setField("code")}
              disabled={Boolean(editing)}
            />
            <Input
              label="Descripción *"
              icon={FileText}
              placeholder="Nombre o descripción del producto"
              containerClassName="sm:col-span-1 lg:col-span-3"
              value={form.description}
              error={fieldErrors.description}
              onChange={setField("description")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Marca"
              icon={Factory}
              placeholder="Ingelsonrand"
              value={form.brand}
              onChange={setField("brand")}
              containerClassName="sm:col-span-2 lg:col-span-2"
            />
            <Select
              label="Categoría"
              value={form.category}
              onChange={setField("category")}
              error={fieldErrors.category}
              options={[
                { value: "Servicio", label: "Servicio" },
                { value: "Repuestos", label: "Repuestos" },
              ]}
            />
            <Input
              label="Serial"
              icon={Barcode}
              placeholder="IR998231"
              value={form.serial}
              onChange={setField("serial")}
            />
          </div>

          <div className="rounded-xl border border-border p-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.requiresTechnician} disabled={form.category !== "Servicio"} onChange={(event) => setForm((current) => ({ ...current, requiresTechnician: event.target.checked }))} />Requiere técnico (mano de obra por horas)</label>
            <p className="mt-1 text-xs text-muted">La cantidad del producto en el PAR será el presupuesto de horas. Los renglones ya guardados conservan su clasificación; para actualizar un PAR editable, vuelva a seleccionar el producto.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Modelo"
              icon={Boxes}
              placeholder="NIRVANA 150"
              value={form.modelo}
              onChange={setField("modelo")}
            />
            {canEditCost ? (
              <Input
                label="Costo ($) *"
                icon={DollarSign}
                type="number"
                placeholder="0"
                min="0"
                value={form.cost}
                error={fieldErrors.cost}
                onChange={setField("cost")}
              />
            ) : (
              <Input label="Costo ($)" value="Restringido" disabled />
            )}
            <Input
              label="Precio ($) *"
              icon={Tag}
              type="number"
              placeholder="0"
              min="0"
              value={form.price}
              error={fieldErrors.price}
              onChange={setField("price")}
              disabled={!canEditCost}
              hint={!canEditCost ? "Solo Admin/Supervisor." : undefined}
            />
            <Input
              label="Existencia"
              icon={Layers}
              type="number"
              placeholder="0"
              min="0"
              value={form.stock}
              error={fieldErrors.stock}
              onChange={setField("stock")}
            />
          </div>

          {editing && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Estado"
                value={form.status}
                onChange={setField("status")}
                options={[
                  { value: "Activo", label: "Activo" },
                  { value: "Inactivo", label: "Inactivo" },
                ]}
              />
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
