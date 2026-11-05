# 🗺️ APP_DEPENDENCIES.md — Mapa de Dependencias Funcionales

> **Este archivo es complementario a `AI_CONTEXT.md`.**
> Para stack, roles, convenciones, prohibiciones y checklist general, ver `AI_CONTEXT.md`.
> Este archivo solo documenta RELACIONES entre módulos y puntos de integración frágiles. Este archivo responde: **si modifico X, ¿qué se rompe?**

No repite stack, roles, convenciones ni checklist. Solo relaciones y flujo de datos.

**Leyenda:** 🔴 hub (muchos módulos dependen) · 🟡 algunas conexiones · 🟢 aislado / stub

## Dependencias del cierre de O/S y horas reales (2026-10-22)

Este contrato sustituye el consumo exclusivo de estimaciones después del cierre y la herencia de todos los equipos del PAR. Uso, despliegue y recuperación: `docs/cierre-orden-servicio.md`.

| Origen | Consumidor / contrato |
|---|---|
| `ServiceOrderForm` → `equipmentIds` | Schema operacional → `service-order-equipment.repository`; selección de equipos del PAR, mínimo uno |
| `service_order_equipment` | Snapshots de selección → requisitos por equipo, detalle e impresión; descripción y principal derivados |
| `ServiceOrderClosure` → `/api/service-order/[id]/closure` | Confirmación histórica de equipos, horas reales, No aplica, revisión final y cierre |
| `service-order-closure.js` | Categorías, límites y roles compartidos; servidor siempre valida estado y sesión |
| `service-order-closure.repository` | Transacciones PAR → O/S, revisión optimista, auditoría y cierre atómico |
| `service_order_labor_allocation.hours` / `worked_hours` | Estimaciones; no cambiar durante el cierre |
| Asignación `actual_hours` / `actual_note` | Borrador real por técnico programado y renglón; cero justificado |
| Cabecera `actual_hours` / `closed_at` | Total confirmado de ejecución; activa consumo real en `getLaborBudget` |
| `getLaborBudget` | Reservas abiertas + reales cerradas + reserva histórica de cierres antiguos; excluye canceladas |
| Rutas `/closure/files` | Carga multipart y reemplazo; `fileId` permite descarga autenticada o retiro lógico |
| `service-order-storage.js` | Carpeta privada, UUID, firma/extensión/MIME/tamaño, SHA-256, persistencia antes de COMMIT |
| `SERVICE_ORDER_DOCUMENTS_DIR` | Persistencia local; respaldo inseparable de PostgreSQL; carpeta compartida si hay varias instancias |
| `closure_revision` | Conflictos 409 en horas, equipos, documentos y cierre; recargar antes de reintentar |
| `LaborAllocationSummary` / listado / tarjetas / CSV | Estimaciones y reales confirmadas separadas; histórico marcado explícitamente |

Contratos que deben conservarse:

- Las cuatro categorías corresponden a cada equipo seleccionado. Un archivo retirado no satisface requisitos; un reemplazo fallido no retira el original. No aplica requiere motivo y ausencia de archivos vigentes.
- Nuevas rutas heredan el prefijo autorizado `/api/service-order` y añaden controles de sesión/rol en servidor. No agregan menú ni amplían permisos de módulos. Coordinador puede preparar el expediente, pero no cerrar.
- No cerrar mediante el PUT general ni alterar el estado sin validar el expediente. Mantener `Completada` como estado persistido para PAR, estadísticas y calendario.
- Mantener bloqueos PAR → O/S en creación, edición, cancelación, adjuntos y cierre. `closed_at` y el total real deben confirmarse juntos: de ellos depende el saldo disponible para otras órdenes.
- No convertir horas históricas en reales. `closure_legacy` conserva seis cierres anteriores al aplicar 052; las dos órdenes abiertas requieren confirmar alcance. Revisiones de 051 siguen aplicando.
- El presupuesto pertenece al renglón, no al código de producto. Un exceso real justificado puede agotar o superar el saldo; no modificar automáticamente estimaciones ya reservadas por otras órdenes.
- Los técnicos reales se toman de asignaciones ya programadas; no editar `service_order_technician` ni fechas al cerrar. La relación técnico/producto queda disponible para comisiones futuras, fuera de esta entrega.
- `next.config.mjs` permite 12 MB en el proxy; almacenamiento limita 11 MB de multipart y 10 MB de archivo. Reiniciar el proceso al modificar configuración. El proxy externo también debe admitir ese tamaño.
- Aplicar 052 antes de iniciar código nuevo en una base existente; para bases nuevas usar el esquema consolidado. No reaplicar 051 ni modificar SQL ya aplicado.
- `db/validate.sql` deja de considerar cualquier exceso como error: comprueba la justificación del exceso real. No se agregan dependencias npm ni entradas en TAREAS.MD.

- Las respuestas del expediente se leen dentro de su transacción de escritura. No cargar una revisión posterior en la respuesta de un guardado anterior; el cliente conserva un borrador independiente de horas. Las revisiones históricas incrementan también `closure_revision`.
- Entrega: lint sin errores (tres advertencias previas) y compilación de producción correcta. No se añadieron ni ejecutaron pruebas en esta entrega.

## Dependencias anteriores de horas presupuestadas y técnicos (2026-10-22)

Este contrato sustituye las referencias históricas a captura manual de horas y selección independiente de técnicos.

| Origen | Consumidor / contrato |
|---|---|
| `product.requires_technician` | Clasificación explícita en Productos, solo Servicio |
| `par.repository.js` → `par_item.requires_technician` | Copia al incorporar el producto; conserva la clasificación del renglón existente |
| `par_item.qty` → `par_header.budgeted_hours` | Solo mano de obra; multiplicador, precio y porcentaje no intervienen |
| `lib/labor-hours.js` | Centésimas, sumas y técnicos únicos, compartido por servidor e interfaz |
| `service-order-labor.repository.js` | Saldo por ítem, bloqueo por revisiones pendientes, validación del reparto y snapshots |
| `service-order.repository.js` | Bloqueo PAR → orden, equipo derivado, total de horas, revisión histórica y estado |
| `/api/service-order/labor` → `useLaborBudget` | Saldo informativo, exclusión validada de orden actual y descarte de respuestas de otro PAR |
| `LaborAllocationEditor` → `ServiceOrderForm` | Técnico/horas por renglón, máximo tres personas, responsable dentro del reparto |
| `LegacyLaborReview` → PUT | Roles de aprobación, explicación y auditoría; conserva valor anterior, técnicos y agenda |
| `LaborAllocationSummary` | Vista previa e impresión de reparto e historial, aunque se elimine el ítem original |
| `service_order_technician` → calendario | Derivado del reparto normal; se conserva durante la revisión histórica |
| Importación | Mantiene marca existente; nuevos productos sin marcar; impide mano de obra como Repuestos |

### Reglas para cambios futuros

- Todas las órdenes no canceladas consumen saldo, incluidas `Pendiente` y `Completada`. Cancelar lo libera sin borrar asignaciones.
- Mantener el orden de bloqueos PAR → orden → asignaciones. Leer presupuesto en una sentencia posterior a `par_header FOR UPDATE`, también al editar o cancelar.
- El presupuesto pertenece al `par_item.id` real: dos renglones del mismo producto no comparten saldo.
- `par_item_id ON DELETE SET NULL` permite editar el PAR tras cancelar todas sus órdenes. `source_item_id`, `source_item_no`, `product_code`, `description`, `technical_id`, `technician_name` y `hours` conservan el historial para futuras comisiones.
- No escribir `worked_hours` directamente: tras la revisión es suma de asignaciones. `legacy_worked_hours` conserva el dato antiguo. Revisar no autoriza cambios generales de órdenes aprobadas o completadas.
- Con `pendingReviewOrders`, el saldo es provisional. Las revisiones se completan individualmente; nuevas reservas esperan la revisión de todas las órdenes no canceladas.
- Catálogo y renglón pueden diferir deliberadamente en `requires_technician`; no propagar cambios sobre presupuestos comprometidos.
- Cantidades con dos decimales y total de orden dentro de `worked_hours NUMERIC(8,2)`.
- Antes de desplegar, aplicar migración 051. El esquema consolidado incorpora los cambios y `db/validate.sql` incluye consultas de presupuesto, reparto y pertenencia.
- No se incluyen comisiones, cálculos de pago ni dependencias npm nuevas.

---
## Dependencias de edición de PAR aprobado (2026-10-21)

Esta sección reemplaza la regla histórica de Fase 3 que permitía editar exclusivamente en `Creado`.

| Componente | Contrato |
|---|---|
| `hooks/useAuth.js` → `/par/[id]` | El rol de sesión controla la acción **Editar ítems** junto a `par.status` y `total_orders` |
| `lib/par-policy.js` | `Creado` conserva sus permisos; `Aprobado` exige Superadministrador/Administrador/Supervisor; cualquier orden no cancelada bloquea a todos |
| `app/api/par/[id]/route.js` y rutas anidadas de ítems/equipos | `auth()` deriva `actor.role`; no se reciben permisos desde el payload |
| `lib/repositories/par.repository.js` | `FOR UPDATE` de cabecera → consulta de órdenes → política → escritura y recálculo, en una transacción |
| `lib/repositories/service-order.repository.js` | `FOR UPDATE` de cabecera (actualizado por la distribución de horas) en una sentencia previa a la lectura de relaciones/descripción y a la creación de la orden |
| `lib/par-errors.js` | Errores de estado, rol o existencia de órdenes se traducen a 403 con una explicación pública |
| `spec/par-policy.test.mjs` y `spec/par-edit.integration.test.mjs` | Matriz de permisos, rutas autenticadas, persistencia, totales, auditoría y concurrencia en ambos sentidos; incluidas en `npm test` |

Contratos que deben conservarse:

- `service_order.status <> 'Cancelada'` define el bloqueo. Incluye pendientes y completadas; completar una orden no habilita edición. Si todas están canceladas, el PAR aprobado vuelve a admitir edición por los tres roles autorizados.
- `total_orders` ya contiene el conteo de órdenes no canceladas. La interfaz lo usa para anticipar el bloqueo, pero el repositorio vuelve a consultar después de adquirir el bloqueo. No autorizar escrituras con `display_status` ni con un conteo enviado por el cliente.
- Mantener el orden **bloquear cabecera → consultar datos → escribir** en ambos repositorios. Si la orden confirma primero, la edición recibe 403. Si la edición confirma primero, la orden debe leer los datos resultantes; una consulta combinada con el bloqueo podría conservar relaciones leídas antes de la espera.
- La pantalla y el PUT principal siguen editando solamente ítems. Las rutas anidadas de equipos e ítems aplican la misma política al agregar, modificar o eliminar sus filas.
- Un 403 al guardar hace que la pantalla recargue el PAR y vuelva a vista previa. El formulario y la acción de guardado dejan de mostrarse cuando la sesión o el PAR ya no permiten editar.
- Los importes se recalculan en PostgreSQL y se conservan estado y auditoría de aprobación. El permiso de eliminar el PAR completo se valida separadamente y exige `Creado`.
- La prueba de concurrencia crea un esquema temporal exclusivo, utiliza conexiones distintas y lo elimina al finalizar; no modifica registros funcionales del esquema `public`.
- No se agregan paquetes npm ni migraciones.
- Verificación del 2026-10-21: `npm run verify` completo; pruebas y build correctos, lint sin errores y con tres advertencias preexistentes fuera de los archivos de código modificados.

## Dependencias del catálogo de Productos y PAR (2026-09-22)

```text
product.category (Servicio | Repuestos)
  ├─ API /api/product → product.repository → Productos
  ├─ importSchemas.Producto → import executor
  └─ selección de producto en PAR/plantilla
       └─ par.repository / par-template.repository
            ├─ par_item.categoria
            └─ par_template_item.categoria
```

Contratos que no deben romperse:

- `lib/par/constants.js` centraliza `PRODUCT_CATEGORIES = ["Servicio", "Repuestos"]`, los filtros visuales y el valor predeterminado `Servicio`.
- `GET /api/product` admite filtros `category` y `status`; ambos se validan antes de consultar el repositorio.
- Productos activos con categoría canónica son seleccionables en PAR y plantillas. Un producto inactivo ya enlazado puede mostrarse para conservar historia, pero no agregarse de nuevo.
- La categoría persistida para un producto enlazado siempre se resuelve desde `product.category` dentro de la transacción del repositorio.
- `db/migrations/045-normalize-product-category.sql` normaliza producto/PAR/plantillas y agrega restricciones; `046-drop-product-type.sql` elimina `product.type`.
- `db/schema.sql` representa el estado final para instalaciones nuevas y no contiene `product.type` ni la categoría histórica `Principal`.
- La importación Excel de Productos usa: `codigo`, `descripcion`, `marca`, `serial`, `modelo`, `costo`, `precio`, `categoria`, `stock`, `estado`.
- La importación Excel de Equipos y Contactos identifica la planta con `codigo_cliente` + `codigo_planta` (obligatorio; `planta.code` es único por cliente). `nombre_planta` es opcional e informativo.
- `app/(dashboard)/productos/page.jsx` y `components/products/ProductCardGrid.jsx` mantienen un contrato visual paralelo: modal `2xl`, cuadrícula `sm:2/lg:4`, mismos campos y mismo orden.
- El detalle no agrega campos de auditoría ausentes en edición. `code` es inmutable durante la edición y `canEditCost` debe producir la misma representación restringida en ambas ventanas.
- No se agregaron dependencias npm para esta normalización.

**Estado real vs. aparente**

| Módulo | UI habla con API | API / tablas vivas | Notas |
|---|---|---|---|
| PAR, Plantillas, Productos, Clientes, Usuarios, Configuración, Técnicos | sí | sí | |
| Dashboard | sí (`GET /api/dashboard`) | sí | **No consulta PAR ni usuarios.** Lee `service_order`, `client`, `equipment`, `technical`. Gráficos de líneas/barras/radial salen de `data/dashboard.js` (mock reducido a los 4 arrays de charts). |
| Órdenes | **no** (estado local simulado) | sí | LA UI aún no llama a la API. PAR y Dashboard **sí** leen `service_order`. |
| Equipos | sí (`GET/POST/PUT/DELETE /api/equipment`) | sí | Dashboard **sí** lee `equipment`. El PAR **sí** usa el inventario: selector filtrado por `client_id` del PAR. |
| Reportes, Calendario, Vendedores | stub / mock | no | |

```
                    ┌─────────────┐
                    │ Auth / JWT  │  (todo el panel)
                    └──────┬──────┘
         ┌─────────────────┼──────────────────┐
         ▼                 ▼                  ▼
    ┌─────────┐      ┌──────────┐      ┌────────────┐
    │ Usuarios│◄─────│   PAR    │─────►│  Productos │
    │created_by│      │  🔴 hub  │      │ type/price │
    └─────────┘      └──┬──┬──┬─┘      └─────▲──────┘
                        │  │  │              │
            client_id   │  │  │ equipment_id │ product_id
                        ▼  │  ▼              │
                 ┌─────────┐│┌────────┐      │
                 │Clientes │││Equipos │      │
                 │+ Saint  ││└───▲────┘      │
                 └────▲────┘│    │           │
                       │     │    │           │
                  ubicacion  │    │           │
                  (config)   ▼    │           │
                  ┌──────────────┐│    ┌──────┴──────┐
                 │ Órdenes OS   ││    │ Plantillas  │
                 │ par_id ──────┘│    │ PAR         │
                 │ display_status│    └─────────────┘
                 └──────▲───────┘
                         │
                  ┌──────┴───────┐     ┌──────────────┐
                  │  Dashboard   │     │ Configuración│
                  │  (KPIs SQL)  │     │ exchange_rate│──► PAR form
                  └──────────────┘     └──────────────┘
```

> 🔗 **Relación viva (además del diagrama):**
> - **Equipos → Clientes** vía `equipment.client_id` (FK `ON DELETE RESTRICT`): cada equipo pertenece a un cliente real; la página `/equipos` y el Dashboard resuelven el nombre con JOIN `client.description`.
> - **PAR → Clientes** vía `par_header.client_id` y **Equipos** vía `par_equipment.equipment_id`. El form lista `GET /api/equipment?clientId=` y copia snapshot (`tipo`/`marca`/`serial`/`modelo`).

---

## 1. 🔴 Auth / Sesión

### Descripción (1 línea)
Login Credentials + JWT; el proxy sella cada request y PAR usa `session.user` para `created_by` / `elaborado_por` / `approved_by`.

### Archivos propios (rutas completas)
- `/auth.js`
- `/proxy.js`
- `/app/api/auth/[...nextauth]/route.js`
- `/app/login/page.jsx`
- `/components/forms/LoginForm.jsx`
- `/hooks/useAuth.js`
- `/lib/permissions.js`
- `/lib/repositories/user.repository.js` (`findByLogin`, `touchLastAccess`)

### Entidades de BD que toca
- `users` (`id`, `login`, `password_hash`, `status`, `role_id`, `name`, `email`)
- `role` (`id`, `name`)

### Dependencias ENTRANTES (¿quién NECESITA de este módulo?)
| Funcionalidad | Para qué lo necesita | Qué se rompe si cambio este módulo |
|---|---|---|
| Todo el panel | Sesión + RBAC en `proxy.js` | Login, 401/403, redirecciones |
| PAR | `session.user.id/name` al crear y al aprobar | PAR queda sin `created_by` / `elaborado_por` / `approved_by` |
| Sidebar / Nav | `session.user.role` filtra `NAV_SECTIONS` | Ítems de menú aparecen o desaparecen mal |
| Dashboard | `user.name` para el saludo | Greeting vacío |
| Usuarios | Misma tabla `users` que el login | Inactivar/borrar usuario afecta login y FKs de PAR |

### Dependencias SALIENTES (¿de qué NECESITA este módulo?)
| Funcionalidad | Qué le presta | Qué se rompe en ESTE módulo si cambio el otro |
|---|---|---|
| Usuarios | Fila `users` + `role.name` | Si cambia `status`/`login`/`password_hash` o el string del rol, nadie entra o el proxy niega rutas |

### Flujo de datos crítico
1. Usuario envía `login` + `password` en `LoginForm`.
2. NextAuth `authorize` → `findByLogin` → bcrypt → JWT `{ id, login, role }`.
3. `proxy.js` lee la sesión en cada página/API (salvo `/login` y `/api/auth/*`).
4. `POST /api/par` y `PATCH /api/par/[id]` vuelven a leer `auth()` para sellar identidad.

### 🚨 Puntos de integración frágiles
- Si cambio el payload del JWT (`id`, `login`, `role`): revisar `proxy.js`, Sidebar, `ParForm` (`elaboradoPor`), `POST /api/par`, `PATCH /api/par/[id]`.
- Si inactivo un usuario que ya tiene JWT: el token sigue válido; PAR puede seguir sellando `approved_by` con ese `id`.
- Si borro un `users` referenciado por `par_header.created_by` / `approved_by`: el DELETE de Postgres falla (FK sin ON DELETE).

### Reglas de modificación para este módulo
- Antes de tocar: leer `auth.js`, `proxy.js`, `lib/permissions.js` y quién llama `auth()`.
- No cambiar el shape de `session.user` sin actualizar PAR y el proxy.
- Confirmación explícita del usuario (regla de `AI_CONTEXT.md`).

---

## 2. 🔴 PAR

### Descripción (1 línea)
Planilla de atención: cabecera + equipos + ítems; consume catálogos ajenos y deriva `display_status` desde órdenes.

### Archivos propios (rutas completas)
- `/app/(dashboard)/par/page.jsx`
- `/app/(dashboard)/par/new/page.jsx`
- `/app/(dashboard)/par/[id]/page.jsx`
- `/app/api/par/route.js`
- `/app/api/par/[id]/route.js`
- `/app/api/par/[id]/equipment/route.js`
- `/app/api/par/[id]/items/route.js`
- `/app/api/par/equipment/[eqId]/route.js`
- `/app/api/par/items/[itemId]/route.js`
- `/components/par/ParForm.jsx`
- `/components/par/ParCardGrid.jsx`
- `/components/par/ParPreview.jsx`
- `/components/par/ParPrintSheet.jsx`
- `/components/ui/ClientSearch.jsx` (selector de cliente reutilizable, movido desde `components/par/`)
- `/components/par/CatalogSearch.jsx`
- `/lib/repositories/par.repository.js`
- `/lib/validators/par.schema.js`
- `/utils/parCalc.js`

### Entidades de BD que toca
- `par_header` (`client_id`, `status`, `exchange_rate`, `created_by`, `approved_by`, totales)
- `par_equipment` (`equipment_id`, `is_main`, tipo/marca/serial/modelo)
- `par_item` (`product_id`, qty, precios, `line_total_usd`)
- Lee (JOIN, no escribe): `client`, `users`, `product`, `service_order`, `equipment`

### Dependencias ENTRANTES (¿quién NECESITA de este módulo?)
| Funcionalidad | Para qué lo necesita | Qué se rompe si cambio este módulo |
|---|---|---|
| Órdenes de Servicio | FK opcional `service_order.par_id` → `par_header.id` | Insertar/actualizar OS con `parId` inválido; `ON DELETE SET NULL` deja órdenes huérfanas de PAR |
| Plantillas PAR | `ParForm` carga plantillas como ítems | Nadie consume plantillas si se quita el loader del form |
| Dashboard | **hoy no** | No hay KPI de PAR; no asumir que existe |

### Dependencias SALIENTES (¿de qué NECESITA este módulo?)
| Funcionalidad | Qué le presta | Qué se rompe en ESTE módulo si cambio el otro |
|---|---|---|
| Clientes | Lista + `id` obligatorio (`client_id`) | Selector vacío; JOIN de listado/detalle falla; campos `description`/`codclie`/`phone`/`address1` alimentan preview/print |
| Productos | Catálogo de **ítems** (`type !== "Equipo"`); `price`/`category` | Selectores de ítem vacíos; categoría mal mapeada (`Servicio` → “Mano de Obra”) |
| Equipos | Inventario filtrado por `client_id` del PAR; `par_equipment.equipment_id` | Selector de equipos vacío; al cambiar cliente se limpian equipos que no pertenecen |
| Órdenes de Servicio | Agregado en `HEADER_SELECT` para `display_status` y `total_orders`; consulta transaccional al editar | Una orden no cancelada bloquea edición de PAR; modificar esa definición exige revisar ambos repositorios y la pantalla |
| Configuración | `exchange_rate` mediante la ruta limitada `/api/configuration/exchange-rate` | Tasa en 0; `total_bs` mal calculado (el PAR **copia** la tasa al header; no queda ligado en vivo) |
| Plantillas PAR | `getParTemplates` / `getParTemplateById` | Modal “Cargar plantilla” vacío |
| Auth / Usuarios | `created_by`, `elaborado_por`, `approved_by`, `session.user.role` | Identidad de creación/aprobación y permiso de edición de PAR aprobado en todas las rutas de escritura |

### Flujo de datos crítico
1. Usuario abre `/par/new` → `ParForm` pide clientes, plantas, contactos, productos, `getExchangeRate` y plantillas. Tras elegir cliente y planta, `getEquipment({ clientId, plantId })` llena el selector de equipos.
2. Elige cliente, planta y contacto obligatorios; opcionalmente carga plantilla (copia ítems, no mantiene FK a la plantilla).
3. `POST /api/par` sella `createdBy` desde sesión; repo inserta `par_header` + `replaceEquipment` + `replaceItems` + `recalcTotals`.
4. Supervisor `PATCH` Creado→Aprobado sella `approved_by`.
5. Si existen `service_order` con ese `par_id`, la **lectura** deriva `En Servicio` / `Finalizado`.
6. Preview/print usan snapshot del PAR (`client_*`, `exchange_rate` copiados), no vuelven a Configuración.

### 🚨 Puntos de integración frágiles
- Si cambio `product.type` (`"Equipo"` residual): `itemProducts` y plantillas filtran `type !== "Equipo"` para no mezclarlos como ítems.
- Si cambio `product.category` (`Servicio` / `Repuestos`): revisar `handleProductPick` (mapea a “Mano de Obra” / “Repuestos y Consumibles”).
- Si cambio `product.price` / `brand` / `serial` / `modelo`: solo afecta **nuevas** líneas; las ya guardadas en `par_item`/`par_equipment` son snapshot.
- Si cambio `client.description`/`codclie`: listado PAR (JOIN en vivo) sí cambia; el print usa el JOIN actual, no un snapshot de nombre.
- Si cambio status de `service_order` (`Completada` / `Cancelada`): revisar `display_status`, `total_orders` y el bloqueo transaccional de edición del PAR. Una orden completada sigue bloqueando; las canceladas se excluyen.
- Si cambio `configuration.exchange_rate`: **no** actualiza PAR existentes; solo el prefill de formularios nuevos.
- Si borro producto/equipo/cliente/usuario con FKs en PAR: Postgres rechaza (salvo `par_template_item.product_id` que es `ON DELETE SET NULL`).
- Prefijo `/api/par` cubre `/api/par-template` en permisos.
- Rutas anidadas de ítems/equipos derivan el rol de sesión y validan estado/órdenes bajo bloqueo de la cabecera en el repositorio.

### Reglas de modificación para este módulo
- Antes de tocar: leer `ParForm.jsx` (catálogos), `par.repository.js` (`HEADER_SELECT`, `recalcTotals`) y las APIs de catálogo que consume.
- No eliminar `client_id`, `product_id`, `equipment_id`, `created_by` sin ver JOINs y FKs.
- Si cambio un endpoint `/api/par*`: verificar `lib/api.js` y `par/page.jsx`, `par/new`, `par/[id]`.

---

## 3. 🔴 Órdenes de Servicio

### Descripción (1 línea)
Tabla `service_order` alimenta KPIs del Dashboard y el `display_status` del PAR; la página `/ordenes` **aún no llama a la API** (CRUD simulado en memoria).

### Archivos propios (rutas completas)
- `/app/(dashboard)/ordenes/page.jsx` (UI simulada)
- `/app/api/service-order/route.js`
- `/app/api/service-order/[id]/route.js`
- `/lib/repositories/service-order.repository.js`

### Entidades de BD que toca
- `service_order` (`order_code`, `client_description`, `equipment_name`, `technician_name`, `status`, `priority`, `amount`, `par_id`)

### Dependencias ENTRANTES (¿quién NECESITA de este módulo?)
| Funcionalidad | Para qué lo necesita | Qué se rompe si cambio este módulo |
|---|---|---|
| PAR | Agregado `total_orders` / `completed_orders` → `display_status` | PAR no pasa a “En Servicio”/“Finalizado”; filtros de listado vs UI divergen |
| Dashboard | Conteos por `status`, `SUM(amount)` de Completada, `recentOrders` | KPIs, donut `ordersByStatus`, tabla de recientes, ingreso |

### Dependencias SALIENTES (¿de qué NECESITA este módulo?)
| Funcionalidad | Qué le presta | Qué se rompe en ESTE módulo si cambio el otro |
|---|---|---|
| PAR | `par_id` obligatorio (FK, `ON DELETE RESTRICT`) | Toda OS nace de un PAR aprobado; relaciones y equipo deben coincidir mediante FKs compuestas |
| Clientes / Equipos / Técnicos | **ninguna FK** | Campos `*_name` / `*_description` son texto denormalizado. Cambiar esas tablas **no** actualiza órdenes ya guardadas |
| Auth | API sin entrada en `API_PERMISSIONS` → cualquier autenticado | Si se añade regla de roles, la API (hoy abierta) puede 403 |

### Flujo de datos crítico
1. **UI actual:** el usuario crea/cambia órdenes solo en estado React; no hay `getOrders`/`createOrder`.
2. **Backend real:** `POST/PUT /api/service-order` escribe `service_order`, opcionalmente `par_id`.
3. `GET /api/dashboard` agrega esa tabla.
4. `par.repository` `HEADER_SELECT` relee órdenes no `Cancelada` ligadas al PAR.
5. Completar todas las OS de un PAR aprobado hace que la UI del PAR muestre `Finalizado` sin PATCH al header.

### 🚨 Puntos de integración frágiles
- Si cambio los strings de status (`Pendiente`, `En Proceso`, `Completada`, `Cancelada`): revisar Dashboard (`FILTER WHERE status = …`), PAR `display_status`, `ORDER_STATUS_VARIANTS`, página `/ordenes`.
- Si cambio `amount`: KPI `revenue` del Dashboard (solo Completada).
- Si conecto la UI a la API: hoy el form usa `client`/`equipment`/`technician` (nombres), el repo espera `clientDescription`/`equipmentName`/`technicianName`/`parId` — hay que mapear.
- Si asumo dropdown de técnicos/clientes: **no existe**; habría que crearlo. Técnicos no están ligados.
- GlobalSearch tiene fuente “Órdenes” con `data: []` (muerta).

### Reglas de modificación para este módulo
- Antes de tocar el repo/API: revisar `app/api/dashboard/route.js` y `HEADER_SELECT` de PAR.
- No borrar `par_id` ni cambiar semántica de `Cancelada`/`Completada` sin PAR.
- Si cableas la página a la API, no rompas el contrato camelCase del repo.

---

## 4. 🟡 Productos

### Descripción (1 línea)
Catálogo local CRUD; PAR y plantillas lo usan como fuente de **ítems** (`price`/`category`). Los equipos del PAR ya no salen de aquí (vienen del inventario `equipment` por cliente).

### Archivos propios (rutas completas)
- `/app/(dashboard)/productos/page.jsx`
- `/app/api/product/route.js`
- `/app/api/product/[id]/route.js`
- `/components/products/ProductCardGrid.jsx`
- `/lib/repositories/product.repository.js`

### Entidades de BD que toca
- `product` (`code`, `description`, `type`, `brand`, `serial`, `modelo`, `cost`, `price`, `category`, `stock`, `status`)

### Dependencias ENTRANTES (¿quién NECESITA de este módulo?)
| Funcionalidad | Para qué lo necesita | Qué se rompe si cambio este módulo |
|---|---|---|
| PAR | `getProducts()` para **ítems** (`type !== "Equipo"`); copia `price` → `valorUnitUsd` | Selectores de ítem vacíos / mal clasificados; líneas nuevas con precio 0 |
| Plantillas PAR | `ParTemplateForm` lista productos; `par_template_item.product_id` | Formulario de plantilla sin catálogo; JOIN `product_code`/`product_name` |
| Nadie más | Dashboard/Reportes **no** leen `product` | |

### Dependencias SALIENTES (¿de qué NECESITA este módulo?)
| Funcionalidad | Qué le presta | Qué se rompe en ESTE módulo si cambio el otro |
|---|---|---|
| Auth | `API_PERMISSIONS` `/api/product` | 403 si se reordenan prefijos |

*(Sin otras dependencias de dominio.)*

### Flujo de datos crítico
1. Admin/Supervisor/Coordinador CRUD en `/productos` → `/api/product`.
2. `hooks/par/useParCatalogs` carga **todos** los productos (no filtra `status` en el cliente).
3. Al elegir uno, se copian campos al PAR/plantilla; el `product_id` queda como FK.
4. Soft-delete (`status = Inactivo`) **no** quita el producto del selector de PAR (no hay filtro por Activo).

### 🚨 Puntos de integración frágiles
- Si cambio `type` (valor residual `"Equipo"`): `ParForm`/`ParTemplateForm` `itemProducts` (`type !== "Equipo"`).
- Si cambio `category` (`Servicio`/`Repuestos`): página Productos + mapeo de categoría de ítem PAR (`Servicio` → “Mano de Obra”; resto → “Repuestos y Consumibles”).
- Si cambio `price`, `description`, `brand`, `serial`, `modelo`: PAR/plantillas **nuevos**; filas ya guardadas no se recalcan.
- Si borro un producto: falla si hay `par_item`/`par_template_item` (FK); plantillas ponen `product_id` a NULL.
- Si filtro `findAll` por `status` Activo: PAR dejaría de ver inactivos (hoy los ve).

### Reglas de modificación para este módulo
- Antes de tocar: grep `getProducts`, `product.type`, `product.category`, `product_id`.
- No eliminar `type`/`price`/`category` sin PAR y plantillas.
- Endpoint: `lib/api.js` + `ParForm` + `ParTemplateForm` + página productos.

---

## 5. 🟡 Clientes

### Descripción (1 línea)
Maestro Saint (GET + sync); PAR exige un cliente; Dashboard cuenta filas; Topbar busca clientes.

### Archivos propios (rutas completas)
- `/app/(dashboard)/clientes/page.jsx`
- `/app/api/client/route.js`
- `/app/api/client/sync/route.js`
- `/components/clients/ClientCardGrid.jsx`
- `/components/ui/ClientSearch.jsx` (consumido por PAR y Equipos)
- `/lib/repositories/client.repository.js`
- `/lib/saint-api.js`

### Entidades de BD que toca
- `client` (`codclie`, `description`, `rif`, `status` `'1'`/`'0'`, `address1`, `phone`, `email`, `country`, `state`)
- JOIN `country` / `state` por `cod_saint`

### Dependencias ENTRANTES (¿quién NECESITA de este módulo?)
| Funcionalidad | Para qué lo necesita | Qué se rompe si cambio este módulo |
|---|---|---|
| PAR | `client_id` NOT NULL + JOIN nombre/código/teléfono/dirección | No se puede crear PAR; listado/preview/print sin cliente |
| Dashboard | `COUNT(*)` y `COUNT status = 'Activo'` | KPI clientes; el filtro `'Activo'` **no matchea** `'1'`/`'0'` |
| GlobalSearch (Topbar) | `getClients()` | Ctrl+K sin resultados de clientes |
| Configuración | Sync de `country`/`state`/`city` alimenta nombres en el JOIN | `country_name`/`state_name` vacíos en listado clientes |

### Dependencias SALIENTES (¿de qué NECESITA este módulo?)
| Funcionalidad | Qué le presta | Qué se rompe en ESTE módulo si cambio el otro |
|---|---|---|
| Configuración / Ubicación | Tablas `country`,`state`,`city` (sync Saint) | JOIN de país/estado; sync de clientes no crea esas tablas |
| Saint (externo) | Upsert por `codclie` | Lista vacía o overwrite de campos locales |
| Auth | `/api/client` permitido a todos los roles | |
| Equipos | **FK `equipment.client_id → client.id`** (JOIN para el nombre en la página y Dashboard) | Renombrar `client.description` sí actualiza el nombre mostrado en equipos; borrar un cliente con equipos lo impide la FK |

### Flujo de datos crítico
1. Usuario pulsa sync en `/clientes` → `POST /api/client/sync` → Saint → `upsertMany`.
2. `GET /api/client` JOIN ubicación → tabla/cards.
3. `ParForm` y `GlobalSearch` llaman el mismo GET.
4. Al guardar PAR se guarda `client_id`; lecturas posteriores JOIN `client` (nombre en vivo).

### 🚨 Puntos de integración frágiles
- Si cambio `status` (`'1'`/`'0'`): UI clientes (`getActiveLabel`), Dashboard KPI (hoy busca `'Activo'`), `CLIENT_STATUS_VARIANTS`.
- Si cambio `codclie` / `description` / `rif`: búsqueda PAR (`ClientSearch`), GlobalSearch, listado PAR.
- Si borro un cliente con PAR: FK `par_header.client_id` lo impide.
- Si borro un cliente con equipos: FK `equipment.client_id` (ON DELETE RESTRICT) lo impide.
- `lib/api.js` conserva únicamente `getClients` y `syncClients` para clientes; no existen wrappers CRUD locales porque el contrato solo expone consulta y sincronización Saint.
- Sync overwrite: un cambio local se pierde en el próximo sync.

### Reglas de modificación para este módulo
- Antes de tocar: `hooks/par/useParCatalogs`, `ClientSearch`, `GlobalSearch`, `dashboard/route.js`, `par.repository` JOIN.
- No eliminar `id`/`codclie`/`description`/`status`.
- Si cambio el contrato del GET, los tres consumidores frontend se rompen a la vez.

---

## 6. 🟡 Equipos (catálogo `equipment`)

### Descripción (1 línea)
Inventario de equipos de campo; la página `/equipos` está **cableada** a la API (CRUD completo). Dashboard y **PAR** leen la tabla (`GET /api/equipment?clientId=`).

### Archivos propios (rutas completas)
- `/app/(dashboard)/equipos/page.jsx` (UI conectada a la API)
- `/components/equipment/EquipmentCardGrid.jsx` (vista de cards)
- Los modales de detalle y creación/edición de Equipo usan `Modal size="2xl"` y comparten una distribución compacta de tres filas. “Tipo de Equipo” corresponde al campo técnico `name` y ocupa dos de cuatro columnas, igual que Cliente. No presentan ni envían el campo histórico `location`: `plant_id` es la ubicación operativa obligatoria; el backend conserva `location` temporalmente por compatibilidad.
- `/app/api/equipment/route.js`
- `/app/api/equipment/[id]/route.js`
- `/lib/repositories/equipment.repository.js`

### Entidades de BD que toca
- `equipment` (`name`, `brand`, `model`, `serial`, `client_id` FK → `client.id`, `status`)
- `client` (JOIN en solo lectura: `c.description AS client_name`)
- `par_equipment.equipment_id` → `equipment.id` (el cambio de `client_id` del equipo se bloquea — 409 — si hay un PAR que lo referencie, en cualquier estado)

### Dependencias ENTRANTES (¿quién NECESITA de este módulo?)
| Funcionalidad | Para qué lo necesita | Qué se rompe si cambio este módulo |
|---|---|---|
| Página `/equipos` | CRUD real (`getEquipment`, `createEquipment`, `updateEquipment`, `deleteEquipment`) | No se lista/crea/edita/da de baja inventario |
| Dashboard | Conteos `total` / `Operativo` de `equipment` | KPI equipos |
| PAR | Selector de equipos del cliente (`equipment_id` + snapshot tipo/marca/serial/modelo) | Form sin equipos del cliente; PARs ya guardados conservan snapshot |
| Órdenes | **ninguna FK**; OS guarda `equipment_name` texto | |

### Dependencias SALIENTES (¿de qué NECESITA este módulo?)
| Funcionalidad | Qué le presta | Qué se rompe en ESTE módulo si cambio el otro |
|---|---|---|
| Auth | API sin regla de roles (cualquier autenticado) | Añadir prefijo en `API_PERMISSIONS` puede 403 a `/equipos` al cargar |
| Clientes | **FK `client_id`** (un equipo pertenece a un cliente real; selector `ClientSearch` con `getClients()`) | Falta el cliente → POST/PUT rechaza; renombrar `client.description` sí actualiza el nombre mostrado (JOIN en vivo) |

### Flujo de datos crítico
1. Abrir `/equipos` → `GET /api/equipment` → tabla/cards del inventario (JOIN `client` → `client_name` en cada fila).
2. Crear/editar → `POST`/`PUT /api/equipment` con `clientId` obligatorio (UUID de `client`); dar de baja → `DELETE` (la API hace `updateStatus(id, 'Fuera de Servicio')`).
3. Dashboard SQL directo sobre `equipment` (JOIN `client` para el nombre). **No pasa por `/equipos`.**

### 🚨 Puntos de integración frágiles
- Si cambio campos `name`/`brand`/`model`/`serial`/`client_id`: página `/equipos` (form + columnas + filtro por cliente).
- Si cambio status (`Operativo` / `En Mantenimiento` / `Fuera de Servicio` / `Mudado` / `Desechado` / `Validar`): Dashboard + página + `EQUIPMENT_STATUS_VARIANTS`.
- El `serial` es `UNIQUE`: duplicarlo da 409. El form lo bloquea en edición.
- DELETE = soft-delete a `Fuera de Servicio` (no borra la fila) — por eso `par_equipment.equipment_id` no se rompe.
- `client_id` es `NOT NULL` con FK `ON DELETE RESTRICT`: no se puede borrar un cliente que tenga equipos.
- `PUT /api/equipment/[id]`: si cambia `client_id` y el equipo está referenciado en **algún** PAR (cualquier estado), responde 409 con los `PAR-###### (Estado)` (guard en `findParRefs`, `equipment.repository.js`).
- GlobalSearch “Equipos” tiene `data: []`.

### Reglas de modificación para este módulo
- Antes de tocar API/repo: `dashboard/route.js` y la página `/equipos`.
- No dropear `id` ni `serial` unique sin revisar `par_equipment.equipment_id`.
- Los nombres del body/JSON son snake_case en respuesta (`client_id`, `client_name`); el form los mapea a camelCase al enviar.
- Al tocar `PUT /api/equipment/[id]`, respetar el guard de reasignación (`findParRefs` → 409).
- Migración `db/migrations/025-equipment-client-fk.sql`: agrega la FK, siembra equipos de ejemplo ligados a clientes reales y elimina la columna `client_description`. **Solo forward.**

---

## 7. 🟡 Plantillas PAR

### Descripción (1 línea)
Recetas de ítems reutilizables; solo existen para pegarse en `ParForm` (no quedan ligadas al PAR creado).

### Archivos propios (rutas completas)
- `/app/(dashboard)/par/plantillas/page.jsx`
- `/app/(dashboard)/par/plantillas/nueva/page.jsx`
- `/app/(dashboard)/par/plantillas/[id]/page.jsx`
- `/app/api/par-template/route.js`
- `/app/api/par-template/[id]/route.js`
- `/components/par/ParTemplateForm.jsx`
- `/lib/repositories/par-template.repository.js`
- `/lib/validators/par-template.schema.js`

### Entidades de BD que toca
- `par_template` (`type`, `name`, `description`)
- `par_template_item` (`product_id` ON DELETE SET NULL, qty, precios, `categoria`)

### Dependencias ENTRANTES (¿quién NECESITA de este módulo?)
| Funcionalidad | Para qué lo necesita | Qué se rompe si cambio este módulo |
|---|---|---|
| PAR | Modal cargar plantilla → `appendItem` | El form sigue sirviendo, pero sin atajo de ítems |

### Dependencias SALIENTES (¿de qué NECESITA este módulo?)
| Funcionalidad | Qué le presta | Qué se rompe en ESTE módulo si cambio el otro |
|---|---|---|
| Productos | Catálogo + JOIN nombre/código | Formulario sin productos; ítems con `product_id` huérfano (NULL al borrar producto) |
| Auth | Permisos heredados de `/api/par` | Reordenar `API_PERMISSIONS` puede abrir o cerrar plantillas sin querer |

### Flujo de datos crítico
1. Usuario CRUD en `/par/plantillas*` → `/api/par-template` (ítems se reemplazan en transacción).
2. En `ParForm`, “Cargar plantilla” trae el detalle y **copia** ítems al form.
3. El PAR guardado **no** referencia `par_template.id`.

### 🚨 Puntos de integración frágiles
- Si cambio shape de ítem (`product_id`, `descripcion`, `qty`, `valor_unit_usd`, …): `handleLoadTemplate` en `ParForm.jsx` mapea snake_case → camelCase a mano.
- Si cambio `type` (`Servicio` \| `Ventas`): filtro del modal PAR + `PAR_TEMPLATE_TYPES`.
- Borrar plantilla no altera PARs ya emitidos.

### Reglas de modificación para este módulo
- Antes de tocar: `ParForm.handleLoadTemplate` y `ParTemplateForm` (`getProducts`).
- Si cambio el endpoint, verificar `lib/api.js` (`getParTemplates*`).

---

## 8. 🟡 Configuración

### Descripción (1 línea)
Singleton empresa + tasa BCV + sync de ubicación Saint + matriz de permisos (solo lectura).

### Archivos propios (rutas completas)
- `/app/(dashboard)/configuracion/page.jsx`
- `/app/api/configuration/route.js`
- `/app/api/ubicacion/country/route.js`
- `/app/api/ubicacion/state/route.js`
- `/app/api/ubicacion/city/route.js`
- `/components/config/PermissionsMatrix.jsx`
- `/lib/repositories/configuration.repository.js`
- `/lib/repositories/location.repository.js`

### Entidades de BD que toca
- `configuration` (`id=1`, `company_name`, `exchange_rate`, logo, contacto)
- `country`, `state`, `city`

### Dependencias ENTRANTES (¿quién NECESITA de este módulo?)
| Funcionalidad | Para qué lo necesita | Qué se rompe si cambio este módulo |
|---|---|---|
| PAR | Prefill `exchange_rate` en form nuevo | Tasa 0 en PARs nuevos; `total_bs` mal |
| Clientes | JOIN `country`/`state` por `cod_saint` | Nombres de país/estado vacíos |
| PermissionsMatrix | Lee `PAGE_PERMISSIONS` / `API_PERMISSIONS` | Matriz desfasada (no escribe permisos) |

### Dependencias SALIENTES (¿de qué NECESITA este módulo?)
| Funcionalidad | Qué le presta | Qué se rompe en ESTE módulo si cambio el otro |
|---|---|---|
| Saint | Sync ubicación | Botones sync fallan |
| Auth | Solo Admin/Supervisor | |

### Flujo de datos crítico
1. Página carga `GET /api/configuration` (empresa + tasa).
2. Guardar tasa `PUT` snake_case `{ exchange_rate }`.
3. `ParForm` al montar copia la tasa si el campo está vacío/0 — **una vez**.
4. Sync ubicación escribe `country`/`state`/`city`; el próximo `GET /api/client` resuelve nombres.

### 🚨 Puntos de integración frágiles
- Si cambio `exchange_rate`: PAR nuevos y recálculo `total_bs` de PAR que **ya** tienen esa tasa en el header (los viejos no se enteran).
- Si cambio keys del PUT (`company_name` vs camelCase): la página de config usa snake_case; el resto del API suele camelCase.
- Si dropeo `country.cod_saint`: JOIN de clientes.
- `PermissionsMatrix` no persiste: editarla no cambia `proxy.js`.

### Reglas de modificación para este módulo
- Antes de tocar tasa: `ParForm` useEffect de `getExchangeRate`, la ruta limitada `/api/configuration/exchange-rate` y `recalcTotals`.
- Antes de tocar ubicación: `client.repository.js` JOIN.
- No borrar la fila `configuration.id = 1` (trigger anti-DELETE).

---

## 9. 🟡 Usuarios

### Descripción (1 línea)
CRUD de cuentas y roles; es la misma tabla que autentica y que PAR referencia como autor/aprobador.

### Archivos propios (rutas completas)
- `/app/(dashboard)/usuarios/page.jsx`
- `/app/api/user/route.js`
- `/app/api/user/[id]/route.js`
- `/app/api/roles/route.js`
- `/components/users/UserFormModal.jsx`
- `/components/users/UserCardGrid.jsx`
- `/components/users/UserViewModal.jsx`
- `/lib/repositories/user.repository.js`

### Entidades de BD que toca
- `users` (`login`, `email`, `name`, `password_hash`, `role_id`, `status`)
- `role`

### Dependencias ENTRANTES (¿quién NECESITA de este módulo?)
| Funcionalidad | Para qué lo necesita | Qué se rompe si cambio este módulo |
|---|---|---|
| Auth | `findByLogin` + `status` + hash | Nadie entra; rol en JWT mal |
| PAR | `created_by` / `approved_by` + JOIN nombres | Create/aprobación; columnas `created_by_name` |
| Dashboard | **no** lista usuarios | |

### Dependencias SALIENTES (¿de qué NECESITA este módulo?)
| Funcionalidad | Qué le presta | Qué se rompe en ESTE módulo si cambio el otro |
|---|---|---|
| Auth | Solo Admin llama `/api/user` y `/api/roles` | |

### Flujo de datos crítico
1. Admin crea usuario (bcrypt, `roleId` numérico) → `users`.
2. Esa persona hace login → JWT con `role.name`.
3. Crea/aprueba PAR → FKs a `user.id`.
4. Soft-delete = `Inactivo` (login bloqueado en el **próximo** authorize, no revoca JWT).

### 🚨 Puntos de integración frágiles
- Si cambio `role.name` o ids sembrados: JWT, `lib/permissions.js`, Sidebar, `ROLE_VARIANTS`.
- Si hard-delete usuario con PAR: FK.
- `user.schema.js` **no** lo usa la API (`roleId` UUID incorrecto); el modal manda `Number(roleId)`.
- Técnicos **no** se crean aquí (tabla distinta, sin `user_id`).

### Reglas de modificación para este módulo
- Antes de tocar: `auth.js` y JOINs de `par.repository.js`.
- No eliminar `login`/`password_hash`/`status`/`role_id`.

---

## 10. 🟡 Dashboard

### Descripción (1 línea)
Home con KPIs SQL de órdenes/clientes/equipos/técnicos; gráficos de tendencia aún mock.

### Archivos propios (rutas completas)
- `/app/(dashboard)/dashboard/page.jsx`
- `/app/api/dashboard/route.js`
- `/components/charts/*` (compartidos con Reportes)
- `/data/dashboard.js` (mock de varios charts)

### Entidades de BD que toca
- Lee: `service_order`, `client`, `equipment`, `technical`
- **No lee:** `par_header`, `users`, `product`

### Dependencias ENTRANTES (¿quién NECESITA de este módulo?)
Ninguna. Nadie importa al Dashboard.

### Dependencias SALIENTES (¿de qué NECESITA este módulo?)
| Funcionalidad | Qué le presta | Qué se rompe en ESTE módulo si cambio el otro |
|---|---|---|
| Órdenes | Conteos, revenue Completada, `recentOrders` (aliases camelCase) | KPIs y tabla recientes |
| Clientes | `total` / `active` | KPI clientes (hoy `active` queda 0 si status es `'1'`) |
| Equipos | total, `Operativo` | KPI equipos |
| Técnicos | total / `Activo` | KPI interno (`kpis.technicians`); la home **no pinta** ese KPI en los StatCards (sí orders/clients/equipment/revenue) |
| Auth | Nombre para saludo | |
| `data/dashboard.js` | RevenueLine, ServicesBar, PerformanceArea, TechniciansRadial | Esos gráficos no reflejan BD |

`OrdersDonutChart` en Dashboard **sí** recibe `stats.ordersByStatus` (API real).

### Flujo de datos crítico
1. Home monta → `getDashboard()` → SQL directo (no repos).
2. Respuesta camelCase (`orderCode`, `inProgress`, …) distinta al resto de APIs.
3. Charts de línea/barra/área/radial ignoran esa respuesta y leen mock.

### 🚨 Puntos de integración frágiles
- Si cambio status de OS/equipos/clientes/técnicos: los `FILTER WHERE` del route.
- Si normalizo JSON a snake_case: `dashboard/page.jsx` (`row.orderCode`, `kpis.orders.inProgress`).
- Si añado KPI de PAR: hay que escribirlo; **no está**.
- Compartir charts con Reportes: cambiar un chart mock afecta ambas páginas.
- El listado de mantenimientos acepta `month`/`year` (LIMIT 6); `dashboard/page.jsx` (select de meses + auto-avance) consume ese contrato.

### Reglas de modificación para este módulo
- Antes de tocar el route: páginas Dashboard y los `FILTER` de status ajenos.
- No asumir que existe dato de PAR o de usuarios.

---

## 11. 🟢 Técnicos

### Descripción (1 línea)
CRUD de personas de campo (`technical`); no hay FK desde órdenes ni desde usuarios.

### Archivos propios (rutas completas)
- `/app/(dashboard)/tecnicos/page.jsx`
- `/app/api/technical/route.js`
- `/app/api/technical/[id]/route.js`
- `/components/technical/TechnicalFormModal.jsx`
- `/components/technical/TechnicalViewModal.jsx`
- `/components/technical/TechnicalCardGrid.jsx`
- `/lib/repositories/technical.repository.js`
- `/app/(dashboard)/calendario-tecnicos/page.jsx` (stub, cero datos)

### Entidades de BD que toca
- `technical` (`cedula`, `name`, `phone`, `email`, `status`)

### Dependencias ENTRANTES (¿quién NECESITA de este módulo?)
| Funcionalidad | Para qué lo necesita | Qué se rompe si cambio este módulo |
|---|---|---|
| Dashboard | `COUNT` total/Activo | Campo `kpis.technicians` (poco visible en UI) |
| Órdenes | **no** (texto `technician_name`) | Asignar técnico en OS **no** se rompe al cambiar esta tabla |
| Calendario | futuro | Hoy nada |

### Dependencias SALIENTES (¿de qué NECESITA este módulo?)
| Funcionalidad | Qué le presta | Qué se rompe en ESTE módulo si cambio el otro |
|---|---|---|
| Auth | Roles Admin/Supervisor/Coordinador | |
| Usuarios | **ninguna** | Crear rol “Técnico” **no** crea fila en `technical` |

### Flujo de datos crítico
1. CRUD `/tecnicos` → `/api/technical`.
2. Dashboard cuenta la tabla.
3. Órdenes/PAR **no** participan.

### 🚨 Puntos de integración frágiles
- Si se cablea un dropdown en Órdenes: habrá que crear la relación; hoy no existe.
- Si se unifica técnico↔usuario: impacto en Auth y en `technical` (hoy independientes).
- GlobalSearch “Técnicos” está con `data: []`.
- Soft-delete `Inactivo`: Dashboard `active` baja; PAR no se entera.

### Reglas de modificación para este módulo
- Antes de ligarlo a OS/PAR: no hay consumidores de `getTechnicians` fuera de `/tecnicos`.
- No inventar `user_id` sin migración y sin confirmar el modelo.

---

## 12. 🟡 Reportes PDF (2026-10-22)

Selección y filtros → consulta autenticada → PDF generado en servidor → vista previa y descarga del mismo archivo. Guía de uso y contratos: `docs/reportes.md`.

| Origen | Consumidor / contrato |
|---|---|
| `ReportFilters` y `ReportPreview` | Rutas `/reportes` y `/reportes/vista`, filtros en URL y descarga del Blob mostrado |
| `lib/reports.js` | Tipos, estados, zona America/Caracas, formatos y sumas exactas en centésimas |
| `report.schema.js` | Validación de fechas, UUID y filtros específicos por reporte |
| `lib/api.js` → `/api/reports` | Generación binaria, errores JSON como Blob, timeout de 120 s |
| `lib/permissions.js` + `lib/reports/api.js` | Mismos roles en página y API; sesión activa, sin caché compartida |
| `par_header`, cliente, planta y estados de O/S | PAR por cliente; estado derivado idéntico a `par.repository` |
| `service_order_labor_allocation` + `service_order.closed_at` | Estimadas/reales confirmadas por técnico, sumas y órdenes distintas |
| `service_order_technician` | Filtro histórico de órdenes antiguas sin asignaciones confirmadas |
| `configuration` + `public/Logo.png` | Datos de empresa y logo local del PDF |
| `@react-pdf/renderer` 4.9.0 + `lib/reports/pdf.jsx` | Plantillas A4 horizontal, cabeceras/columnas repetidas, totales y páginas |

### Contratos que deben conservarse

- El reporte PAR filtra la fecha de creación; el de técnicos, la fecha de cierre. Rangos de días inclusivos en Venezuela. No confundir fecha de emisión, programación y cierre.
- Cambios en la regla de `display_status` de PAR requieren actualizar la expresión de `report.repository` para que pantalla, filtro y PDF coincidan.
- La comparación de técnicos incluye las mismas órdenes cerradas para ambos valores. Requiere todas las asignaciones confirmadas, revisión histórica resuelta y al menos una asignación. Cero real es válido; NULL no participa.
- Preservar la identidad de técnico/renglón. Unir equipos o archivos al agregado multiplica horas incorrectamente. Contar O/S distintas en resumen y total general.
- Los cierres antiguos sin fecha se advierten fuera del período; no inventar fechas ni repartir horas históricas. Los clientes y técnicos inactivos siguen consultables.
- Una transacción de lectura REPEATABLE READ captura detalle, totales y configuración. Máximo 2.000 renglones y 20 s por sentencia; se rechaza el exceso sin devolver un documento parcial.
- Descargar no ejecuta otra consulta: usa el mismo Blob. Actualizar o volver a entrar sí genera un documento nuevo. No persistirlo en carpeta pública.
- No hay nuevas tablas ni migraciones; requiere 051 y 052. No incluye comisiones ni pagos.
- El módulo ya no depende de los gráficos del Dashboard. Esos componentes siguen disponibles para sus otros consumidores.

---

## Apéndice — módulos stub / transversales

| Módulo | Archivos | Dependencias |
|---|---|---|
| Vendedores | `/app/(dashboard)/vendedores/page.jsx` | Ninguna (placeholder). Nav sí exige rol. |
| Calendario técnicos | `/app/(dashboard)/calendario-tecnicos/page.jsx` | Ninguna. Candidato futuro a Técnicos + Órdenes. |
| Perfil | `/app/(dashboard)/perfil/page.jsx` | `useAuth` + `getNotifications` (mock). |
| Notificaciones | `/app/api/notification/*`, `/components/layout/NotificationsMenu.jsx`, `/data/notifications.js` | Topbar + Perfil. Repo `notification.repository.js` **no usado**. Cambiar el mock no toca BD. |
| `lib/api.js` | wrappers axios | Contrato único frontend↔API. Renombrar una función rompe el módulo caller. |
| `lib/status.js` | variantes de badges | Productos, PAR, Órdenes, Equipos, Usuarios, Clientes. Cambiar keys = badges grises. |

---

## Índice rápido — “si toco X, revisa Y”

| Si modificas | Revisa primero |
|---|---|
| `product.type` / `category` / `price` | `ParForm.jsx`, `ParTemplateForm.jsx` |
| `product` DELETE / `status` | FKs `par_item`, `par_template_item` (equipos del PAR ya no tienen `product_id`) |
| `client.status` / `codclie` / `description` | PAR JOIN + `ClientSearch` + GlobalSearch + Dashboard KPI + Equipos (JOIN `client_name`) |
| `client` DELETE | `par_header.client_id` y `equipment.client_id` (RESTRICT) |
| `equipment` API o campos de catálogo | Página `/equipos` |
| `equipment.client_id` | Página `/equipos` (form `ClientSearch` + filtro por cliente); el cambio se bloquea (409) si hay un PAR que lo referencie |
| `equipment` DELETE | `par_equipment.equipment_id` (FK, no bloquea porque DELETE = soft-delete; el snapshot tipo/marca/serial/modelo se conserva en el PAR) |
| `service_order.status` / `par_id` / `amount` | `par.repository` `display_status` y bloqueo de edición, `par-policy`, pantalla del PAR, `dashboard/route.js` |
| `par_header.status` o PATCH | UI PAR, **no** reescribe OS |
| `configuration.exchange_rate` | Solo PAR **nuevos** (`ParForm` prefill) |
| `country`/`state` sync | JOIN en `client.repository.js` |
| `users` status/rol/DELETE | `auth.js`, JWT, FKs PAR, `/usuarios` |
| JWT shape / `proxy.js` / permissions | Todo el panel + prefijo `/api/par` vs `/api/par-template` |
| Charts / `data/dashboard.js` | Dashboard **y** Reportes |
| Página `/ordenes` | La UI no llama a la API (simulada); el backend igual alimenta PAR/Dashboard. `/equipos` **sí** está conectado a la API |

---

## Registro de línea base — Fase 0 (2026-09-17)

La inspección inicial confirmó que el mapa funcional corresponde a la estructura actual del repositorio y de la base de datos:

- Aplicación Next.js 16.3.4 con JavaScript, React 19 y `proxy.js`; no se detectó TypeScript.
- Se instaló correctamente con `npm ci --ignore-scripts` usando una caché temporal. ESLint quedó en `^9.39.5` y se actualizó `package-lock.json` para evitar incompatibilidades con los plugins de `eslint-config-next`.
- `npm run build` finaliza correctamente. `npm run lint` se ejecuta, pero reporta 2 errores preexistentes en el Dashboard y 8 advertencias en Dashboard, layout, `ParForm` y Axios; no se corrigieron durante la Fase 0.
- npm reportó 6 vulnerabilidades (1 moderada, 3 altas y 2 críticas). No se ejecutó `npm audit fix` automáticamente.
- PostgreSQL `db_service`, versión 18.6, accesible mediante MCP en modo solo lectura.
- Tablas funcionales verificadas: `client` (1906), `equipment` (9), `product` (23), `par_header` (3), `par_item` (9), `par_equipment` (3) y `service_order` (0), además de catálogos, usuarios, roles, configuración y notificaciones.
- Los registros actuales no presentan PAR incompletos, totales inconsistentes, auditorías de aprobación ausentes ni órdenes asociadas a PAR no aprobados.
- En PAR: `par_item.descripcion` es nullable en BD aunque la aplicación lo exige; no hay unicidad de `item_no` por PAR; no hay restricción de único equipo principal; faltan índices en algunas FKs, especialmente `par_header.approved_by` y `par_item.product_id`.
- `par_number_seq` existe y está alineada con el máximo PAR observado (8). La base no tiene tabla pública de historial de migraciones.
- Las restricciones, índices y secuencias de PAR mantienen nombres heredados `par_v2_*`; cualquier normalización debe ser gradual y compatible.
- Git ignora actualmente los archivos Markdown mediante `*.md`; ajustar el versionado de estos archivos guía queda reservado para la Fase 8.

Toda modificación futura debe actualizar este registro y la sección del módulo afectado. No se debe avanzar de fase sin aprobación explícita del usuario.

## Registro de Fase 1 — correcciones críticas (2026-09-17)

- Axios dejó de sobrescribir `status` de entidades; los metadatos HTTP se exponen como `httpStatus`, `httpStatusText` y `httpHeaders`.
- Saint usa ahora una URL base sin `/api/clientes`; el módulo conserva sus endpoints específicos.
- Los repositorios de equipos manejan correctamente un `UPDATE` sin filas afectadas y permiten devolver 404 desde la API.
- El validador de usuarios acepta `roleId` como entero positivo, consistente con `users.role_id` y con `UserFormModal`.
- ESLint excluye `.kilo/**` para no analizar worktrees auxiliares fuera de la aplicación.
- No se modificaron autenticación, permisos, proxy, migraciones ni reglas de negocio PAR.
- El esquema de usuario fue probado con `roleId` numérico y valor inválido. `npm run build` finaliza correctamente. `npm run lint` reporta 1 error existente en Dashboard y 4 advertencias; quedan pendientes para fases posteriores.

## Registro de Fase 3 — integridad PAR (2026-09-18)

- En esta fase se implementó `FOR UPDATE` y edición solo en `Creado`; el contrato de edición fue ampliado el 2026-10-21 a aprobados autorizados sin órdenes no canceladas, según la sección vigente al inicio de este archivo.
- El bloqueo aplica a cabecera, ítems y equipos, incluyendo endpoints anidados.
- Las transiciones PAR se validan de forma atómica; aprobación y rechazo quedan limitados a Administrador y Supervisor.
- La vinculación de órdenes valida dentro de una transacción que el PAR exista y esté en `Aprobado`; `En Servicio` y `Finalizado` son estados derivados y no aceptan nuevas vinculaciones.
- Errores de PAR inexistente, bloqueado o no aprobado se traducen a 404, 403 y 409 respectivamente.
- `display_status` sigue siendo derivado y los totales continúan calculándose en el servidor.
- No se tocaron migraciones ni la base real.
- Pruebas: matriz de permisos y build pasan; lint mantiene 1 error y 4 advertencias preexistentes.

## Registro de Fase 2 — seguridad y permisos (2026-09-18)

- `lib/permissions.js` aplica denegación por defecto y comparación de prefijos con límites de ruta.
- Las APIs están registradas explícitamente; `/api/par-template` se evalúa antes de `/api/par` y `/api/client/sync` antes de `/api/client`.
- Dashboard, notificaciones y consulta de clientes están disponibles para todos los roles autenticados.
- Órdenes y equipos están disponibles para Administrador, Supervisor, Coordinador y Técnico.
- Sincronización Saint de clientes queda limitada a Administrador y Supervisor.
- `auth.js` revalida estado y rol del usuario contra PostgreSQL durante la actualización del JWT; `proxy.js` bloquea sesiones no activas.
- Se añadió `spec/permissions.test.mjs` y el script `npm run test:permissions`.
- La prueba de permisos y el build pasan; lint conserva 1 error y 4 advertencias previas en módulos no modificados.
## Cierre de pendientes Fases 0–3 (2026-09-18)

### Inventario Fase 0

- Tablas públicas verificadas (17): `city`, `client`, `configuration`, `country`, `equipment`, `notification`, `par_equipment`, `par_header`, `par_item`, `par_template`, `par_template_item`, `product`, `role`, `service_order`, `state`, `technical`, `users`.
- Secuencias públicas verificadas (11): `city_id_seq`, `country_id_seq`, `par_number_seq`, `par_template_id_seq`, `par_template_item_id_seq`, `par_v2_equipment_id_seq`, `par_v2_headers_id_seq`, `par_v2_items_id_seq`, `role_id_seq`, `service_order_id_seq`, `state_id_seq`.
- No existe tabla pública de historial de migraciones.

- `npm test` ejecuta permisos, regresiones de Fase 1 y políticas PAR.
- Nuevas pruebas: `spec/phase1.test.mjs` y `spec/par-policy.test.mjs`; la matriz de permisos cubre cada regla contra todos los roles.
- Las reglas PAR compartidas viven en `lib/par-policy.js` y son consumidas por repositorios y pruebas.
- Se corrigió el único error de lint del Dashboard; lint queda en 0 errores y 4 advertencias existentes.
- Las rutas de ubicación y sincronización Saint devuelven mensajes públicos genéricos y registran el detalle solo en servidor.
- `.gitignore` exceptúa los dos archivos guía, `README.md` y `.env.example` para que sus cambios sean visibles en Git.
- Validación: `npm test`, `npm run lint` y `npm run build` exitosos.
- Las decisiones funcionales de Fase 3 quedaron resueltas en la sección de resolución correspondiente.

### Verificación final solicitada

- La lista de tareas Fases 0–3 fue contrastada con el código y las pruebas actuales.
- La regla vigente es Configuración solo Supervisor, `approved_by`/`approved_at` conservados al rechazar y vinculación de órdenes solo con PAR `Aprobado`.
- Las pruebas de regresión cubren Axios, Saint, 404, permisos, estados PAR, bloqueo transaccional y cálculos monetarios.
## Resolución de decisiones Fase 3 (2026-09-18)

- Configuración está disponible exclusivamente para Supervisor, tanto en la página como en la API.
- `approved_by` y `approved_at` se conservan al rechazar un PAR previamente aprobado.
- La vinculación de órdenes acepta únicamente PAR persistidos en estado `Aprobado`.
## Registro de Fase 4 — validación uniforme (2026-09-18)

- Los módulos de equipos, productos, técnicos, órdenes y configuración comparten esquemas Zod en `lib/validators/operational.schema.js`.
- Se validan UUID, fechas, estados permitidos, números finitos, rangos y campos requeridos antes de persistir.
- `spec/validation.test.mjs` cubre entradas inválidas y valores numéricos no finitos.
- Las respuestas de validación usan 400; conflictos y ausencias mantienen 409 y 404 respectivamente.
- `npm test`, lint y build finalizan correctamente; lint conserva cuatro advertencias informativas.
## Registro de Fase 5 — base reproducible e integridad estructural (2026-09-18)

- Las migraciones `001`–`030` permanecen intactas.
- `db/schema.sql` es la ruta consolidada para instalaciones nuevas; `db/migrations/031-integrity-and-history.sql` es la ruta idempotente para bases existentes.
- `schema_migrations` registra versiones nuevas con checksum. `db/validate.sql` contiene las consultas de verificación posterior.
- Se documentaron en `db/MIGRATIONS.md` los procedimientos de instalación, actualización, respaldo y validación.
- La base actual fue consultada en modo lectura y no se modificó. La integridad previa permite aplicar 031 en una copia aislada.
- Con autorización explícita, 031 fue aplicada en la base de desarrollo y repetida para verificar idempotencia. `schema.sql` se probó en un esquema temporal con rollback.
- `schema_migrations` no es una dependencia funcional de la aplicación: ningún módulo runtime la consulta. Su eliminación no rompe la app, pero pierde el historial operativo y se recrea al ejecutar el runner de migraciones.
## Registro de Fase 6 — pruebas y automatización (2026-09-18)

- `npm test` reúne las pruebas de permisos, Axios/Saint, PAR, validadores y migraciones.
- `npm run test:coverage` genera cobertura nativa de Node para `spec/*.test.mjs`.
- `npm run verify` ejecuta la puerta completa de pruebas, lint y build.
- `.github/workflows/ci.yml` automatiza esa puerta en pushes y pull requests a `main`.
- La validación de esquema PostgreSQL se ejecuta aparte con `npm run db:test-schema` y rollback automático.

## Registro de Fase 7 — mantenibilidad del frontend (2026-09-18)

- `ParForm.jsx` usa `useParCatalogs` para separar carga de clientes/productos de la presentación y exponer estados de carga y error.
- Los esquemas de filas y etiquetas del formulario están centralizados en `components/par/parFormSchema.js`; la sección de resumen se aisló en `components/par/ParFormSummary.jsx`.
- Se eliminaron wrappers de clientes que apuntaban a `/api/client/:id` o intentaban crear/editar/eliminar clientes, rutas que no existen en el contrato actual. `getClients` y `syncClients` se conservaron.
- No se modificaron tokens visuales ni componentes UI compartidos. Órdenes de Servicio permanece fuera de esta fase y se abordará en una tarea exclusiva.

### Convención de carpetas frontend

- `components/par/`: componentes visuales propios de PAR.
- `components/par/sections/`: secciones visuales extraídas de formularios y vistas PAR.
- `hooks/par/`: hooks exclusivos de PAR; el punto de entrada actual es `useParCatalogs`.
- `lib/par/`: constantes y mapeos de negocio del PAR, sin JSX ni acceso directo a la interfaz.
- `components/ui/`: controles visuales compartidos entre módulos.
- Las páginas grandes de Productos, Equipos y Configuración permanecen en sus rutas actuales y son candidatas a extracción incremental de hooks, sin crear rutas paralelas ni duplicar contratos.
- El modal de plantillas de PAR se implementó en `components/par/modals/ParTemplateLoadModal.jsx`.
- Las secciones de equipos e ítems están separadas en `components/par/sections/ParEquipmentSection.jsx` y `ParItemsSection.jsx`; no queda un bloque visual duplicado dentro de `ParForm.jsx`.
- `lib/ui-errors.js` es la fuente común de mensajes públicos para errores HTTP y evita exponer mensajes internos en Productos, Equipos y Configuración.
- `PermissionState` se exporta desde `components/ui/EmptyState.jsx` para estados de acceso denegado.

## Estado canónico de documentación — Fase 8 (2026-09-18)

Esta sección prevalece sobre descripciones históricas anteriores del archivo.

- La aplicación usa NextAuth v5, JWT, Credentials y PostgreSQL; el README antiguo de autenticación simulada fue reemplazado.
- El KPI de clientes consulta `client.status = '1'`; los estados Saint no se documentan como `Activo` dentro de SQL.
- La tabla de usuarios actual es `users`.
- La migración de integridad vigente es `db/migrations/031-integrity-and-history.sql` y es idempotente.
- Configuración se permite exclusivamente a Supervisor.
- `schema_migrations` solo registra migraciones y no es consumida por la aplicación durante el runtime.
- La estructura de PAR vigente separa `components/par/sections`, `components/par/modals`, `hooks/par` y `lib/par`.
- Usuarios usa `userSchema`, `userUpdateSchema` y `userStatusSchema` desde `lib/validators/user.schema.js` en creación, actualización y cambio de estado; los errores de entrada responden 400 antes del repositorio.

## Mapa de dependencias vigente — plantas, contactos, órdenes y PAR (2026-09-19)

Esta sección corrige las referencias históricas que indicaban que Órdenes o la búsqueda global seguían simuladas.

### Cadena relacional obligatoria

```text
client
  └─ plant
      ├─ equipment
      ├─ contact
      ├─ service_order ── technical
      └─ par_header ── par_equipment / par_item
```

- `plant.client_id` define el propietario de la planta.
- `equipment.client_id + plant_id` debe coincidir con la misma planta.
- `contact.client_id + plant_id` debe coincidir con la misma planta.
- `service_order` depende obligatoriamente de cliente, planta, equipo, contacto y técnico.
- `par_header` depende obligatoriamente de cliente, planta y contacto.
- Cambiar cualquiera de estas relaciones requiere revisar validadores, repositorios, formularios, filtros y restricciones compuestas de 034.

### Archivos por módulo

| Módulo | UI | API / repositorio | Dependencias directas |
|---|---|---|---|
| Plantas | `app/(dashboard)/plantas/page.jsx`, `components/catalog/PlantCardGrid.jsx` | `app/api/plant/*`, `lib/repositories/plant.repository.js` | `client`; consumida por equipos, contactos, órdenes y PAR |
| Contactos | `app/(dashboard)/contactos/page.jsx`, `components/catalog/ContactCardGrid.jsx` | `app/api/contact/*`, `lib/repositories/contact.repository.js` | `client` + `plant`; consumida por órdenes y PAR |
| Órdenes | `app/(dashboard)/ordenes/page.jsx` | `app/api/service-order/*`, `lib/repositories/service-order.repository.js` | `par_header` obligatorio; hereda `client`, `plant`, `contact`, equipos e ítems; asigna 1–3 técnicos mediante `service_order_technician` |
| PAR | `components/par/ParForm.jsx`, `ParPreview.jsx`, `ParPrintSheet.jsx`, páginas `/par/*` | `app/api/par/*`, `lib/repositories/par.repository.js` | `client`, `plant`, `contact`, `equipment`, `product`, `users`; puede alimentar órdenes aprobadas |
| Equipos | `app/(dashboard)/equipos/page.jsx`, `components/equipment/EquipmentCardGrid.jsx` | `app/api/equipment/*`, `lib/repositories/equipment.repository.js` | `client` + `plant`; expone `consortium`, `hp`, `pressure` (PSI) |
| Dashboard | `app/(dashboard)/dashboard/page.jsx` | `app/api/dashboard/route.js` | JOIN sobre órdenes, cliente, planta, equipo, técnico y contacto; snapshots solo como fallback |
| Búsqueda global | `components/layout/GlobalSearch.jsx` | `app/api/search/route.js`, `lib/api.js#getGlobalSearch` | clientes, plantas, contactos, órdenes, equipos y técnicos |

### Contratos que no deben romperse

- Al cambiar el cliente en un formulario, se deben limpiar planta, equipo y contacto dependientes.
- Al cambiar la planta, se deben limpiar equipo y contacto dependientes.
- `contactId` es obligatorio en `parHeaderSchema`. La orden no lo recibe en su payload: lo deriva obligatoriamente del PAR.
- `par_header` ya no tiene `atencion`; no volver a enviar ni consultar ese atributo.
- Consultas de órdenes deben preferir los JOIN y mantener `COALESCE(relación, snapshot)` donde sea necesaria compatibilidad histórica.
- La presión del equipo se persiste en `equipment.pressure` y se presenta como PSI; no se almacena una cadena con la unidad.
- `/api/search` debe permanecer en `API_PERMISSIONS`; una nueva fuente de búsqueda requiere actualizar tanto su SQL como `GlobalSearch.jsx`.

### Migraciones y pruebas relacionadas

| Archivo | Responsabilidad |
|---|---|
| `db/migrations/032-service-order-relations.sql` | Crea plantas/contactos y normaliza relaciones de órdenes y equipos |
| `db/migrations/033-par-header-plant-backfill.sql` | Recupera la planta del PAR desde su equipo principal |
| `db/migrations/034-required-relations-and-par-contact.sql` | Elimina `atencion`, agrega contacto al PAR, aplica `NOT NULL`, seeds de contactos y claves compuestas |
| `db/schema.sql` | Estado consolidado para instalaciones nuevas |
| `db/validate.sql` | Consultas de integridad posterior |
| `spec/catalog-order.integration.test.mjs` | Integración PostgreSQL de catálogos, órdenes, rechazos, flujo completo y backfills 032/033 |
| `spec/migrations.test.mjs` | Verificación estática de migraciones y esquema |

`npm test` incluye pruebas de integración PostgreSQL y necesita acceso a la base configurada en `.env.local`. La prueba de catálogos crea esquemas temporales con rollback. La prueba de edición PAR usa un esquema temporal exclusivo y lo elimina en `finally`, porque verifica concurrencia entre transacciones confirmadas. Ninguna modifica datos funcionales permanentes.

### Dependencia de tasa de cambio del PAR

- `components/par/ParForm.jsx` → `lib/api.js#getExchangeRate` → `GET /api/configuration/exchange-rate` → `configuration.repository.findFirst()`.
- La respuesta pública contiene únicamente `exchange_rate`; no expone los demás campos de configuración.
- Roles permitidos: Administrador, Supervisor y Coordinador.
- `/api/configuration` continúa reservado a Supervisor. En `API_PERMISSIONS`, la regla específica `/api/configuration/exchange-rate` debe declararse antes de la regla general `/api/configuration`.

## Dependencias del rol Superadministrador (2026-09-19)

| Componente | Responsabilidad |
|---|---|
| `db/migrations/035-add-super-administrator-role.sql` | Crea idempotentemente el rol y registra la migración |
| `db/schema.sql` | Incluye el rol en instalaciones nuevas |
| `lib/permissions.js` | Define `ROLES.SUPER_ADMIN`, `isSuperAdmin` y `canAccessRole` |
| `proxy.js` | Aplica acceso absoluto solo a rutas registradas |
| `components/layout/Sidebar.jsx` | Muestra todos los módulos autorizados por la regla común |
| `components/config/PermissionsMatrix.jsx` | Representa el acceso efectivo del rol |
| `lib/par-policy.js` y `app/api/par/[id]/route.js` | Permiten revisión de PAR |
| `app/(dashboard)/productos/page.jsx` | Permite editar costos |
| `app/api/user/*` y `app/api/roles/route.js` | Evitan escalamiento y protegen cuentas Superadministrador |
| `lib/repositories/user.repository.js` | Consulta roles y cuenta Superadministradores activos |
| `scripts/assign-super-administrator.mjs` | Promoción controlada del primer usuario por login |

Contratos importantes:

- El bypass efectivo debe pasar por `canAccessRole`; las listas particulares de cada módulo no necesitan repetir `ROLES.SUPER_ADMIN`.
- Una lista vacía de roles representa una ruta desconocida y sigue denegada, incluso para Superadministrador.
- Los controles de integridad y estados siguen vigentes para este rol.
- Un Administrador normal no recibe el rol en `GET /api/roles` y no puede asignarlo enviando manualmente un `roleId`.
- El cambio de rol se refleja en la sesión después de renovar el JWT mediante cierre e inicio de sesión.
- La cuenta bootstrap actual en desarrollo es `ewil`, promovida y verificada como `Superadministrador` el 2026-09-19.

## Dependencias PAR → Orden de Servicio y Saint (2026-09-19)

```text
Saint client (activo)
  └─ plant
      ├─ contact
      └─ equipment
          └─ par_header (aprobado + observations)
              ├─ par_equipment
              ├─ par_item
              └─ service_order
                  └─ service_order_technician (1–3)
```

Contratos obligatorios:

- `service_order.par_id` es `NOT NULL` y `ON DELETE RESTRICT`.
- `service_order.work_description` se obtiene exclusivamente de las filas no vacías de `par_equipment.observaciones`, equipo principal primero. Cambiar esta regla requiere revisar repositorio, catálogo, formulario, migración y pruebas.
- `prepared_by` siempre es el usuario de sesión que crea la orden. `approved_by` y `approved_at` solo se sellan en la transición a `Aprobada`.
- El payload de creación no incluye `clientId`, `plantId`, `contactId`, `equipmentId`, `preparedBy`, `approvedBy` ni `workDescription`; el servidor deriva todos esos valores.
- La primera entrada de `technicianIds` se conserva como principal. La aplicación y la base limitan la asignación a tres técnicos activos sin duplicados.
- El PAR puede originar varias órdenes. El estado visible del PAR continúa derivándose de sus órdenes no canceladas.
- Los snapshots heredados de `service_order` continúan por compatibilidad, pero las lecturas nuevas prefieren PAR, relaciones y `service_order_technician`.

Sincronización Saint:

- `client.codclie` es la clave natural externa; `client.id` sigue siendo la FK interna estable.
- `client.source_system`, `last_synced_at` y `last_seen_at` identifican procedencia y frescura.
- `integration_sync_run` registra inicio, fin, estado y conteos de cada sincronización.
- `syncManyFromSaint` usa transacción, upsert masivo y `pg_advisory_xact_lock`; no deben reintroducirse actualizaciones registro por registro.
- Clientes con `status = '0'` permanecen visibles en el historial, pero no pueden originar nuevas plantas, contactos, equipos, PAR u órdenes.
- Una ausencia en el payload no implica desactivación, porque el servicio Saint podría responder parcialmente.

Archivos principales:

| Archivo | Responsabilidad |
|---|---|
| `db/migrations/036-normalize-service-orders.sql` | PAR obligatorio, campos operativos, auditoría y técnicos múltiples |
| `db/migrations/037-saint-client-sync-audit.sql` | Metadatos del cliente y bitácora de integración |
| `db/migrations/038-service-order-par-scope.sql` | FKs compuestas que impiden desacoplar la orden de cliente, planta, contacto o equipo del PAR |
| `db/migrations/039-par-work-description-required.sql` | Cambio histórico posteriormente corregido por 040 |
| `db/migrations/040-use-equipment-description-for-orders.sql` | Usa `par_equipment.observaciones` como fuente y devuelve `par_header.observations` a opcional |
| `db/migrations/041-par-equipment-description-required.sql` | Hace obligatoria y no vacía la descripción de cada equipo del PAR |
| `lib/repositories/service-order.repository.js` | Derivación segura desde PAR, transiciones y asignaciones |
| `app/api/service-order/catalogs/route.js` | Contexto de PAR aprobados para el formulario |
| `app/(dashboard)/ordenes/page.jsx` | Formulario PAR-first y datos heredados de solo lectura |
| `lib/repositories/client.repository.js` | Upsert Saint masivo, atómico y auditable |
| `scripts/validate-database.mjs` | Verifica migraciones 036/037 y ausencia de órdenes incompletas (`npm run db:validate`) |

## Dependencias de presentación de Órdenes de Servicio (2026-09-19)

```text
app/(dashboard)/ordenes/page.jsx
  ├─ useDebounce → búsqueda compartida
  ├─ useLocalStorage("mq-ordenes-view") → preferencia tabla/cards
  ├─ SearchInput + ClientSearch + Select → filtros visibles
  ├─ DataTable → vista tabular
  └─ ServiceOrderCardGrid → tarjetas y paginación
       └─ /ordenes/[id] → documento completo

/ordenes/nueva
  └─ ServiceOrderForm → creación desde PAR aprobado
       ├─ ParSearch → búsqueda y selección contextual del PAR
       └─ TechnicianSelector
            └─ Modal → técnicos activos, selección temporal y principal

/ordenes/[id]
  ├─ ServiceOrderForm → edición de órdenes pendientes
  ├─ ServiceOrderPreview → vista documental en pantalla
  ├─ ServiceOrderPrintSheet → hoja A4 de impresión
  └─ service-order-policy → permisos y estados editables
```

La página filtra primero `rows` y entrega `visibleRows` tanto a `DataTable` como a `ServiceOrderCardGrid`; no se deben implementar búsquedas distintas dentro de cada vista. Tabla y tarjetas navegan a `/ordenes/[id]` y no deben reintroducir modales de creación, edición o detalle.

Contratos de estado:

- `lib/service-order-policy.js` es la fuente compartida de permisos de aprobación y reglas de presentación.
- `service-order.repository.js` aplica el bloqueo real: edición general solo en `Pendiente`; horas trabajadas únicamente en `En Proceso`.
- `app/api/service-order/[id]/route.js` deriva el permiso de aprobación desde la sesión y nunca desde el payload.
- La ruta de creación es `/ordenes/nueva`. Los nombres nuevos del flujo de interfaz deben permanecer en español.
- `ParSearch` consume exclusivamente `pars` del catálogo de órdenes; el servidor sigue siendo quien valida que el PAR esté aprobado al crear.
- `TechnicianSelector` recibe el catálogo completo, permite agregar únicamente técnicos con estado `Activo` y conserva técnicos históricos solo para representación y reemplazo.
- El orden de `technicianIds` es contractual: el índice cero representa al técnico principal.
- `db/migrations/042-service-order-automatic-number.sql` → `service_order_number_seq` → valor predeterminado de `service_order.order_code` → `service-order.repository.create()` omite el código → PostgreSQL asigna el siguiente `OS-000000`.
- El formulario representa `orderCode` como solo lectura y nunca lo incluye en el payload de creación o edición.
- `/ordenes/nueva` coloca la acción de envío después de `ServiceOrderForm` mediante el atributo `form="service-order-create-form"`; no reintroducir el botón de creación en el encabezado.
- `ServiceOrderForm` usa `useAuth()` solo para anticipar visualmente “Creado por”. La autoridad persiste en la API: `prepared_by` y `approved_by` siempre se derivan de la sesión autenticada.
- `ServiceOrderPreview` muestra “Creado por” una sola vez, en la sección inferior junto a “Aprobado por”. Ambas líneas permanecen en la parte superior de sus columnas para conservar la alineación aunque uno de los bloques incluya información adicional de aprobación.

## Dependencias del Calendario de Técnicos (2026-09-19)

```text
service_order (approved_by + approved_at + scheduled_start/end)
  └─ service_order_technician
       └─ technical
            └─ users (technical.user_id, solo para alcance de Mi agenda)
                  ↓
GET /api/technician-calendar
  ↓
TechnicianCalendar.jsx
  └─ FullCalendar React: Mes / Semana / Día / Agenda
```

| Componente | Responsabilidad |
|---|---|
| `db/migrations/043-technician-calendar.sql` | Relación única técnico/usuario, auditoría de aprobación e índices de rango |
| `lib/repositories/technician-calendar.repository.js` | JOIN de órdenes aprobadas, filtros, catálogos y alcance por usuario |
| `lib/technician-calendar-policy.js` | Elegibilidad y detección pura de solapamientos |
| `app/api/technician-calendar/route.js` | Endpoint GET de solo lectura y validación del rango/filtros |
| `components/technician-calendar/TechnicianCalendar.jsx` | Interfaz FullCalendar, filtros, KPI, agenda y detalle |
| `lib/repositories/service-order.repository.js` | Validación transaccional previa a aprobación y confirmación de conflictos |
| `technical.user_id` | Identidad estable que limita al rol Técnico a su propia agenda |

### Tabla de estados visibles

| Estado en base de datos | Etiqueta visible | Color | Presencia en calendario |
|---|---|---|---|
| `Pendiente` | Pendiente | — | No aparece porque aún no fue aprobada |
| `Aprobada` | Programada · Pendiente de iniciar | Azul | Sí |
| `En Proceso` | En ejecución | Naranja | Sí |
| `Completada` | Completada | Verde | Sí, como histórico |
| `Cancelada` | Cancelada | — | No aparece |

`lib/technician-calendar-status.js` es la fuente visual compartida para etiquetas y colores de los tres estados que sí aparecen. El botón **Iniciar servicio** conserva la transición real `Aprobada → En Proceso`, pero exige confirmación antes de enviarla a la API.

Compatibilidad de presentación con FullCalendar React 7:

- `getFullCalendarEventStyle` transforma cada estado al contrato `color`, `contrastColor` y `className` aceptado por la versión instalada.
- No usar `backgroundColor`, `borderColor`, `textColor` ni `classNames` en los eventos enviados a FullCalendar 7: son propiedades heredadas y se ignoran, lo que deja todos los eventos con el color azul predeterminado.
- `mq-calendar-conflict` se entrega como una cadena en `className`; FullCalendar 7 no acepta un arreglo para esta propiedad.

Contratos que no deben romperse:

- Una orden pendiente o rechazada nunca aparece. La creación de la orden no crea ningún evento.
- El calendario se llena cuando la aprobación persiste juntos `approved_by` y `approved_at`.
- `En Proceso` y `Completada` siguen visibles como historial; `Cancelada` queda fuera de la consulta.
- No agregar `technician_schedule_event`, vacaciones, reuniones u otros eventos en esta iniciativa. Cualquier evento externo requiere un plan futuro separado.
- No crear métodos POST/PUT/PATCH/DELETE para `/api/technician-calendar`.
- Un usuario Técnico nunca puede ampliar su alcance enviando otro `technicianId`; el repositorio reemplaza ese filtro por el vínculo de sesión.
- Los límites de un solapamiento son estrictos: si una orden termina exactamente cuando comienza otra, no existe conflicto.
- La excepción de solapamiento solo se confirma durante la aprobación y el permiso se deriva de la sesión.

Dependencias npm:

- `@fullcalendar/react@^7.1.0`: componente y plugins estándar MIT (`daygrid`, `timegrid`, `list`, `interaction`, tema classic y locale español).
- `temporal-polyfill@^1.0.5`: peer dependency utilizada por FullCalendar 7.
- No se incorporaron plugins Premium ni vistas de recursos por técnico.
