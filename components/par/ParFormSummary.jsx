import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ParFormSummary({ variant, totals, form, loading, submitLabel, isLocked = false }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{variant === "full" ? "Resumen y firmas" : "Resumen"}</CardTitle>
          <CardDescription>Totales calculados según la tasa vigente.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface-2/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total de horas presupuestadas</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{totals.hours} h</p>
            <p className="text-xs text-muted">Cantidad de los renglones de mano de obra.</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total USD</p>
            <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{totals.usd}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Bs.</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totals.bs}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Tasa vigente</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{totals.rate}</p>
          </div>
        </div>
        {variant === "full" && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Input label="Elaborado por" readOnly placeholder="Nombre de quien elabora" {...form.register("elaboradoPor")} />
          </div>
        )}
        <div className="mt-6 flex justify-end">
          {!isLocked && <Button type="submit" loading={loading}>{submitLabel}</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
