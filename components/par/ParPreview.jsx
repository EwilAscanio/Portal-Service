import { parPurposeLabel } from "@/lib/warranty";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PAR_STATUS_VARIANTS } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { formatCurrencyUsd, formatCurrencyBs, formatNumber } from "@/utils/parCalc";
import { cn } from "@/utils/cn";

export function ParPreview({ par, className }) {
  const items = par.items ?? [];
  const equipment = par.equipment ?? [];
  const totalUsd = Number(par.total_usd || 0);
  const totalBs = Number(par.total_bs || 0);

  return (
    <Card className={cn("mx-auto w-full max-w-4xl overflow-hidden", className)}>
      <p className="my-2 text-sm font-semibold">{parPurposeLabel(par.purpose)}{par.purpose === "ReferenciaGarantia" ? " · Sin importe comercial ni horas cotizadas" : ""}{Number(par.warranty_open_orders)>0 ? ` · ${par.warranty_open_orders} garantías abiertas` : ""}</p>
      {/* Encabezado del documento */}
      <div className="border-b border-border bg-surface-2/50 px-4 py-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Maquitech · C.A.
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
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

      <div className="space-y-6 break-words px-4 py-6 sm:px-8">
        {/* Cliente */}
        <div className="grid gap-4 sm:grid-cols-2 [&>div]:min-w-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Cliente</p>
            <p className="font-medium text-foreground">{par.client_name}</p>
            <p className="text-sm text-muted">{par.client_code}</p>
          </div>
          <div className="grid gap-4 min-[400px]:grid-cols-2 [&>div]:min-w-0">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Contacto</p>
              <p className="text-sm text-foreground">{par.contact_name || "—"}</p>
              <p className="text-xs text-muted">{par.contact_phone || par.contact_email || ""}</p>
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

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Planta</p>
          <p className="font-medium text-foreground">{par.plant_name || "—"}</p>
          <p className="text-sm text-muted">{par.plant_address || ""}</p>
        </div>

        {/* El trabajo pertenece al snapshot de cada equipo (observaciones), no a la cabecera. */}
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Equipos y trabajos a realizar
          </h3>
          <div className="space-y-4">
            {equipment.map((eq, index) => (
              <section key={eq.id ?? index} className="overflow-hidden rounded-xl border border-border">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-2/60 px-4 py-3">
                  <h4 className="min-w-0 text-sm font-semibold text-foreground">
                    Equipo N° {eq.item_no ?? index + 1} · {eq.tipo || "Tipo no registrado"}
                  </h4>
                  {eq.is_main && (
                    <span className="rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                      Principal
                    </span>
                  )}
                </div>
                <dl className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-3 [&>div]:min-w-0">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Marca</dt>
                    <dd className="mt-1 text-foreground">{eq.marca || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Serial</dt>
                    <dd className="mt-1 text-foreground">{eq.serial || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Modelo</dt>
                    <dd className="mt-1 text-foreground">{eq.modelo || "—"}</dd>
                  </div>
                </dl>
                <div className="border-t border-border bg-surface-2/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Trabajo a realizar
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
                    {eq.observaciones?.trim() ? eq.observaciones : "Sin trabajo a realizar registrado."}
                  </p>
                </div>
              </section>
            ))}
            {equipment.length === 0 && (
              <p className="text-sm text-muted">Sin equipos registrados.</p>
            )}
          </div>
        </section>

        {/* Ítems */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Productos adicionales y mano de obra
          </h3>
          <div
            role="region"
            aria-label="Productos adicionales y mano de obra"
            tabIndex={0}
            className="overflow-x-auto rounded-xl border border-border"
          >
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
          <div className="mb-3 rounded border border-current/20 p-3 text-sm"><strong>Total de horas presupuestadas: {Number(par.budgeted_hours || 0).toFixed(2)} h</strong><p className="text-xs">Suma de cantidades de mano de obra; horas compartidas entre técnicos.</p></div>
        <div className="flex flex-wrap justify-end gap-4">
          <div className="min-w-40 rounded-xl border border-border bg-surface-2/50 px-5 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Subtotal USD</p>
            <p className="text-xl font-bold">{formatCurrencyUsd(par.subtotal_usd)}</p>
          </div>
          <div className="min-w-40 rounded-xl border border-border bg-surface-2/50 px-5 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Descuento ({formatNumber(par.discount_percent)} %)</p>
            <p className="text-xl font-bold">− {formatCurrencyUsd(par.discount_amount_usd)}</p>
          </div>
          <div className="min-w-40 rounded-xl border border-border bg-surface-2/50 px-5 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total final USD</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrencyUsd(totalUsd)}
            </p>
          </div>
          <div className="min-w-40 rounded-xl border border-border bg-surface-2/50 px-5 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total final Bs.</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrencyBs(totalBs)}
            </p>
          </div>
        </div>

        {/* Firmas */}
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-foreground">{par.elaborado_por || par.created_by_name || "—"}</p>
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
