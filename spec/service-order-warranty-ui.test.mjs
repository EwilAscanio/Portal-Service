import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import swc from "next/dist/build/swc/index.js";

await swc.loadBindings();
const root = new URL("../", import.meta.url);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/hooks/useAuth") return { url: 'data:text/javascript,export function useAuth(){return {user:{role:"Administrador"}};}', shortCircuit: true };
    if (specifier === "next/link") return nextResolve("next/link.js", context);
    if (specifier.startsWith("@/") || specifier.startsWith(".") && !context.parentURL?.includes("/node_modules/")) {
      const target = new URL(specifier.startsWith("@/") ? specifier.slice(2) : specifier, specifier.startsWith("@/") ? root : context.parentURL);
      for (const url of [target, new URL(`${target.href}.js`), new URL(`${target.href}.jsx`), new URL(`${target.href}/index.js`)]) {
        if (fs.existsSync(url) && fs.statSync(url).isFile()) return nextResolve(url.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(root.href) && url.endsWith(".jsx")) {
      const { code } = swc.transformSync(fs.readFileSync(new URL(url), "utf8"), {
        filename: new URL(url).pathname,
        jsc: { parser: { syntax: "ecmascript", jsx: true }, target: "es2022", transform: { react: { runtime: "automatic" } } },
        module: { type: "es6" },
      });
      return { format: "module", source: code, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

try {
  const { ServiceOrderForm, buildServiceOrderDefaults } = await import("../components/service-orders/ServiceOrderForm.jsx");
  const { ServiceOrderPreview } = await import("../components/service-orders/ServiceOrderPreview.jsx");
  const { ServiceOrderPrintSheet } = await import("../components/service-orders/ServiceOrderPrintSheet.jsx");
  const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
  const defaults = buildServiceOrderDefaults();
  const fixed = render(ServiceOrderForm, { defaultValues: defaults, initialOriginId: "42" });
  assert.match(fixed, /Clasificación/);
  assert.match(fixed, /Garantía/);
  assert.match(fixed, /O\/S original/);
  assert.match(fixed, /Motivo de la garantía/);
  assert.doesNotMatch(fixed, /Origen de la garantía|Seleccione una O\/S completada|>Normal<|Orden de compra|Cotización/);
  const general = render(ServiceOrderForm, { defaultValues: defaults });
  assert.match(general, /Orden de compra/);
  assert.match(general, /Cotización/);
  assert.match(general, /<option value="Normal"/);
  const external = render(ServiceOrderForm, { defaultValues: { ...defaults, orderKind: "Garantia", warrantyOrigin: "External" } });
  assert.match(external, /Origen de la garantía/);
  assert.match(external, /Referencia del servicio anterior/);
  assert.doesNotMatch(external, /Orden de compra|Cotización/);
  const historical = { order_kind: "Garantia", warranty_origin: "External", warranty_reference: "Servicio ficticio", warranty_reason: "Motivo ficticio", order_code: "OS-FICTICIA", par_number: "PAR-FICTICIO", status: "Pendiente", priority: "Media", equipment: [], labor_allocations: [], purchase_order_number: "OC-HISTORICA", quotation_number: "COT-HISTORICA", call_date: "2030-01-01T12:00:00Z", scheduled_start: "2030-01-02T12:00:00Z", scheduled_end: "2030-01-02T14:00:00Z", created_at: "2030-01-01T12:00:00Z" };
  const edit = render(ServiceOrderForm, { defaultValues: buildServiceOrderDefaults(historical), context: historical, lockPar: true });
  assert.doesNotMatch(edit, /Orden de compra|Cotización|OC-HISTORICA|COT-HISTORICA/);
  for (const component of [ServiceOrderPreview, ServiceOrderPrintSheet]) {
    const warranty = render(component, { order: historical });
    assert.doesNotMatch(warranty, /OC-HISTORICA|COT-HISTORICA|ORDEN DE COMPRA|COTIZACIÓN|Cotización:/);
    assert.match(warranty, /PAR-FICTICIO/);
    const normal = render(component, { order: { ...historical, order_kind: "Normal" } });
    assert.match(normal, /OC-HISTORICA/);
    assert.match(normal, /COT-HISTORICA/);
  }
  console.log("PASS: formulario de garantía fijo, entrada general/externa, edición histórica y referencias solo en consulta/impresión normal.");
} finally { hooks.deregister(); }
