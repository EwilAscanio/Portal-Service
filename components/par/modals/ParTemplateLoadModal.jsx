import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { PAR_TEMPLATE_TYPES } from "@/lib/status";

export function ParTemplateLoadModal({
  open,
  onClose,
  loading,
  loadType,
  setLoadType,
  loadTargetId,
  setLoadTargetId,
  templates,
  onLoad,
}) {
  const filteredTemplates = templates.filter(
    (template) => loadType === "Todos" || template.type === loadType
  );

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      title="Cargar plantilla"
      description="Agrega los ítems de una plantilla al final de este PAR."
      size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onLoad} loading={loading} disabled={!loadTargetId}>
            Cargar ítems
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <Select
          label="Filtrar por tipo"
          value={loadType}
          onChange={(event) => {
            setLoadType(event.target.value);
            setLoadTargetId("");
          }}
          options={[
            { value: "Todos", label: "Todos los tipos" },
            ...PAR_TEMPLATE_TYPES.map((value) => ({ value, label: value })),
          ]}
        />
        <Select
          label="Plantilla"
          value={loadTargetId}
          onChange={(event) => setLoadTargetId(event.target.value)}
        >
          <option value="" disabled>Seleccione una plantilla…</option>
          {filteredTemplates.map((template) => (
            <option key={template.id} value={String(template.id)}>
              {template.name} ({template.item_count} ítems)
            </option>
          ))}
        </Select>
        {filteredTemplates.length === 0 && (
          <p className="text-sm text-muted">
            No hay plantillas de este tipo. Crea una desde el módulo de plantillas.
          </p>
        )}
      </div>
    </Modal>
  );
}
