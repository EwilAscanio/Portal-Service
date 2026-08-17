import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PAR_STATUS_VARIANTS } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { formatCurrencyUsd, formatCurrencyBs, formatNumber } from "@/utils/parCalc";
import { calculateLineTotalUsd } from "@/utils/parCalc";

export function ParPreview({ par }) {
  const items = par.items ?? [];
  const equipment = par.equipment ?? [];
  const totalUsd = items.reduce((sum, item) => sum + Number(item.line_total_usd || 0), 0);
  const totalBs = Number(par.total_bs || 0);

  return (
    <Card className="mx-auto max-w-4xl overflow-hidden">
      {/* Encabezado del documento */}
      <div className="border-b border-border bg-surface-2/50 px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Maquitech · C.A.
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              PLANILLA DE ATENCIÓN DE REQUISICIONES
            </h2>
            <p className="mt-1 text-sm text-muted">
              PAR N°{" "}
              <span className="font-semibold text-foreground underline">
                {par.par_number}
              </span>
            </p>
          </div>
          <div className="text-right">
            <StatusBadge status={par.display_status ?? par.status} variants={PAR_STATUS_VARIANTS} />
            <p className="mt-2 text-xs text-muted">
              Emitido el {formatDate(par.fecha_emision || par.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-8 py-6">
        {/* Cliente */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Cliente</p>
            <p className="font-medium text-foreground">{par.client_name}</p>
            <p className="text-sm text-muted">{par.client_code}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Atención</p>
              <p className="text-sm text-foreground">{par.atencion || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Tasa vigente
              </p>
              <p className="text-sm font-semibold text-foreground">
                Bs. {formatNumber(par.exchange_rate)}
              </p>
            </div>
          </div>
        </div>

        {/* Equipos */}
        {equipment.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
              Equipos
            </h3>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2/60">
                  <tr className="text-xs uppercase tracking-wider text-muted">
                    <th className="px-4 py-2.5 font-semibold">N°</th>
                    <th className="px-4 py-2.5 font-semibold">Tipo</th>
                    <th className="px-4 py-2.5 font-semibold">Marca</th>
                    <th className="px-4 py-2.5 font-semibold">Serial</th>
                    <th className="px-4 py-2.5 font-semibold">Modelo</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((eq, index) => (
                    <tr key={eq.id ?? index} className="border-t border-border/60">
                      <td className="px-4 py-2.5 text-muted">{eq.item_no ?? index + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{eq.tipo || "—"}</td>
                      <td className="px-4 py-2.5 text-foreground/90">{eq.marca || "—"}</td>
                      <td className="px-4 py-2.5 text-foreground/90">{eq.serial || "—"}</td>
                      <td className="px-4 py-2.5 text-foreground/90">{eq.modelo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {equipment.some((eq) => eq.observaciones) && (
                <div className="border-t border-border bg-surface-2/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Observaciones
                  </p>
                  {equipment
                    .filter((eq) => eq.observaciones)
                    .map((eq, index) => (
                      <p key={index} className="mt-1 text-sm text-foreground/90">
                        {eq.observaciones}
                      </p>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ítems */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Productos adicionales y mano de obra
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-surface-2/60">
                <tr className="text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-2.5 font-semibold">N°</th>
                  <th className="px-4 py-2.5 font-semibold">Descripción</th>
                  <th className="px-4 py-2.5 font-semibold">Cant.</th>
                  <th className="px-4 py-2.5 font-semibold">Categoría</th>
                  <th className="px-4 py-2.5 font-semibold">CCN</th>
                  <th className="px-4 py-2.5 font-semibold">US List</th>
                  <th className="px-4 py-2.5 font-semibold">Mult.</th>
                  <th className="px-4 py-2.5 font-semibold">$ Unit</th>
                  <th className="px-4 py-2.5 font-semibold">Valor %</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Total $</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Total Bs.</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id ?? index} className="border-t border-border/60">
                    <td className="px-4 py-2.5 text-muted">{item.item_no ?? index + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {item.descripcion}
                    </td>
                    <td className="px-4 py-2.5 text-foreground/90">{formatNumber(item.qty)}</td>
                    <td className="px-4 py-2.5 text-foreground/90">{item.categoria || "—"}</td>
                    <td className="px-4 py-2.5 text-foreground/90">{item.ccn || "—"}</td>
                    <td className="px-4 py-2.5 text-foreground/90">{item.us_list || "—"}</td>
                    <td className="px-4 py-2.5 text-foreground/90">
                      {formatNumber(item.multiplicador)}
                    </td>
                    <td className="px-4 py-2.5 text-foreground/90">
                      {formatCurrencyUsd(item.valor_unit_usd)}
                    </td>
                    <td className="px-4 py-2.5 text-foreground/90">
                      {item.valor_percent == null ? "—" : `${formatNumber(item.valor_percent)}%`}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrencyUsd(item.line_total_usd)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrencyBs(
                        Number(item.line_total_usd || 0) * Number(par.exchange_rate || 0)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totales */}
        <div className="flex flex-wrap justify-end gap-4">
          <div className="min-w-40 rounded-xl border border-border bg-surface-2/50 px-5 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total USD</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrencyUsd(totalUsd)}
            </p>
          </div>
          <div className="min-w-40 rounded-xl border border-border bg-surface-2/50 px-5 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Bs.</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrencyBs(totalBs)}
            </p>
          </div>
        </div>

        {/* Firmas */}
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-foreground">{par.elaborado_por || "—"}</p>
            <div className="mt-1 border-t-2 border-dashed border-border pt-1">
              <p className="text-xs uppercase tracking-wider text-muted">Elaborado por</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{par.approved_by_name || "—"}</p>
            <div className="mt-1 border-t-2 border-dashed border-border pt-1">
              <p className="text-xs uppercase tracking-wider text-muted">Aprobado por</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
