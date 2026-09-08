"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { notify } from "@/lib/toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CatalogSearch } from "@/components/par/CatalogSearch";
import { PAR_TEMPLATE_TYPES } from "@/lib/status";
import { getProducts, createParTemplate, updateParTemplate, getParTemplateById } from "@/lib/api";
import { calculateLineTotalUsd, formatCurrencyUsd } from "@/utils/parCalc";

const itemRowSchema = z.object({
  itemNo: z.coerce.number().optional(),
  productId: z.string().optional().or(z.literal("")),
  descripcion: z.string().optional().or(z.literal("")),
  qty: z.string().optional().or(z.literal("")),
  categoria: z.string().optional().or(z.literal("")),
  ccn: z.string().optional().or(z.literal("")),
  usList: z.string().optional().or(z.literal("")),
  multiplicador: z.string().optional().or(z.literal("")),
  valorUnitUsd: z.string().optional().or(z.literal("")),
  valorPercent: z.string().optional().or(z.literal("")),
});

const templateFormSchema = z.object({
  type: z.enum(PAR_TEMPLATE_TYPES, { message: "Tipo inválido." }),
  name: z.string().min(1, "El nombre de la plantilla es obligatorio."),
  description: z.string().optional().or(z.literal("")),
  items: z.array(itemRowSchema).optional(),
});

function emptyItem(itemNo) {
  return {
    itemNo,
    productId: "",
    descripcion: "",
    qty: "",
    categoria: "Mano de Obra",
    ccn: "",
    usList: "",
    multiplicador: "1",
    valorUnitUsd: "",
    valorPercent: "",
  };
}

function toRow(item, index) {
  return {
    itemNo: item.item_no ?? index + 1,
    productId: item.product_id ?? "",
    descripcion: item.descripcion ?? "",
    qty: item.qty == null ? "" : String(item.qty),
    categoria: item.categoria ?? "",
    ccn: item.ccn ?? "",
    usList: item.us_list ?? "",
    multiplicador: item.multiplicador == null ? "1" : String(item.multiplicador),
    valorUnitUsd: item.valor_unit_usd == null ? "" : String(item.valor_unit_usd),
    valorPercent: item.valor_percent == null ? "" : String(item.valor_percent),
  };
}

export function ParTemplateForm({ templateId = null }) {
  usePageTitle(templateId ? "Editar plantilla" : "Nueva plantilla");
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      type: PAR_TEMPLATE_TYPES[0],
      name: "",
      description: "",
      items: [],
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = useWatch({ control: form.control, name: "items" }) ?? [];

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(Boolean(templateId));
  const [saving, setSaving] = useState(false);
  const [focusItemIndex, setFocusItemIndex] = useState(-1);

  useEffect(() => {
    let active = true;
    getProducts()
      .then((data) => {
        if (active) setProducts(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!templateId) return;
    let active = true;
    getParTemplateById(templateId)
      .then((tpl) => {
        if (!active) return;
        form.reset({
          type: PAR_TEMPLATE_TYPES.includes(tpl.type) ? tpl.type : PAR_TEMPLATE_TYPES[0],
          name: tpl.name,
          description: tpl.description ?? "",
          items: (tpl.items ?? []).map((item, index) => toRow(item, index)),
        });
      })
      .catch((err) => {
        if (!active) return;
        notify.error("Error al cargar plantilla", {
          description: err.response?.data?.error || err.message,
        });
        router.push("/par/plantillas");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial al montar
  }, [templateId]);

  const itemProducts = useMemo(
    () => products.filter((product) => product.type !== "Equipo"),
    [products]
  );

  function handleProductPick(index, product) {
    form.setValue(`items.${index}.productId`, product?.id ?? "");
    if (!product) return;
    if (product.description) {
      form.setValue(`items.${index}.descripcion`, product.description);
    }
    if (product.price) {
      form.setValue(`items.${index}.valorUnitUsd`, String(product.price));
    }
    form.setValue(
      `items.${index}.categoria`,
      product.category === "Servicio" ? "Mano de Obra" : "Repuestos y Consumibles"
    );
  }

  function addItem() {
    const index = itemFields.length;
    appendItem({ ...emptyItem(index + 1) }, { shouldFocus: false });
    setFocusItemIndex(index);
  }

  function buildPayload(values) {
    const itemsPayload = (values.items ?? [])
      .filter((item) => item.productId || (item.descripcion && item.descripcion.trim()))
      .map((item, index) => ({
        itemNo: index + 1,
        productId: item.productId || null,
        descripcion: item.descripcion.trim(),
        qty: item.qty === "" || item.qty == null ? null : Number(item.qty),
        categoria: item.categoria || null,
        ccn: item.ccn || null,
        usList: item.usList || null,
        multiplicador:
          item.multiplicador === "" || item.multiplicador == null
            ? 1
            : Number(item.multiplicador),
        valorUnitUsd:
          item.valorUnitUsd === "" || item.valorUnitUsd == null
            ? null
            : Number(item.valorUnitUsd),
        valorPercent: item.valorPercent === "" ? null : Number(item.valorPercent),
      }));

    return {
      type: values.type,
      name: values.name.trim(),
      description: values.description?.trim() || null,
      items: itemsPayload,
    };
  }

  async function handleSubmit(values) {
    try {
      setSaving(true);
      const payload = buildPayload(values);
      if (templateId) {
        await updateParTemplate(templateId, payload);
        notify.success("Plantilla actualizada", { description: `"${payload.name}" fue guardada.` });
      } else {
        await createParTemplate(payload);
        notify.success("Plantilla creada", { description: `"${payload.name}" fue guardada.` });
      }
      router.push("/par/plantillas");
    } catch (err) {
      notify.error("Error al guardar plantilla", {
        description: err.response?.data?.error || err.message,
      });
      setSaving(false);
    }
  }

  return (
    <form
      id="par-template-form"
      onSubmit={form.handleSubmit(handleSubmit)}
      noValidate
      className="space-y-6"
    >
      <PageHeader
        title={templateId ? "Editar plantilla" : "Nueva plantilla"}
        description="Modelo reutilizable de ítems para armar un PAR rápidamente."
        actions={
          <>
            <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/par/plantillas")}>
              Volver
            </Button>
            <Button type="submit" icon={Save} loading={saving}>
              Guardar plantilla
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Datos de la plantilla</CardTitle>
            <CardDescription>
              El tipo solo clasifica la plantilla; no se copia a los ítems del PAR.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 md:grid-cols-2">
            <Select
              label="Tipo"
              {...form.register("type")}
              options={PAR_TEMPLATE_TYPES.map((value) => ({ value, label: value }))}
            />
            <Input
              label="Nombre"
              placeholder="Ej: Reparación compresor GA-37"
              required
              error={form.formState.errors.name?.message}
              {...form.register("name")}
            />
            <Textarea
              className="md:col-span-2"
              label="Descripción"
              placeholder="Descripción opcional de la plantilla..."
              {...form.register("description")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex-1">
            <CardTitle>Ítems de la plantilla</CardTitle>
            <CardDescription>
              Repuestos, materiales y mano de obra que se copiarán al PAR al cargar la plantilla.
            </CardDescription>
          </div>
          <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={addItem}>
            Agregar ítem
          </Button>
        </CardHeader>
        <CardContent>
          {itemFields.length === 0 ? (
            <p className="text-sm text-muted">
              No hay ítems en esta plantilla. Agrega uno para comenzar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["N°", "Producto", "Descripción", "Cant.", "CCN", "US List", "Mult.", "$ Unit", "Valor %", "Total $", " "].map(
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
                          <div className="w-64">
                            <CatalogSearch
                              options={itemProducts}
                              value={item.productId}
                              onSelect={(product) => handleProductPick(index, product)}
                              label=""
                              placeholder="Buscar producto..."
                              getTitle={(product) => product.description || "—"}
                              getSubtitle={(product) =>
                                [product.code, product.category].filter(Boolean).join(" · ")
                              }
                              selectedTitle={(product) => product.code || "—"}
                              compact
                              autoFocus={index === focusItemIndex}
                              matches={(product, q) => {
                                const value = q.trim().toLowerCase();
                                return (
                                  (product.description &&
                                    product.description.toLowerCase().includes(value)) ||
                                  (product.code && product.code.toLowerCase().includes(value)) ||
                                  (product.brand && product.brand.toLowerCase().includes(value)) ||
                                  (product.type && product.type.toLowerCase().includes(value)) ||
                                  (product.category && product.category.toLowerCase().includes(value))
                                );
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="min-w-80 text-xs!"
                            placeholder="Descripción"
                            {...form.register(`items.${index}.descripcion`)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-16 text-xs!"
                            placeholder="0"
                            inputMode="numeric"
                            value={items[index]?.qty ?? ""}
                            onChange={(event) => {
                              const clean = event.target.value.replace(/[^\d]/g, "");
                              form.setValue(`items.${index}.qty`, clean);
                            }}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-14 text-xs!"
                            placeholder="—"
                            {...form.register(`items.${index}.ccn`)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-20 text-xs!"
                            placeholder="—"
                            {...form.register(`items.${index}.usList`)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-16 text-xs!"
                            placeholder="1"
                            {...form.register(`items.${index}.multiplicador`)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-20 text-xs!"
                            placeholder="0.00"
                            {...form.register(`items.${index}.valorUnitUsd`)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-16 text-xs!"
                            placeholder="0"
                            {...form.register(`items.${index}.valorPercent`)}
                          />
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrencyUsd(calculateLineTotalUsd(item))}
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
    </form>
  );
}
