"use client";

import { Plus, Trash2, LayoutTemplate } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CatalogSearch } from "@/components/par/CatalogSearch";
import { calculateLineTotalUsd, calculateLineTotalBs, formatCurrencyUsd, formatCurrencyBs } from "@/utils/parCalc";
import { DEFAULT_PRODUCT_CATEGORY } from "@/lib/par/constants";

export function ParItemsSection({ itemFields, appendItem, removeItem, setFocusItemIndex, items, itemProducts, form, handleProductPick, focusItemIndex, exchangeRate, setLoadOpen }) {
  return (
    <>
      {/* Productos adicionales / Mano de obra */}
      <Card>
        <CardHeader>
          <div className="flex-1">
            <CardTitle>Productos adicionales y mano de obra</CardTitle>
            <CardDescription>
              Ítems de repuestos, materiales y servicios. Los conceptos de mano de obra
              se identifican en el catálogo con «Requiere técnico». Su cantidad indica
              las horas totales a repartir, independientemente del multiplicador.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={LayoutTemplate}
            onClick={() => setLoadOpen(true)}
          >
            Cargar plantilla
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={Plus}
            onClick={() => {
              const nextIndex = itemFields.length;
              appendItem(
                {
                  itemNo: itemFields.length + 1,
                  productId: "",
                  descripcion: "",
                  qty: "",
                  categoria: DEFAULT_PRODUCT_CATEGORY,
                  ccn: "",
                  usList: "",
                  multiplicador: "1",
                  valorUnitUsd: "",
                  valorPercent: "",
                },
                { shouldFocus: false }
              );
              setFocusItemIndex(nextIndex);
            }}
          >
            Agregar ítem
          </Button>
        </CardHeader>
        <CardContent>
          {itemFields.length === 0 ? (
            <p className="text-sm text-muted">No hay ítems registrados en este PAR.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["N°", "Producto", "Descripción", "Cant.", "CCN", "US List", "Mult.", "$ Unit", "Valor %", "Total $", "Total Bs.", " "].map(
                      (header, idx) => (
                        <th
                          key={idx}
                          className="whitespace-nowrap px-2 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted"
                        >
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {itemFields.map((field, index) => {
                    const item = items[index] ?? {};
                    return (
                      <tr key={field.id} className="border-b border-border/60 align-middle last:border-0">
                        <td className="px-2 py-2 text-muted">{index + 1}</td>
                        <td className="px-2 py-2">
                          <div className="w-56">
                            <CatalogSearch
                              options={itemProducts}
                              value={form.watch(`items.${index}.productId`)}
                              onSelect={(product) => handleProductPick(index, product)}
                              label=""
                              placeholder="Buscar producto..."
                              autoFocus={index === focusItemIndex}
                              getTitle={(product) => product.description || "—"}
                              getSubtitle={(product) =>
                                [product.code, product.category, product.requires_technician ? "Mano de obra · horas" : ""].filter(Boolean).join(" · ")
                              }
                              selectedTitle={(product) => product.code || "—"}
                              compact
                              matches={(product, q) => {
                                const value = q.trim().toLowerCase();
                                return (
                                  (product.description &&
                                    product.description.toLowerCase().includes(value)) ||
                                  (product.code && product.code.toLowerCase().includes(value)) ||
                                  (product.brand && product.brand.toLowerCase().includes(value)) ||
                                  (product.category && product.category.toLowerCase().includes(value)) ||
                                  (product.category && product.category.toLowerCase().includes(value))
                                );
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-72! text-xs!"
                            placeholder="Descripción"
                            {...form.register(`items.${index}.descripcion`)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-16! text-xs!"
                            placeholder="0"
                            type="number"
                            min="0"
                            step="0.01"
                            value={items[index]?.qty ?? ""}
                            onChange={(event) => {
                              form.setValue(`items.${index}.qty`, event.target.value);
                            }}
                          />
                          {item.requiresTechnician && <span className="text-xs text-blue-600">Horas</span>}
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-14! text-xs!"
                            placeholder="—"
                            {...form.register(`items.${index}.ccn`)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-20! text-xs!"
                            placeholder="—"
                            {...form.register(`items.${index}.usList`)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-16! text-xs!"
                            placeholder="1"
                            inputMode="decimal"
                            value={items[index]?.multiplicador ?? ""}
                            onChange={(event) => {
                              const clean = event.target.value
                                .replace(/[^\d.]/g, "")
                                .replace(/(\..*)\./g, "$1")
                                .replace(/\.(\d{2})\d+/g, ".$1");
                              form.setValue(`items.${index}.multiplicador`, clean);
                            }}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-20! text-xs!"
                            placeholder="0.00"
                            {...form.register(`items.${index}.valorUnitUsd`)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-16! text-xs!"
                            placeholder="0"
                            inputMode="decimal"
                            value={items[index]?.valorPercent ?? ""}
                            onChange={(event) => {
                              const clean = event.target.value
                                .replace(/[^\d.]/g, "")
                                .replace(/(\..*)\./g, "$1")
                                .replace(/\.(\d{2})\d+/g, ".$1");
                              form.setValue(`items.${index}.valorPercent`, clean);
                            }}
                          />
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrencyUsd(calculateLineTotalUsd(item))}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrencyBs(calculateLineTotalBs(item, Number(exchangeRate) || 0))}
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            icon={Trash2}
                            onClick={() => removeItem(index)}
                            title="Quitar ítem"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </>
  );
}
