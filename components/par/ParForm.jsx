"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, LayoutTemplate } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ClientSearch } from "@/components/ui/ClientSearch";
import { CatalogSearch } from "@/components/par/CatalogSearch";
import { notify } from "@/lib/toast";
import {
  getClients,
  getProducts,
  getEquipment,
  getConfiguration,
  getParTemplates,
  getParTemplateById,
} from "@/lib/api";
import { PAR_TEMPLATE_TYPES } from "@/lib/status";
import {
  parHeaderSchema,
} from "@/lib/validators";
import { calculateLineTotalUsd, calculateLineTotalBs, formatCurrencyUsd, formatCurrencyBs } from "@/utils/parCalc";

const equipmentRowSchema = z.object({
  itemNo: z.coerce.number().optional(),
  isMain: z.boolean().optional(),
  equipmentId: z.string().optional().or(z.literal("")),
  tipo: z.string().optional().or(z.literal("")),
  marca: z.string().optional().or(z.literal("")),
  serial: z.string().optional().or(z.literal("")),
  modelo: z.string().optional().or(z.literal("")),
  observaciones: z.string().optional().or(z.literal("")),
});

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

const formSchema = z.object({
  clientId: z.string().min(1, "Seleccione un cliente."),
  atencion: z.string().optional().or(z.literal("")),
  fechaEmision: z.string().optional().or(z.literal("")),
  exchangeRate: z.string().optional().or(z.literal("")),
  observations: z.string().optional().or(z.literal("")),
  elaboradoPor: z.string().optional().or(z.literal("")),
  equipment: z.array(equipmentRowSchema).optional(),
  items: z.array(itemRowSchema).optional(),
});

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/60 transition-colors duration-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15";

const FIELD_LABELS = {
  clientId: "Cliente",
  atencion: "Atención",
  fechaEmision: "Fecha de emisión",
  exchangeRate: "Tasa vigente",
  observations: "Observaciones",
  elaboradoPor: "Elaborado por",
  tipo: "Tipo",
  marca: "Marca",
  serial: "Serial",
  modelo: "Modelo",
  observaciones: "Observaciones del equipo",
  equipmentId: "Equipo (catálogo)",
  productId: "Producto",
  descripcion: "Descripción",
  qty: "Cantidad",
  categoria: "Categoría",
  ccn: "CCN",
  usList: "US List",
  multiplicador: "Multiplicador",
  valorUnitUsd: "Valor unitario $",
  valorPercent: "Valor %",
  itemNo: "N°",
  isMain: "Equipo principal",
};

function formatIssues(issues) {
  return issues
    .map((issue) => {
      const [section, index, field] = issue.path;
      let label;
      if (section === "equipment" || section === "items") {
        const prefix = section === "equipment" ? "Equipo" : "Ítem";
        label = `${prefix} ${Number(index) + 1} · ${FIELD_LABELS[field] || field}`;
      } else {
        label = FIELD_LABELS[section] || section;
      }
      return `• ${label}: ${issue.message}`;
    })
    .join("\n");
}

export function ParForm({
  formId,
  defaultValues,
  onSubmit,
  loading,
  submitLabel,
  variant = "full",
}) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const { fields: equipmentFields, append: appendEquipment, remove: removeEquipment } =
    useFieldArray({ control: form.control, name: "equipment" });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { data: session } = useSession();

  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const exchangeRate = form.watch("exchangeRate") || "0";

  const totals = useMemo(() => {
    const totalUsd = items.reduce((sum, item) => sum + calculateLineTotalUsd(item), 0);
    const rate = Number(exchangeRate) || 0;
    return { totalUsd, totalBs: Number((totalUsd * rate).toFixed(2)) };
  }, [items, exchangeRate]);

  const { clients, productCatalog } = useCatalogs();
  const [clientEquipment, setClientEquipment] = useState([]);

  const [templates, setTemplates] = useState([]);
  const [loadOpen, setLoadOpen] = useState(false);
  const [loadType, setLoadType] = useState("Todos");
  const [loadTargetId, setLoadTargetId] = useState("");
  const [loadingLoad, setLoadingLoad] = useState(false);
  const [focusEquipIndex, setFocusEquipIndex] = useState(-1);
  const [focusItemIndex, setFocusItemIndex] = useState(-1);

  useEffect(() => {
    let active = true;
    getParTemplates()
      .then((data) => {
        if (active) setTemplates(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loadOpen) return;
    const filtered = templates.filter(
      (template) => loadType === "Todos" || template.type === loadType
    );
    if (filtered.length === 1) {
      setLoadTargetId(String(filtered[0].id));
    } else {
      setLoadTargetId("");
    }
  }, [loadOpen, templates, loadType]);

  async function handleLoadTemplate() {
    if (!loadTargetId) {
      notify.error("Selecciona una plantilla", {
        description: "Elige una plantilla para cargar sus ítems.",
      });
      return;
    }
    try {
      setLoadingLoad(true);
      const tpl = await getParTemplateById(Number(loadTargetId));
      const newItems = (tpl.items ?? []).map((item, i) => ({
        itemNo: itemFields.length + i + 1,
        productId: item.product_id ?? "",
        descripcion: item.descripcion ?? "",
        qty: item.qty == null ? "" : String(item.qty),
        categoria: item.categoria ?? "Mano de Obra",
        ccn: item.ccn ?? "",
        usList: item.us_list ?? "",
        multiplicador: item.multiplicador == null ? "1" : String(item.multiplicador),
        valorUnitUsd: item.valor_unit_usd == null ? "" : String(item.valor_unit_usd),
        valorPercent: item.valor_percent == null ? "" : String(item.valor_percent),
      }));
      newItems.forEach((item) => appendItem(item, { shouldFocus: false }));
      notify.success("Plantilla cargada", {
        description: `${newItems.length} ítems agregados desde "${tpl.name}".`,
      });
      setLoadOpen(false);
      setLoadTargetId("");
    } catch (err) {
      notify.error("Error al cargar plantilla", {
        description: err.response?.data?.error || err.message,
      });
    } finally {
      setLoadingLoad(false);
    }
  }

  useEffect(() => {
    const name = session?.user?.name;
    if (name && !form.getValues("elaboradoPor")) {
      form.setValue("elaboradoPor", name);
    }
  }, [session, form]);

  const clientId = form.watch("clientId");
  const prevClientIdRef = useRef(clientId);
  const clientCode = useMemo(
    () => clients.find((client) => client.id === clientId)?.codclie ?? "",
    [clients, clientId]
  );

  useEffect(() => {
    const prev = prevClientIdRef.current;
    prevClientIdRef.current = clientId;

    if (!clientId) {
      setClientEquipment([]);
      return undefined;
    }

    let active = true;
    getEquipment({ clientId })
      .then((data) => {
        if (!active) return;
        setClientEquipment(data);
        if (prev && prev !== clientId) {
          const ids = new Set(data.map((row) => row.id));
          const rows = form.getValues("equipment") ?? [];
          rows.forEach((row, index) => {
            if (row.equipmentId && !ids.has(row.equipmentId)) {
              form.setValue(`equipment.${index}.equipmentId`, "");
              form.setValue(`equipment.${index}.tipo`, "");
              form.setValue(`equipment.${index}.marca`, "");
              form.setValue(`equipment.${index}.serial`, "");
              form.setValue(`equipment.${index}.modelo`, "");
            }
          });
        }
      })
      .catch(() => {
        if (active) setClientEquipment([]);
      });
    return () => {
      active = false;
    };
  }, [clientId, form]);

  useEffect(() => {
    let active = true;
    getConfiguration()
      .then((config) => {
        if (!active) return;
        const rate = config?.exchange_rate;
        if (rate != null && Number(rate) > 0) {
          const current = form.getValues("exchangeRate");
          if (current === "" || Number(current) === 0) {
            form.setValue("exchangeRate", String(rate));
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefill único al montar
  }, []);

  const itemProducts = useMemo(
    () => productCatalog.filter((product) => product.type !== "Equipo"),
    [productCatalog]
  );

  function handleEquipmentChange(index, equipment) {
    form.setValue(`equipment.${index}.equipmentId`, equipment?.id ?? "");
    if (equipment) {
      form.setValue(`equipment.${index}.tipo`, equipment.name || "");
      form.setValue(`equipment.${index}.marca`, equipment.brand || "");
      form.setValue(`equipment.${index}.serial`, equipment.serial || "");
      form.setValue(`equipment.${index}.modelo`, equipment.model || "");
    }
  }

  function handleProductPick(index, product) {
    form.setValue(`items.${index}.productId`, product?.id ?? "");
    if (product) {
      form.setValue(`items.${index}.descripcion`, product.description || "");
      form.setValue(`items.${index}.valorUnitUsd`, product.price?.toString() || "");
      form.setValue(
        `items.${index}.categoria`,
        product.category === "Servicio" ? "Mano de Obra" : "Repuestos y Consumibles"
      );
    }
  }

  function cleanPayload(values) {
    const equipment = (values.equipment ?? [])
      .filter(
        (eq) =>
          eq.equipmentId ||
          eq.tipo ||
          eq.marca ||
          eq.serial ||
          eq.modelo ||
          eq.observaciones
      )
      .map((eq, index) => ({
        itemNo: index + 1,
        isMain: index === 0,
        equipmentId: eq.equipmentId || null,
        tipo: eq.tipo || null,
        marca: eq.marca || null,
        serial: eq.serial || null,
        modelo: eq.modelo || null,
        observaciones: eq.observaciones || null,
      }));

    const items = (values.items ?? [])
      .filter((item) => item.productId || (item.descripcion && item.descripcion.trim()))
      .map((item, index) => ({
        itemNo: index + 1,
        productId: item.productId || null,
        descripcion: item.descripcion.trim(),
        qty: item.qty === "" || item.qty == null ? null : Number(item.qty),
        categoria: item.categoria || null,
        ccn: item.ccn || null,
        usList: item.usList || null,
        multiplicador: item.multiplicador === "" || item.multiplicador == null
          ? 1
          : Number(item.multiplicador),
        valorUnitUsd:
          item.valorUnitUsd === "" || item.valorUnitUsd == null
            ? null
            : Number(item.valorUnitUsd),
        valorPercent: item.valorPercent === "" ? null : Number(item.valorPercent),
      }));

    return {
      clientId: values.clientId,
      atencion: values.atencion || null,
      fechaEmision: values.fechaEmision || null,
      exchangeRate: Number(values.exchangeRate) || 0,
      observations: values.observations || null,
      elaboradoPor: values.elaboradoPor || null,
      equipment,
      items,
    };
  }

  function handleSubmit(values) {
    const payload = cleanPayload(values);
    const parsed = parHeaderSchema.safeParse(payload);
    if (!parsed.success) {
      const details = formatIssues(parsed.error.issues);
      notify.error("Datos inválidos", {
        description: details || "Revise los campos del formulario.",
      });
      return;
    }
    onSubmit(payload);
  }

  const isLocked = variant === "items";
  const lockedInputClass = "bg-surface-2/60 text-muted/90 cursor-not-allowed";

  return (
    <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-6">
      {/* Datos del cliente y del PAR */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Datos del cliente y del PAR</CardTitle>
            <CardDescription>
              {isLocked
                ? "Información general del documento (solo lectura)."
                : "Información general del documento."}
            </CardDescription>
          </div>
          {isLocked && (
            <span className="inline-flex items-center rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
              Solo lectura
            </span>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <ClientSearch
              clients={clients}
              value={clientId}
              onChange={(clientId) =>
                form.setValue("clientId", clientId, { shouldValidate: true })
              }
              disabled={isLocked}
              autoFocus
            />
            <Input
              label="Código"
              readOnly
              value={clientCode}
              placeholder="—"
            />
            <Input
              label="Atención"
              placeholder="Nombre de la persona de contacto"
              disabled={isLocked}
              className={isLocked ? lockedInputClass : undefined}
              {...form.register("atencion")}
            />
            <Input
              label="Fecha de emisión"
              type="date"
              disabled={isLocked}
              className={isLocked ? lockedInputClass : undefined}
              {...form.register("fechaEmision")}
            />
            <Input
              label="Tasa vigente (Bs.)"
              type="number"
              step="any"
              placeholder="0.00"
              disabled={isLocked}
              className={isLocked ? lockedInputClass : undefined}
              {...form.register("exchangeRate")}
            />
          </div>
          {form.formState.errors.clientId?.message && (
            <p className="mt-2 text-xs font-medium text-red-500">
              {form.formState.errors.clientId.message}
            </p>
          )}
        </CardContent>
      </Card>

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
              <Textarea
                className="mt-4"
                label="Observaciones del equipo"
                placeholder="Alcance del trabajo, petición de oferta, calibraciones..."
                disabled={isLocked}
                {...form.register(`equipment.${index}.observaciones`)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Productos adicionales / Mano de obra */}
      <Card>
        <CardHeader>
          <div className="flex-1">
            <CardTitle>Productos adicionales y mano de obra</CardTitle>
            <CardDescription>
              Ítems de repuestos, materiales y servicios. Los conceptos de mano de obra
              salen del catálogo (categoría Servicio).
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
                  categoria: "Mano de Obra",
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
                      <tr key={field.id} className="border-b border-border/60 align-top last:border-0">
                        <td className="px-2 py-2 text-muted">{index + 1}</td>
                        <td className="px-2 py-2">
                          <div className="w-64">
                            <CatalogSearch
                              options={itemProducts}
                              value={form.watch(`items.${index}.productId`)}
                              onSelect={(product) => handleProductPick(index, product)}
                              label=""
                              placeholder="Buscar producto..."
                              autoFocus={index === focusItemIndex}
                              getTitle={(product) => product.description || "—"}
                              getSubtitle={(product) =>
                                [product.code, product.category].filter(Boolean).join(" · ")
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
                            className="w-16"
                            placeholder="0"
                            {...form.register(`items.${index}.qty`)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-14"
                            placeholder="—"
                            {...form.register(`items.${index}.ccn`)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-20"
                            placeholder="—"
                            {...form.register(`items.${index}.usList`)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-16"
                            placeholder="1"
                            {...form.register(`items.${index}.multiplicador`)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-20"
                            placeholder="0.00"
                            {...form.register(`items.${index}.valorUnitUsd`)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            className="w-16"
                            placeholder="0"
                            {...form.register(`items.${index}.valorPercent`)}
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

      {/* Resumen y firmas */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{variant === "full" ? "Resumen y firmas" : "Resumen"}</CardTitle>
            <CardDescription>Totales calculados según la tasa vigente.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface-2/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Total USD
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrencyUsd(totals.totalUsd)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-2/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Total Bs.
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrencyBs(totals.totalBs)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-2/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Tasa vigente
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {formatCurrencyBs(Number(exchangeRate) || 0)}
              </p>
            </div>
          </div>
          {variant === "full" && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Input
                label="Elaborado por"
                readOnly
                placeholder="Nombre de quien elabora"
                {...form.register("elaboradoPor")}
              />
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <Button type="submit" loading={loading}>
              {submitLabel}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={loadOpen}
        onClose={() => {
          if (!loadingLoad) setLoadOpen(false);
        }}
        title="Cargar plantilla"
        description="Agrega los ítems de una plantilla al final de este PAR."
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setLoadOpen(false)}
              disabled={loadingLoad}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleLoadTemplate}
              loading={loadingLoad}
              disabled={!loadTargetId}
            >
              Cargar ítems
            </Button>
          </>
        }
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
            <option value="" disabled>
              Seleccione una plantilla…
            </option>
            {templates
              .filter(
                (template) =>
                  loadType === "Todos" || template.type === loadType
              )
              .map((template) => (
                <option key={template.id} value={String(template.id)}>
                  {template.name} ({template.item_count} ítems)
                </option>
              ))}
          </Select>
          {templates.filter((template) => loadType === "Todos" || template.type === loadType)
            .length === 0 && (
            <p className="text-sm text-muted">
              No hay plantillas de este tipo. Crea una desde el módulo de plantillas.
            </p>
          )}
        </div>
      </Modal>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Hooks auxiliares                                                   */
/* ------------------------------------------------------------------ */

function useCatalogs() {
  const [clients, setClients] = useState([]);
  const [productCatalog, setProductCatalog] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadCatalogs() {
      try {
        const [clientsData, productsData] = await Promise.all([
          getClients(),
          getProducts(),
        ]);
        if (!active) return;
        setClients(clientsData);
        setProductCatalog(productsData);
      } catch (err) {
        console.error("Error cargando catálogos:", err);
      }
    }
    loadCatalogs();
    return () => {
      active = false;
    };
  }, []);

  return { clients, productCatalog };
}
