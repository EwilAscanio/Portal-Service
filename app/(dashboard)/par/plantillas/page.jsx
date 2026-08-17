"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { notify } from "@/lib/toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/Modal";
import { FadeInUp } from "@/components/ui/animated";
import { PAR_TEMPLATE_TYPE_VARIANTS } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { getParTemplates, deleteParTemplate } from "@/lib/api";

export default function ParTemplatesPage() {
  usePageTitle("Plantillas de PAR");
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getParTemplates();
      setRows(data);
    } catch (err) {
      notify.error("Error al cargar plantillas", {
        description: err.response?.data?.error || err.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      setDeleting(true);
      await deleteParTemplate(toDelete.id);
      setRows((current) => current.filter((r) => r.id !== toDelete.id));
      notify.success("Plantilla eliminada", {
        description: `"${toDelete.name}" fue eliminada.`,
      });
    } catch (err) {
      notify.error("Error al eliminar", {
        description: err.response?.data?.error || err.message,
      });
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Nombre",
      render: (row) => (
        <p className="font-semibold text-foreground">{row.name}</p>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (row) => (
        <StatusBadge status={row.type} variants={PAR_TEMPLATE_TYPE_VARIANTS} />
      ),
    },
    {
      key: "description",
      header: "Descripción",
      className: "hidden lg:table-cell max-w-72",
      render: (row) => (
        <p className="truncate text-muted">{row.description || "—"}</p>
      ),
    },
    {
      key: "item_count",
      header: "Ítems",
      className: "text-center",
      render: (row) => (
        <span className="font-medium text-muted">{row.item_count}</span>
      ),
    },
    {
      key: "updated_at",
      header: "Actualizada",
      className: "hidden md:table-cell",
      render: (row) => (
        <span className="whitespace-nowrap text-muted">
          {formatDate(row.updated_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      className: "w-24 text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={Pencil}
            onClick={() => router.push(`/par/plantillas/${row.id}`)}
            title="Editar plantilla"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => setToDelete(row)}
            title="Eliminar plantilla"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plantillas de PAR"
        description="Modelos reutilizables de ítems para armar un PAR rápidamente."
        actions={
          <Button icon={Plus} onClick={() => router.push("/par/plantillas/nueva")}>
            Nueva plantilla
          </Button>
        }
      />

      <FadeInUp>
        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={rows}
              loading={loading}
              searchPlaceholder="Buscar por nombre o tipo…"
              emptyTitle="No se encontraron plantillas"
              emptyDescription="Crea una plantilla para cargar sus ítems en los PARs."
            />
          </CardContent>
        </Card>
      </FadeInUp>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="¿Eliminar esta plantilla?"
        description={
          toDelete
            ? `La plantilla "${toDelete.name}" se eliminará junto con sus ítems. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
      />
    </div>
  );
}
