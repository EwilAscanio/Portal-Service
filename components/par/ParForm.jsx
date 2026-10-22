"use client";

import { budgetedLaborHours } from "@/lib/labor-hours";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ClientSearch } from "@/components/ui/ClientSearch";
import { notify } from "@/lib/toast";
import {
  getEquipment,
  getExchangeRate,
  getParTemplates,
  getParTemplateById,
} from "@/lib/api";
import {
  parHeaderSchema,
} from "@/lib/validators";
import { calculateLineTotalUsd, calculateLineTotalBs, formatCurrencyUsd, formatCurrencyBs } from "@/utils/parCalc";
import { useParCatalogs } from "@/hooks/par/useParCatalogs";
import { parFormSchema as extractedParFormSchema, formatIssues } from "@/components/par/parFormSchema";
import { ParEquipmentSection } from "@/components/par/sections/ParEquipmentSection";
import { ParItemsSection } from "@/components/par/sections/ParItemsSection";
import { ParFormSummary } from "@/components/par/sections/ParSummarySection";
import { ParTemplateLoadModal } from "@/components/par/modals/ParTemplateLoadModal";
import { DEFAULT_PRODUCT_CATEGORY, PRODUCT_CATEGORIES } from "@/lib/par/constants";

export function ParForm({
  formId,
  defaultValues,
  onSubmit,
  loading,
  submitLabel,
  variant = "full",
}) {
  const form = useForm({
    resolver: zodResolver(extractedParFormSchema),
    defaultValues,
  });

  const { fields: equipmentFields, append: appendEquipment, remove: removeEquipment } =
    useFieldArray({ control: form.control, name: "equipment" });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { data: session } = useSession();

  const { clients, plants, contacts, productCatalog, loading: catalogsLoading, error: catalogsError, retry: retryCatalogs } = useParCatalogs();
  const watchedItems = useWatch({ control: form.control, name: "items" });
  const items = useMemo(() => (watchedItems ?? []).map((item) => ({ ...item, requiresTechnician: item.requiresTechnician ?? productCatalog.find((product) => product.id === item.productId)?.requires_technician ?? false })), [watchedItems, productCatalog]);
  const exchangeRate = form.watch("exchangeRate") || "0";

  const totals = useMemo(() => {
    const totalUsd = items.reduce((sum, item) => sum + calculateLineTotalUsd(item), 0);
    const rate = Number(exchangeRate) || 0;
    return { totalUsd, totalBs: Number((totalUsd * rate).toFixed(2)) };
  }, [items, exchangeRate]);

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
        categoria: item.categoria ?? DEFAULT_PRODUCT_CATEGORY,
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
  const plantId = form.watch("plantId");
  const availablePlants = useMemo(
    () => plants.filter((plant) => plant.client_id === clientId),
    [plants, clientId]
  );
  const availableContacts = useMemo(
    () => contacts.filter(
      (contact) => contact.client_id === clientId && contact.plant_id === plantId
    ),
    [contacts, clientId, plantId]
  );
  const selectionKey = `${clientId || ""}:${plantId || ""}`;
  const prevSelectionRef = useRef(selectionKey);
  const clientCode = useMemo(
    () => clients.find((client) => client.id === clientId)?.codclie ?? "",
    [clients, clientId]
  );

  useEffect(() => {
    const prev = prevSelectionRef.current;
    prevSelectionRef.current = selectionKey;

    if (!clientId) {
      setClientEquipment([]);
      return undefined;
    }

    let active = true;
    if (!plantId) {
      setClientEquipment([]);
      return undefined;
    }

    getEquipment({ clientId, plantId })
      .then((data) => {
        if (!active) return;
        setClientEquipment(data);
        if (prev && prev !== selectionKey) {
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
  }, [clientId, plantId, selectionKey, form]);

  useEffect(() => {
    let active = true;
    getExchangeRate()
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

  const selectedProductIds = useMemo(
    () => new Set(items.map((item) => item.productId).filter(Boolean)),
    [items]
  );
  const itemProducts = useMemo(
    () => productCatalog.filter(
      (product) => PRODUCT_CATEGORIES.includes(product.category)
        && (product.status === "Activo" || selectedProductIds.has(product.id))
    ),
    [productCatalog, selectedProductIds]
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
    form.setValue("items." + index + ".sourceItemId", undefined);
    form.setValue("items." + index + ".requiresTechnician", product?.requires_technician ?? false);
    form.setValue(`items.${index}.productId`, product?.id ?? "");
    if (product) {
      form.setValue(`items.${index}.descripcion`, product.description || "");
      form.setValue(`items.${index}.valorUnitUsd`, product.price?.toString() || "");
      form.setValue(`items.${index}.categoria`, product.category);
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
        id: item.sourceItemId,
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
      plantId: values.plantId,
      contactId: values.contactId,
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ClientSearch
              clients={clients}
              value={clientId}
              onChange={(clientId) => {
                form.setValue("clientId", clientId, { shouldValidate: true });
                form.setValue("plantId", "", { shouldValidate: true });
                form.setValue("contactId", "", { shouldValidate: true });
              }}
              disabled={isLocked}
              autoFocus
            />
            <Select
              label="Planta *"
              value={plantId || ""}
              disabled={isLocked || !clientId}
              onChange={(event) => {
                form.setValue("plantId", event.target.value, { shouldValidate: true });
                form.setValue("contactId", "", { shouldValidate: true });
              }}
              options={[
                { value: "", label: clientId ? "Seleccione una planta" : "Seleccione primero un cliente" },
                ...availablePlants.map((plant) => ({ value: plant.id, label: plant.name })),
              ]}
            />
            <Input
              label="Código"
              readOnly
              value={clientCode}
              placeholder="—"
            />
            <Select
              label="Contacto *"
              value={form.watch("contactId") || ""}
              disabled={isLocked || !plantId}
              onChange={(event) => form.setValue("contactId", event.target.value, { shouldValidate: true })}
              options={[
                { value: "", label: plantId ? "Seleccione un contacto" : "Seleccione primero una planta" },
                ...availableContacts.map((contact) => ({ value: contact.id, label: contact.name })),
              ]}
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
          {form.formState.errors.plantId?.message && (
            <p className="mt-2 text-xs font-medium text-red-500">{form.formState.errors.plantId.message}</p>
          )}
          {form.formState.errors.contactId?.message && (
            <p className="mt-2 text-xs font-medium text-red-500">{form.formState.errors.contactId.message}</p>
          )}
          {catalogsLoading && (
            <p className="mt-2 text-xs text-muted" role="status">Cargando catálogos…</p>
          )}
          {catalogsError && (
            <div className="mt-2 flex items-center gap-3" role="alert">
              <p className="text-xs font-medium text-red-500">{catalogsError}</p>
              <Button type="button" variant="ghost" size="sm" onClick={retryCatalogs}>
                Reintentar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ParEquipmentSection
        isLocked={isLocked}
        equipmentFields={equipmentFields}
        appendEquipment={appendEquipment}
        removeEquipment={removeEquipment}
        setFocusEquipIndex={setFocusEquipIndex}
        clientEquipment={clientEquipment}
        form={form}
        handleEquipmentChange={handleEquipmentChange}
        clientId={clientId}
        focusEquipIndex={focusEquipIndex}
        lockedInputClass={lockedInputClass}
      />

      <ParItemsSection
        itemFields={itemFields}
        appendItem={appendItem}
        removeItem={removeItem}
        setFocusItemIndex={setFocusItemIndex}
        items={items}
        itemProducts={itemProducts}
        form={form}
        handleProductPick={handleProductPick}
        focusItemIndex={focusItemIndex}
        exchangeRate={exchangeRate}
        setLoadOpen={setLoadOpen}
      />

      <ParFormSummary
        variant={variant}
        isLocked={isLocked}
        form={form}
        loading={loading}
        submitLabel={submitLabel}
        totals={{
          hours: budgetedLaborHours(items).toFixed(2),
          usd: formatCurrencyUsd(totals.totalUsd),
          bs: formatCurrencyBs(totals.totalBs),
          rate: formatCurrencyBs(Number(exchangeRate) || 0),
        }}
      />
      <ParTemplateLoadModal
        open={loadOpen}
        onClose={() => setLoadOpen(false)}
        loading={loadingLoad}
        loadType={loadType}
        setLoadType={setLoadType}
        loadTargetId={loadTargetId}
        setLoadTargetId={setLoadTargetId}
        templates={templates}
        onLoad={handleLoadTemplate}
      />
    </form>
  );
}
