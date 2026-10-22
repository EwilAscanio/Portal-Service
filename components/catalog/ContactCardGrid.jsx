"use client";

import { useState } from "react";
import {
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  Factory,
  Inbox,
  Mail,
  Pencil,
  Phone,
  Trash2,
  User,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReadonlyField } from "@/components/ui/ReadonlyField";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { Stagger, FadeInUp } from "@/components/ui/animated";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 12;

const pageButton =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-surface px-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-3.5 w-3/4" />
      <div className="mt-3 space-y-1.5 border-y border-border py-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/**
 * Vista de tarjetas para contactos.
 * Recibe la lista ya filtrada por búsqueda/cliente y pagina 12 por página.
 */
export function ContactCardGrid({ contacts, loading, onEdit, onDelete }) {
  const [page, setPage] = useState(1);
  const [viewContact, setViewContact] = useState(null);

  const handleCardKeyDown = (event, row) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setViewContact(row);
    }
  };

  const [prevContacts, setPrevContacts] = useState(contacts);
  if (contacts !== prevContacts) {
    setPage(1);
    setPrevContacts(contacts);
  }

  const totalPages = Math.max(1, Math.ceil(contacts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = contacts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const pageNumbers = [];
  let start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  for (let i = start; i <= end; i += 1) pageNumbers.push(i);

  const from = contacts.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, contacts.length);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No se encontraron contactos"
        description="Ajusta la búsqueda o cambia el filtro de cliente."
      />
    );
  }

  return (
    <div>
      <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pageData.map((row) => (
          <FadeInUp key={row.id} className="h-full">
            <Card
              className="flex h-full cursor-pointer flex-col transition-colors hover:border-blue-500/40"
              onClick={() => setViewContact(row)}
              onKeyDown={(event) => handleCardKeyDown(event, row)}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-label={`Ver información de ${row.name}`}
            >
              <CardContent className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                    <User className="h-4 w-4" />
                  </span>
                </div>
                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  {row.name}
                </p>

                <div className="space-y-1.5 border-y border-border py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-20 shrink-0 text-muted">Cliente</span>
                    <span className="truncate text-foreground">
                      {row.client_name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Factory className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-20 shrink-0 text-muted">Planta</span>
                    <span className="truncate text-foreground">
                      {row.plant_name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-20 shrink-0 text-muted">Departamento</span>
                    <span className="truncate text-foreground">
                      {row.department || "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-auto space-y-1 pt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-20 shrink-0 text-muted">Teléfono</span>
                    <span className="truncate text-foreground">
                      {row.phone || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-20 shrink-0 text-muted">Email</span>
                    <span className="truncate text-foreground">
                      {row.email || "—"}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(row);
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <Tooltip label="Eliminar">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(row);
                    }}
                    aria-label={`Eliminar ${row.name}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
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
          <span className="font-semibold text-foreground">{from}–{to}</span> de{" "}
          <span className="font-semibold text-foreground">{contacts.length}</span>{" "}
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

      {viewContact && (
        <Modal
          open={Boolean(viewContact)}
          onClose={() => setViewContact(null)}
          size="lg"
          title="Detalle de contacto"
          description="Información del contacto."
          footer={
            <>
              <Button variant="secondary" onClick={() => setViewContact(null)}>
                Cerrar
              </Button>
              <Button
                icon={Pencil}
                onClick={() => {
                  setViewContact(null);
                  onEdit(viewContact);
                }}
              >
                Editar
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <ReadonlyField label="Nombre y Apellido" icon={User}>
              {viewContact.name || "—"}
            </ReadonlyField>
            <ReadonlyField label="Cliente" icon={Building2}>
              {viewContact.client_name || "—"}
            </ReadonlyField>
            <ReadonlyField label="Planta" icon={Factory}>
              {viewContact.plant_name || "—"}
            </ReadonlyField>
            <ReadonlyField label="Departamento" icon={Briefcase}>
              {viewContact.department || "—"}
            </ReadonlyField>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label="Teléfono" icon={Phone}>
                {viewContact.phone || "—"}
              </ReadonlyField>
              <ReadonlyField label="Email" icon={Mail}>
                {viewContact.email || "—"}
              </ReadonlyField>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}