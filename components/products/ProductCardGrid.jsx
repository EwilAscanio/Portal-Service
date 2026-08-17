"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Cog,
  Factory,
  Inbox,
  Pencil,
  Tags,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { ReadonlyField } from "@/components/ui/ReadonlyField";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { Stagger, FadeInUp } from "@/components/ui/animated";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 12;

const CATEGORY_VARIANTS = {
  Principal: "info",
  Servicio: "purple",
  Repuestos: "warning",
};

const pageButton =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-surface px-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-3.5 w-3/4" />
      <div className="mt-3 space-y-1.5 border-y border-border py-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="mt-3 space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/**
 * Vista de tarjetas para el catálogo de productos.
 * Recibe la lista ya filtrada por búsqueda/categoría y pagina 12 por página.
 */
export function ProductCardGrid({
  products,
  loading,
  onEdit,
  onToggleStatus,
  canEditCost,
}) {
  const [page, setPage] = useState(1);
  const [viewProduct, setViewProduct] = useState(null);

  const handleCardKeyDown = (event, product) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setViewProduct(product);
    }
  };

  const [prevProducts, setPrevProducts] = useState(products);
  if (products !== prevProducts) {
    setPage(1);
    setPrevProducts(products);
  }

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = products.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const pageNumbers = [];
  let start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  for (let i = start; i <= end; i += 1) pageNumbers.push(i);

  const from = products.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, products.length);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No se encontraron productos"
        description="Ajusta la búsqueda o agrega un nuevo producto al catálogo."
      />
    );
  }

  return (
    <div>
      <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pageData.map((product) => (
          <FadeInUp key={product.id} className="h-full">
            <Card
              className="flex h-full cursor-pointer flex-col transition-colors hover:border-blue-500/40"
              onClick={() => setViewProduct(product)}
              onKeyDown={(event) => handleCardKeyDown(event, product)}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-label={`Ver información de ${product.description}`}
            >
              <CardContent className="flex flex-1 flex-col gap-2 p-4">
                {/* Header: código + estado */}
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-7 items-center rounded-lg bg-blue-500/10 px-2 font-mono text-[11px] font-bold text-blue-600 ring-1 ring-inset ring-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400">
                    {product.code}
                  </span>
                  <Badge
                    variant={product.status === "Activo" ? "success" : "danger"}
                    dot
                  >
                    {product.status}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm text-foreground">
                  {product.description}
                </p>

                {/* Detalles */}
                <div className="space-y-1.5 border-y border-border py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Tags className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">Categoría</span>
                    <Badge
                      variant={CATEGORY_VARIANTS[product.category] || "neutral"}
                    >
                      {product.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cog className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">Tipo</span>
                    <span className="truncate font-medium text-foreground">
                      {product.type || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Factory className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">Marca</span>
                    <span className="truncate font-medium text-foreground">
                      {product.brand || "—"}
                    </span>
                  </div>
                </div>

                {/* Financiero */}
                <div className="mt-auto space-y-1 pt-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-muted">Precio</span>
                    <span className="text-sm font-bold tracking-tight text-foreground">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                  {canEditCost && (
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs text-muted">Costo</span>
                      <span className="text-xs font-medium text-muted">
                        {formatCurrency(product.cost)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-muted">Existencia</span>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        product.stock === 0 ? "text-muted" : "text-foreground"
                      )}
                    >
                      {product.stock}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(product);
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <Tooltip
                  label={
                    product.status === "Activo" ? "Desactivar" : "Activar"
                  }
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleStatus(product);
                    }}
                    aria-label={
                      product.status === "Activo"
                        ? `Desactivar ${product.description}`
                        : `Activar ${product.description}`
                    }
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-colors hover:bg-surface-2",
                      product.status === "Activo"
                        ? "hover:text-red-600 dark:hover:text-red-400"
                        : "hover:text-emerald-600 dark:hover:text-emerald-400"
                    )}
                  >
                    {product.status === "Activo" ? (
                      <ToggleLeft className="h-4 w-4" />
                    ) : (
                      <ToggleRight className="h-4 w-4" />
                    )}
                  </button>
                </Tooltip>
              </CardFooter>
            </Card>
          </FadeInUp>
        ))}
      </Stagger>

      <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-border px-2 pt-4 sm:flex-row">
        <p className="text-xs text-muted">
          Mostrando{" "}
          <span className="font-semibold text-foreground">
            {from}–{to}
          </span>{" "}
          de{" "}
          <span className="font-semibold text-foreground">
            {products.length}
          </span>{" "}
          registros
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Página anterior"
            className={pageButton}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageNumbers.map((number) => (
            <button
              key={number}
              type="button"
              onClick={() => setPage(number)}
              aria-current={number === currentPage ? "page" : undefined}
              className={cn(
                pageButton,
                number === currentPage &&
                  "border-blue-600 bg-blue-600 text-black dark:text-white"
              )}
            >
              {number}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="Página siguiente"
            className={pageButton}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewProduct && (
        <Modal
          open={Boolean(viewProduct)}
          onClose={() => setViewProduct(null)}
          size="lg"
          title={viewProduct.description}
          description={`Código ${viewProduct.code}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setViewProduct(null)}>
                Cerrar
              </Button>
              <Button
                icon={Pencil}
                onClick={() => {
                  setViewProduct(null);
                  onEdit(viewProduct);
                }}
              >
                Editar
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label="Código">
                <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {viewProduct.code}
                </span>
              </ReadonlyField>
              <ReadonlyField label="Tipo">{viewProduct.type || "—"}</ReadonlyField>
            </div>

            <ReadonlyField label="Descripción">
              {viewProduct.description}
            </ReadonlyField>

            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label="Marca">{viewProduct.brand || "—"}</ReadonlyField>
              <ReadonlyField label="Categoría">{viewProduct.category}</ReadonlyField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label="Serial">{viewProduct.serial || "—"}</ReadonlyField>
              <ReadonlyField label="Modelo">{viewProduct.modelo || "—"}</ReadonlyField>
            </div>

            <div
              className={cn(
                "grid gap-4",
                canEditCost ? "sm:grid-cols-3" : "sm:grid-cols-2"
              )}
            >
              {canEditCost && (
                <ReadonlyField label="Costo ($)">
                  {formatCurrency(viewProduct.cost)}
                </ReadonlyField>
              )}
              <ReadonlyField label="Precio ($)">
                <span className="font-semibold">
                  {formatCurrency(viewProduct.price)}
                </span>
              </ReadonlyField>
              <ReadonlyField label="Existencia">{viewProduct.stock}</ReadonlyField>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Estado
              </label>
              <Badge
                variant={viewProduct.status === "Activo" ? "success" : "danger"}
                dot
              >
                {viewProduct.status}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label="Creado">
                {viewProduct.created_at
                  ? formatDate(viewProduct.created_at, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </ReadonlyField>
              <ReadonlyField label="Actualizado">
                {viewProduct.updated_at
                  ? formatDate(viewProduct.updated_at, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </ReadonlyField>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
