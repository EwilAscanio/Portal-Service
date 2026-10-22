"use client";

import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CatalogSearch } from "@/components/par/CatalogSearch";

export function ParEquipmentSection({ isLocked, equipmentFields, appendEquipment, removeEquipment, setFocusEquipIndex, clientEquipment, form, handleEquipmentChange, clientId, focusEquipIndex, lockedInputClass }) {
  return (
    <>
      {/* Equipos */}
      <Card>
        <CardHeader>
          <div className="flex-1">
            <CardTitle>Equipos</CardTitle>
            <CardDescription>
              {isLocked
                ? "Datos del equipo (solo lectura)."
                : "Seleccione el equipo del inventario del cliente y complemente sus datos."}
            </CardDescription>
          </div>
          {isLocked && (
            <span className="inline-flex items-center rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
              Solo lectura
            </span>
          )}
          {!isLocked && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={Plus}
            onClick={() => {
              const nextIndex = equipmentFields.length;
              appendEquipment(
                {
                  itemNo: equipmentFields.length + 1,
                  isMain: equipmentFields.length === 0,
                  equipmentId: "",
                  tipo: "",
                  marca: "",
                  serial: "",
                  modelo: "",
                  observaciones: "",
                },
                { shouldFocus: false }
              );
              setFocusEquipIndex(nextIndex);
            }}
          >
            Agregar equipo
          </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {equipmentFields.length === 0 && (
            <p className="text-sm text-muted">No hay equipos registrados en este PAR.</p>
          )}
          {equipmentFields.map((field, index) => (
            <div key={field.id} className="rounded-2xl border border-border bg-surface-2/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Equipo {index + 1}
                  {index === 0 ? " · Principal" : ""}
                </p>
                {equipmentFields.length > 1 && !isLocked && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    onClick={() => removeEquipment(index)}
                    title="Quitar equipo"
                  />
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <CatalogSearch
                  options={clientEquipment}
                  value={form.watch(`equipment.${index}.equipmentId`)}
                  onSelect={(equipment) => handleEquipmentChange(index, equipment)}
                  disabled={isLocked || !clientId}
                  label="Equipo instalado"
                  autoFocus={index === focusEquipIndex}
                />
                <Input
                  label="Tipo"
                  placeholder="COMPRESOR"
                  disabled={isLocked}
                  className={isLocked ? lockedInputClass : undefined}
                  {...form.register(`equipment.${index}.tipo`)}
                />
                <Input
                  label="Marca"
                  placeholder="INGERSOLL RAND"
                  disabled={isLocked}
                  className={isLocked ? lockedInputClass : undefined}
                  {...form.register(`equipment.${index}.marca`)}
                />
                <Input
                  label="Serial"
                  placeholder="IR998231"
                  disabled={isLocked}
                  className={isLocked ? lockedInputClass : undefined}
                  {...form.register(`equipment.${index}.serial`)}
                />
                <Input
                  label="Modelo"
                  placeholder="NIRVANA 150"
                  disabled={isLocked}
                  className={isLocked ? lockedInputClass : undefined}
                  {...form.register(`equipment.${index}.modelo`)}
                />
              </div>
              <div className="mt-4">
                <Textarea
                  label="Descripción del trabajo a realizar *"
                  placeholder="Alcance del trabajo, petición de oferta, calibraciones..."
                  disabled={isLocked}
                  {...form.register(`equipment.${index}.observaciones`)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

    </>
  );
}
