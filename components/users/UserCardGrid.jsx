"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  Mail,
  Pencil,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { Stagger, FadeInUp } from "@/components/ui/animated";
import { formatDate } from "@/lib/format";
import { ROLE_BADGE } from "@/lib/status";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 12;

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
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  );
}

/**
 * Vista de tarjetas para usuarios.
 * Recibe la lista ya filtrada y pagina 12 por página.
 */
export function UserCardGrid({
  users,
  loading,
  onView,
  onEdit,
  onToggleStatus,
}) {
  const [page, setPage] = useState(1);

  const [prevUsers, setPrevUsers] = useState(users);
  if (users !== prevUsers) {
    setPage(1);
    setPrevUsers(users);
  }

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = users.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const pageNumbers = [];
  let start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  for (let i = start; i <= end; i += 1) pageNumbers.push(i);

  const from = users.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, users.length);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No se encontraron usuarios"
        description="Crea el primer usuario para comenzar."
      />
    );
  }

  const handleKeyDown = (event, user) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onView(user);
    }
  };

  return (
    <div>
      <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pageData.map((user) => (
          <FadeInUp key={user.id} className="h-full">
            <Card
              className="flex h-full cursor-pointer flex-col transition-colors hover:border-blue-500/40"
              onClick={() => onView(user)}
              onKeyDown={(event) => handleKeyDown(event, user)}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-label={`Ver información de ${user.name}`}
            >
              <CardContent className="flex flex-1 flex-col gap-2 p-4">
                {/* Header: login + estado */}
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-7 items-center rounded-lg bg-blue-500/10 px-2 font-mono text-[11px] font-bold text-blue-600 ring-1 ring-inset ring-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400">
                    {user.login}
                  </span>
                  <Badge
                    variant={user.status === "Activo" ? "success" : "danger"}
                    dot
                  >
                    {user.status}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  {user.name}
                </p>

                {/* Detalles */}
                <div className="space-y-1.5 border-y border-border py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">Rol</span>
                    <Badge variant={ROLE_BADGE[user.role] || "neutral"}>
                      {user.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">Correo</span>
                    <span className="truncate font-medium text-foreground">
                      {user.email || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="w-14 shrink-0 text-muted">Acceso</span>
                    <span className="truncate font-medium text-foreground">
                      {user.last_access_at
                        ? formatDate(user.last_access_at)
                        : "—"}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(user);
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <Tooltip
                  label={user.status === "Activo" ? "Desactivar" : "Activar"}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleStatus(user);
                    }}
                    aria-label={
                      user.status === "Activo"
                        ? `Desactivar ${user.name}`
                        : `Activar ${user.name}`
                    }
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-colors hover:bg-surface-2",
                      user.status === "Activo"
                        ? "hover:text-red-600 dark:hover:text-red-400"
                        : "hover:text-emerald-600 dark:hover:text-emerald-400"
                    )}
                  >
                    {user.status === "Activo" ? (
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
            {users.length}
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
    </div>
  );
}
