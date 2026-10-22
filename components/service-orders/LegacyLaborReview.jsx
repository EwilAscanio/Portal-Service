"use client";

import { useState } from "react";
import { useLaborBudget } from "@/hooks/useLaborBudget";
import { LaborAllocationEditor, validateLaborDistribution } from "@/components/service-orders/LaborAllocationEditor";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";

export function LegacyLaborReview({ order, saving, onSave, onClose }) {
  const labor = useLaborBudget(order.par_id, order.id);
  const [value, setValue] = useState([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    const problem = validateLaborDistribution(value, labor.loading ? null : labor.budget, { reviewing: true });
    if (problem || note.trim().length < 5) { setError(problem || "Explique cómo se distribuyeron las horas anteriores."); return; }
    await onSave({ reviewLabor: true, laborReviewNote: note.trim(), laborAllocations: value.map((row) => ({ ...row, hours: Number(row.hours) })) });
    labor.reload();
  };
  return <form onSubmit={submit} className="space-y-4">
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
      <p className="font-semibold">Revisión de horas anteriores · {order.order_code}</p>
      <p>Horas registradas anteriormente: {Number(order.legacy_worked_hours ?? order.worked_hours).toFixed(2)} h. Este valor se conservará en el historial.</p>
      <p>Distribuya las horas del PAR entre los técnicos registrados en esta orden. Si esta orden no debe consumir horas presupuestadas, deje la distribución vacía y explique el motivo. La revisión se registra con su usuario y fecha.</p>
    </div>
    <LaborAllocationEditor budget={labor.budget} loading={labor.loading} loadError={labor.error} reload={labor.reload} technicians={order.technicians || []} value={value} onChange={setValue} reviewing disabled={saving || labor.loading} error={error} />
    <Textarea label="Explicación de la revisión *" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} disabled={saving} />
    <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Volver</Button><Button type="submit" loading={saving} disabled={labor.loading || !labor.budget}>Guardar revisión</Button></div>
  </form>;
}
