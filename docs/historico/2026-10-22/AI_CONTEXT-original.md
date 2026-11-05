# AI_CONTEXT.md — Maquitech Panel Administrativo

## Estado canónico — reportes PDF (2026-10-22)

- Reportes ya es un módulo con datos reales: selección/filtros en `/reportes` y PDF en `/reportes/vista`. Sustituye los gráficos y exportaciones simuladas de esta ventana. Guía: `docs/reportes.md`.
- Primer reporte: todos los PAR, filtro opcional por cliente/estado visible/fecha de creación (`created_at`). Incluye número, fecha, cliente, planta, estado, horas presupuestadas e importe USD; totales del conjunto filtrado.
- El estado se deriva igual que en `par.repository`; filtrar En Servicio/Finalizado sobre `display_status`, no sobre el estado persistido de cabecera.
- Segundo reporte: horas estimadas y reales por técnico, solo O/S Completada con cierre confirmado y todas las asignaciones completas. Filtros por cliente/técnico/fecha de cierre. Resumen y detalle por técnico, orden y renglón.
- Estimadas = asignación `hours`; reales = asignación `actual_hours` una vez confirmado `closed_at`. Diferencia = reales menos estimadas. No duplicar horas uniendo equipos/documentos, no sumar el total de cabecera por cada técnico, no interpretar NULL como cero. O/S distintas por técnico y en el total general.
- Órdenes históricas sin cierre confirmado se excluyen y se informan por cliente/técnico sin atribuirlas al período. No sustituir la fecha de cierre por la programada ni por updated_at. Inactivos disponibles en catálogos para historial.
- Fechas inclusivas por día, zona `America/Caracas`; columnas timestamp sin conversiones DATE en WHERE. Lectura parametrizada REPEATABLE READ / READ ONLY con timeout 20 s por sentencia. Sumas en centésimas BigInt; límite explícito 2.000 renglones, sin truncar reportes.
- `GET /api/reports/catalogs` y `POST /api/reports` exigen sesión activa y permisos de Reportes: Superadministrador, Administrador, Supervisor, Coordinador. Prefijo registrado en `API_PERMISSIONS`; respuesta privada sin caché.
- Nueva dependencia `@react-pdf/renderer` 4.9.0: PDF generado en Node con `renderToBuffer`, logo local `public/Logo.png`, configuración de empresa, encabezados y páginas. Next 16.3.4 externaliza este paquete automáticamente. No hay migración adicional; necesita 051/052.
- Vista previa y descarga reutilizan exactamente el mismo Blob; Actualizar reporte crea uno nuevo. Filtros conservados en URL, limpieza de URL temporal al desmontar, cancelación de solicitudes obsoletas. No hay almacenamiento permanente de PDFs.
- Documentación de esta entrega aquí, en `APP_DEPENDENCIES.md` y `docs/reportes.md`; no se edita TAREAS.MD. No se añaden ni ejecutan pruebas automatizadas o funcionales.
- Comprobaciones de entrega: `npm run lint` sin errores (tres advertencias preexistentes), `npm run build` correcto y revisión de formato con `git diff --check` sin errores. La generación funcional del PDF no se ejecutó como prueba.

## Estado canónico — cierre de O/S, documentos y horas reales (2026-10-22)

Este contrato prevalece sobre las descripciones anteriores de equipos heredados completos, botón Completar y consumo de estimaciones de órdenes completadas. Guía de uso y operación: `docs/cierre-orden-servicio.md`.

- Crear/editar una O/S pendiente selecciona `equipmentIds` del PAR, al menos uno. `service_order_equipment` conserva datos descriptivos; la descripción, vista e impresión usan exclusivamente esa selección. Cliente/planta/contacto continúan derivados del PAR.
- **Cerrar O/S** abre `ServiceOrderClosure`: cuatro requisitos por equipo (Reporte de Servicio, Check List de Trabajo, Lista de Verificación Previa y Posterior). Cada requisito necesita archivos vigentes o No aplica con justificación; varios PDF/JPG/PNG de hasta 10 MB por archivo.
- Adjuntar, retirar, reemplazar, justificar y registrar horas reales: Superadministrador/Administrador/Supervisor/Coordinador, exclusivamente En Proceso. Cerrar: solo los tres primeros. Consulta: roles existentes del módulo, incluido Técnico. Nuevas rutas verifican sesión activa y rol; nunca reciben permisos en el JSON.
- La programación y `service_order_technician` permanecen intactos. Solo técnicos programados y sus asignaciones pueden reportar horas reales, con hasta dos decimales. Cero requiere una explicación. No rellenar reales automáticamente ni derivarlas de fechas.
- `service_order_labor_allocation.hours` y `service_order.worked_hours` conservan la estimación. La columna `actual_hours` de asignación admite borrador; la de cabecera solo se fija al cerrar, con `closed_by`/`closed_at`, notas y justificación de exceso.
- Saldo por renglón: presupuesto menos estimaciones abiertas menos reales de cierres con `closed_at`. Canceladas liberan todo. Cierres históricos sin ejecución confirmada conservan su reserva anterior. Un exceso real se permite con justificación; no cambia cantidades ni precios del PAR ni estimaciones de otras órdenes. No hay comisiones.
- Guardar horas no libera saldo. El cierre valida requisitos, disponibilidad de archivos, horas, equipos, rol y revisión histórica dentro de una transacción con bloqueo PAR → O/S. El PUT general no puede cerrar; responde `ORDER_CLOSURE_REQUIRED`.
- Todas las escrituras de expediente exigen `closure_revision`. Si cambió, devolver 409 y pedir actualizar; no sobrescribir ni cerrar un expediente distinto del revisado.
- Archivo retirado conserva contenido, metadatos y motivo. Reemplazar confirma nuevo archivo y retiro del anterior juntos. No aplica y archivos vigentes son excluyentes. Cada acción registra usuario/fecha e historial.
- Archivos privados vía `SERVICE_ORDER_DOCUMENTS_DIR`; fallback local `.private/service-order-documents`, ignorado por Git. En despliegue permanente usar carpeta absoluta persistente fuera del despliegue. Respaldar DB y carpeta, incluidos retirados. No servirla como carpeta pública.
- `service-order-storage.js` limita el cuerpo antes de parsear multipart, verifica firma/extensión/MIME/tamaño, usa UUID y sincroniza disco antes del COMMIT. Un fallo posterior puede dejar un huérfano; no borrar automáticamente ante COMMIT incierto. Descargas autenticadas sin caché comprueban SHA-256.
- Next 16.3.4: `experimental.proxyClientMaxBodySize: "12mb"`, necesario para 10 MB más multipart; ruta limita cuerpo a 11 MB. No hay nuevos paquetes npm.
- Migración `052-service-order-closure.sql` aplicada a la base configurada, tras respaldo. Se conservaron seis cierres anteriores (`closure_legacy=true`) y dos órdenes abiertas que deben confirmar sus equipos. No se inventaron horas reales ni documentos. `db/schema.sql` contiene la misma extensión.
- Respaldo previo de esta entrega: `C:\Users\Admin\AppData\Local\Temp\maquitech-before-closure-1792691450856.dump` (779782 bytes). Para operación permanente, establecer un respaldo externo periódico de DB y archivos.
- La documentación se agrega aquí, en `APP_DEPENDENCIES.md` y en la guía de cierre; no se modifica `Archivos Markdown/TAREAS.MD`.

- Comprobaciones de entrega: `npm run lint` sin errores (tres advertencias preexistentes), `npm run build` correcto sin advertencias de trazado y `git diff --check` sin errores de formato. No se agregaron ni ejecutaron pruebas funcionales o automatizadas en esta entrega.
- Las respuestas de escritura se construyen dentro de la transacción, con la revisión que se confirmó. Revisar horas históricas también incrementa `closure_revision` para invalidar expedientes abiertos en otras sesiones.

## Estado anterior — horas del PAR y asignación de técnicos (2026-10-22)

Esta sección sustituye la captura manual de `workedHours` y la selección independiente de `technicianIds` descritas en secciones históricas. No hay cálculo de comisiones en esta fase.

### Uso

1. En **Productos**, activar **Requiere técnico (mano de obra por horas)** para técnicos, especialistas, ayudantes u otros perfiles. Solo admite categoría `Servicio`; no se vuelve a crear `product.type`.
2. En el **PAR**, la cantidad de cada renglón marcado constituye su presupuesto de horas. **Total de horas presupuestadas** aparece en edición, vista previa e impresión. `qty = 8` son ocho horas compartidas; multiplicador, precio y porcentaje solo intervienen en los importes comerciales.
3. En **Órdenes**, distribuir las horas dentro de cada renglón entre los técnicos. Se muestran presupuesto, horas en otras órdenes, horas de la orden y saldo tras guardar. **Actualizar saldo** recarga la disponibilidad sin borrar el reparto.
4. Un técnico puede participar en varios renglones; un renglón puede repartirse entre varios técnicos. Máximo tres personas distintas por orden y una fila por pareja renglón/técnico. El responsable debe tener horas asignadas. El equipo y `service_order_technician` se derivan del reparto y alimentan el calendario.
5. Guardar una orden `Pendiente` reserva horas. Aprobar, iniciar y completar conserva la reserva; cancelar libera saldo y conserva historial. **Horas de mano de obra asignadas** es la suma del reparto; la duración del horario programado es independiente.

Ejemplo: Técnico con cantidad 8 y multiplicador 3 aporta **8 h**. Una orden asigna 3 h a Ana y 2 h a Luis; otra orden dispone de 3 h de ese renglón. El saldo de un renglón no cubre horas de otro perfil.

### Órdenes anteriores e historial

- La migración guarda el valor previo en `legacy_worked_hours` y marca las órdenes existentes con `labor_review_required`; no inventa asignaciones. Las nuevas reservas normales se bloquean mientras haya órdenes no canceladas pendientes de revisar en ese PAR.
- **Revisar horas anteriores** está disponible para Superadministrador, Administrador y Supervisor, también en órdenes completadas. Permite distribuir entre sus técnicos históricos, incluso inactivos, sin cambiar estado, aprobación, equipo ni agenda.
- La revisión exige explicación y registra usuario/fecha. Puede declararse cero horas presupuestadas dejando el reparto vacío y explicando el motivo. No se copia el total antiguo al presupuesto ni se permiten excesos. La revisión es única; luego se aplican las restricciones normales.
- Antes de revisar, una orden anterior solo puede consultarse o cancelarse; no puede editarse, aprobarse, iniciarse ni completarse. Las canceladas no bloquean reservas y conservan sus datos.
- Las asignaciones conservan ID y número original del renglón, producto, código, descripción, técnico, nombre y horas. Al recrear ítems de un PAR con todas sus órdenes canceladas, la FK viva puede quedar nula; los snapshots permanecen para historial y futuras comisiones. No se implementan porcentajes ni pagos.

### Contratos técnicos

- `product.requires_technician` clasifica mano de obra. `par_item.requires_technician` es una copia al incorporar el producto: cambiar el catálogo no reinterpreta renglones guardados. El formulario conserva `sourceItemId` y envía `id`; volver a seleccionar el producto actualiza la clasificación, sujeto a los permisos del PAR.
- `par_header.budgeted_hours = SUM(qty WHERE requires_technician)` se calcula en servidor junto a USD/Bs. Cantidades y asignaciones tienen hasta dos decimales; las sumas/comparaciones JavaScript usan centésimas enteras.
- `POST /api/service-order` recibe `laborAllocations: [{ parItemId, technicalId, hours }]` y `leadTechnicianId`. `PUT` admite ese reparto solo en `Pendiente`. Se rechazan `workedHours` y `technicianIds` de clientes antiguos; `worked_hours` se conserva en respuestas como total derivado.
- La revisión usa exclusivamente `PUT` con `{ reviewLabor: true, laborReviewNote, laborAllocations }`. Su permiso deriva de la sesión.
- `GET /api/service-order/labor?parId=...&orderId=...` informa presupuesto, saldo y órdenes por revisar. El `orderId` opcional excluye la orden en edición y debe pertenecer al PAR. El servidor vuelve a calcular el saldo al guardar.
- Crear, editar y cancelar bloquea primero `par_header FOR UPDATE` y después la orden. El saldo se lee en otra sentencia posterior al bloqueo y todas las escrituras se confirman juntas. Reemplaza el anterior `FOR SHARE` para evitar sobrerreservas concurrentes.
- Errores: `ORDER_LABOR_INVALID` → 400; `ORDER_LABOR_EXCEEDED` y `ORDER_LABOR_REVIEW_REQUIRED` → 409; `ORDER_LABOR_REVIEW_FORBIDDEN` → 403. Continúan las validaciones de horarios, técnicos activos y conflictos de aprobación.
- Importar crea productos sin marca por defecto y conserva la marca al actualizar. Para importar como Repuestos un producto marcado, primero debe desmarcarse explícitamente en Productos.

### Migración y entrega

- Ejecutar `npm run db:migrate -- 051-par-labor-allocation.sql` antes de iniciar esta versión sobre una base existente. `db/schema.sql` contiene los mismos cambios para instalaciones nuevas.
- Clasificación inicial solo por códigos conocidos: `ESP001`, `MOB-001`, `SRV-AYUDANTES`, `SRV-CENTAC`, `SRV-INSTRUM`, `SRV-TEC-123`, `SRV-TEC-123-AD`, `SRV-TSU-SEG`, `TEC010`, `TEC011`, `TEC012`, `TEC013`, `TSU001`. Viajes, viáticos, días compensatorios y otros servicios requieren clasificación explícita si deben aportar horas.
- Migración aplicada a la base configurada del entorno de desarrollo, con respaldo previo. Las siete órdenes existentes quedaron pendientes de revisión humana; ninguna fue distribuida automáticamente.
- Verificación de esta entrega: `npm run lint` sin errores (tres advertencias preexistentes), `npm run build` correcto y cuatro consultas de integridad de horas sin anomalías. Lectura de órdenes y presupuesto desde repositorios correcta. No se ejecutó la suite de pruebas en esta entrega.
- No hay paquetes npm nuevos. Documentación en este archivo y `APP_DEPENDENCIES.md`, sin entrada en `Archivos Markdown/TAREAS.MD`.

---

**Fuente única de verdad para cualquier IA que trabaje en este repositorio.**
Léelo completo antes de generar o modificar código. Si hay duda, pregunta. No asumas APIs de Next.js “clásico”.

---

## Estado canónico — Productos y categorías del PAR (2026-09-22)

- `product.type` fue retirado del modelo, API, repositorio, interfaz, importador y esquema consolidado. No debe reintroducirse como sinónimo de categoría.
- La clasificación única del catálogo es `product.category`, con valores canónicos exactos `Servicio` y `Repuestos`.
- Las migraciones `045-normalize-product-category.sql` y `046-drop-product-type.sql` están aplicadas en la base de desarrollo. La primera normaliza datos y restricciones; la segunda elimina la columna redundante.
- Los productos históricos cuyo `type` era `Equipo` se conservaron, pero quedaron `Inactivo` para que no puedan agregarse a nuevos PAR. Los equipos operativos continúan perteneciendo exclusivamente a la tabla `equipment`.
- `par_item.categoria` y `par_template_item.categoria` son obligatorios, aceptan solamente `Servicio` o `Repuestos` y se sincronizaron con `product.category` cuando existe `product_id`.
- Para un ítem con producto, el repositorio deriva la categoría desde la base de datos y no confía en el valor enviado por la interfaz. Una selección nueva rechaza productos inexistentes, inactivos o con categoría inválida.
- Un producto histórico que posteriormente quede inactivo puede conservarse al editar el mismo PAR o plantilla, pero no puede agregarse como una selección nueva.
- Los ítems manuales sin `product_id` usan `Servicio` como valor predeterminado y siguen sujetos a la restricción de categoría.
- La pantalla de Productos y sus vistas de tabla, tarjetas, detalle y edición ya no muestran ni solicitan Tipo. Categoría permanece como un `Select`, nunca como texto libre.
- Los modales de detalle y edición de Productos usan `size="2xl"` y la misma cuadrícula responsive de Equipos: dos columnas desde `sm` y cuatro desde `lg`.
- Detalle y edición muestran, en el mismo orden, Código, Descripción, Marca, Categoría, Serial, Modelo, Costo, Precio, Existencia y Estado. El detalle no muestra fechas de creación o actualización.
- El código del producto aparece una sola vez y queda bloqueado al editar. El costo conserva la restricción visual por rol en ambas ventanas sin alterar la cuadrícula.
- La plantilla Excel de importación de productos ya no contiene la columna `tipo`; `categoria` ofrece únicamente `Servicio` y `Repuestos`.
- Verificación ejecutada: `npm test`, `npm run lint`, `npm run build`, `npm run db:test-schema` y `npm run db:validate`; sin errores.

## Estado canónico — edición de PAR aprobado (2026-10-21)

Esta regla sustituye las restricciones históricas de edición únicamente en `Creado` descritas en Fase 3.

| Estado persistido del PAR | Órdenes no canceladas | Edición |
|---|---|---|
| `Creado` | Ninguna | Roles con acceso actual al módulo PAR |
| `Aprobado` | Ninguna | Solo `Superadministrador`, `Administrador` y `Supervisor` |
| `Creado` o `Aprobado` | Una o más | Bloqueada para todos los roles |
| `En Servicio`, `Finalizado` o `Rechazado` | Cualquiera | Bloqueada |

- Para esta regla, una orden activa es cualquier `service_order` cuyo `status <> 'Cancelada'`: incluye `Pendiente`, `Aprobada`, `En Proceso` y `Completada`. Una orden completada mantiene bloqueada la edición. Si todas las órdenes están canceladas, el PAR persistido en `Aprobado` vuelve a ser editable por los tres roles autorizados.
- `/par/[id]` ofrece **Editar ítems** y **Guardar ítems** únicamente cuando se cumple la política. La edición de esta pantalla sigue limitada a ítems; cliente, planta, contacto, tasa y equipos se presentan como datos de consulta.
- La interfaz usa el rol de sesión, `par.status` persistido y `total_orders`; `display_status` continúa siendo exclusivamente de presentación. Al recibir 403 durante un guardado, vuelve a vista previa y recarga el PAR para reflejar órdenes o cambios de estado concurrentes.
- `lib/par-policy.js` centraliza `getParEditError` y `canEditPar`. Los roles de edición de aprobados se declaran en `PAR_APPROVED_EDIT_ROLES`, separados del permiso de aprobar/rechazar.
- `PUT /api/par/[id]` y todas las escrituras anidadas de ítems/equipos obtienen el rol desde `auth()` y lo entregan al repositorio como `actor.role`. Nunca aceptar ese permiso desde el JSON del cliente. El proxy conserva el control de acceso general al módulo.
- El repositorio bloquea primero la cabecera con `FOR UPDATE`, consulta después las órdenes no canceladas y valida estado/rol antes de escribir, dentro de la misma transacción. La consulta de órdenes debe ser una sentencia posterior al bloqueo para observar órdenes confirmadas durante la espera.
- La creación de órdenes toma `FOR UPDATE` (actualizado por la distribución de horas) sobre esa misma cabecera **antes** de consultar sus relaciones y descripciones. Así, si la orden confirma primero, la edición se rechaza; si la edición confirma primero, la orden hereda los datos actualizados.
- `PAR_LOCKED`, `PAR_EDIT_FORBIDDEN` y `PAR_HAS_ACTIVE_ORDERS` responden 403 con mensajes de negocio; falta de sesión responde 401. La política se aplica también a creación, actualización y eliminación individual de ítems/equipos.
- Editar conserva `status = 'Aprobado'`, `approved_by` y `approved_at`; los totales USD/Bs se recalculan en el servidor. No se requiere una nueva aprobación. La eliminación del PAR completo continúa permitida exclusivamente en `Creado` y se comprueba por separado bajo bloqueo.
- Cobertura: `spec/par-policy.test.mjs` comprueba roles/estados; `spec/par-edit.integration.test.mjs` ejecuta rutas y repositorios reales con sesión controlada, datos de prueba aislados, totales, auditoría, órdenes canceladas y ambas secuencias de concurrencia. Esta última crea un esquema temporal propio y lo elimina en `finally`, porque necesita transacciones confirmadas entre conexiones; no escribe datos funcionales en `public`.
- No requiere nuevas dependencias npm ni migraciones.
- Verificación del 2026-10-21: `npm run verify` completado (todas las pruebas, lint y build). Lint conserva tres advertencias preexistentes en `app/layout.jsx`, `components/par/ParForm.jsx` y `lib/axios.js`; cero errores.

## Estado canónico — plantillas de importación: código de planta (2026-10-15)

- Las hojas **Equipos** y **Contactos** de la plantilla Excel identifican la planta con `codigo_planta` (obligatorio, único por cliente vía `plant_client_code_uidx`); `nombre_planta` permanece en la plantilla pero es opcional e informativo.
- `lib/import/schemas.js` exige `plantCode` y deja `plantName` como opcional en `Contacto` y `Equipo`.
- `lib/import/analyzer.js` resuelve la relación con `plantCodeKey(codigo_cliente, codigo_planta)` (mapa `plantsByCode` más plantas incluidas en el mismo archivo, `stagedPlants`); si el `nombre_planta` informado no coincide con el nombre del código resuelto se agrega una **advertencia**, no un error. El contacto existente se sigue identificando por cliente/planta/correo o cliente/planta/persona y teléfono, ahora usando el código.
- `lib/import/executor.js` resuelve cliente y planta con `lower(p.code) = lower($2)`; el error cita el código de planta y el cliente. Los INSERT/UPDATE no cambiaron.
- La hoja **Plantas** sigue detectando su fila existente por (cliente, `nombre_planta`) y sigue aportando `codigo_planta` como columna obligatoria; una planta creada en el mismo archivo ya está disponible cuando se ejecutan Contactos y Equipos (`ENTITY_ORDER`).
- Archivos generados antes de este cambio se rechazan con `La hoja X no contiene: codigo_planta`; hay que volver a descargar la plantilla desde `/api/import/template`.
- Verificación ejecutada: `npm run verify` (tests, lint y build).

---

## 0. Identidad

| | |
|---|---|
| Producto | Maquitech — Panel Administrativo (SaaS de gestión de servicio técnico) |
| Package | `portalservices` v1.0.0 |
| Idioma UI | Español (`lang="es"`) |
| Lenguaje | **JavaScript. Prohibido TypeScript.** |
| Alias | `@/*` → raíz (`jsconfig.json`) |

---

## 1. Arquitectura general

### Stack (versiones sensibles)

| Paquete | Versión | Uso |
|---|---|---|
| `next` | **16.3.4** | App Router, Turbopack. **No es el Next.js de tu training.** |
| `react` / `react-dom` | ^19.2.8 | UI |
| `next-auth` | ^5.0.0-beta.31 | Auth JWT + Credentials |
| `pg` | ^8.23.0 | PostgreSQL |
| `bcryptjs` | ^3.0.3 | Hash de contraseñas |
| `axios` | ^1.20.0 | HTTP frontend + cliente Saint |
| `zustand` | ^5.0.15 | Estado global |
| `zod` | ^4.5.4 | Validación |
| `react-hook-form` + `@hookform/resolvers` | ^7.87.0 / ^5.9.1 | Formularios |
| `tailwindcss` + `@tailwindcss/postcss` | ^4 | CSS (no hay `tailwind.config.js`) |
| `recharts` | ^3.10.1 | Gráficos |
| `react-hot-toast` | ^2.6.0 | Toasts (vía `notify`) |
| `framer-motion` | ^13.2.0 | Animaciones |
| `lucide-react` | ^1.43.0 | Iconos |

Scripts: `npm run dev` · `npm run build` · `npm start` · `npm run lint`.

**Next.js 16:** no existe `middleware.ts`/`middleware.js`. El gate es `proxy.js` en la raíz. `params` en rutas dinámicas es **Promise** (`const { id } = await params`). Antes de usar APIs del framework, lee `node_modules/next/dist/docs/`.

### Flujo de datos

```
Browser (SessionProvider + ThemeProvider)
  páginas en app/(dashboard)     ← proxy.js (sesión + RBAC)
  lib/api.js → axios baseURL /api
        ↓
  app/api/*/route.js
        ↓
  lib/repositories/*.js  →  lib/db.js (pg Pool)  →  PostgreSQL
                     ↘ lib/saint-api.js → Saint Express (SQL Server, solo lectura/sync)
```

- La UI **nunca** habla con `pg`.
- Los repositorios **nunca** importan `pool`; solo `query` / `withTransaction`.
- Server Components y API Routes: `fetch` nativo o repos. Cliente: `api` de `lib/axios.js`.
- Integración Saint: `SAINT_API_URL` es **baseURL** (debe ser origen, ej. `http://localhost:3001`, **sin** `/api/clientes`). Header `x-api-key`.

### Estructura de carpetas

```
app/
  layout.jsx, page.jsx, login/, globals.css, not-found.jsx
  (dashboard)/          layout cliente (Sidebar + Topbar) + páginas
  api/                  Route Handlers
auth.js                 NextAuth v5
proxy.js                Gate de auth + RBAC (reemplazo de middleware)
components/
  ui/                   Design system (Button, Modal, Input, …)
  layout/               Sidebar, Topbar, PageHeader, AuthGuard (legacy)
  tables/               DataTable, RowActions
  charts/               Recharts + useChartTheme
  {modulo}/             Cards, forms, views de cada entidad
hooks/                  useAuth, useTheme, useChartTheme, useLocalStorage, …
stores/                 themeStore, sidebarStore (Zustand)
lib/
  db.js, axios.js, api.js, toast.js, permissions.js, constants.js
  saint-api.js, format.js, status.js, charts.js
  validators/           Zod
  repositories/         SQL parametrizado
utils/                  cn.js, csv.js, parCalc.js
data/                   Mocks legacy (aún usados por charts y notificaciones)
db/migrations/          SQL numerado, SIN runner, solo forward
```

### Páginas (`app/(dashboard)/`)

`/dashboard` `/clientes` `/productos` `/tecnicos` `/ordenes` `/calendario-tecnicos` `/vendedores` `/par` `/par/new` `/par/[id]` `/par/plantillas` `/par/plantillas/nueva` `/par/plantillas/[id]` `/reportes` `/usuarios` `/configuracion` `/equipos` `/perfil`

`/vendedores` es stub (“Próximamente”). No hay tabla.

### APIs (`app/api/`)

| Path | Métodos |
|---|---|
| `/api/auth/[...nextauth]` | GET, POST |
| `/api/user` · `/api/user/[id]` | GET, POST / GET, PUT, PATCH, DELETE |
| `/api/roles` | GET |
| `/api/technical` · `/api/technical/[id]` | CRUD + PATCH |
| `/api/product` · `/api/product/[id]` | CRUD + PATCH |
| `/api/client` · `/api/client/sync` | GET / POST (Saint upsert) |
| `/api/ubicacion/country\|state\|city` | GET, POST (sync) |
| `/api/equipment` · `/api/equipment/[id]` | CRUD |
| `/api/service-order` · `/api/service-order/[id]` | CRUD |
| `/api/par` · `/api/par/[id]` | CRUD + PATCH status |
| `/api/par/[id]/equipment` · `/api/par/[id]/items` | POST |
| `/api/par/equipment/[eqId]` · `/api/par/items/[itemId]` | PUT, DELETE |
| `/api/par-template` · `/api/par-template/[id]` | CRUD |
| `/api/configuration` | GET, PUT |
| `/api/notification` · `/api/notification/[id]` | GET, POST / PATCH (**aún mock**) |
| `/api/dashboard` | GET (SQL directo, bypassa repos) |

---

## 2. Reglas de negocio CRÍTICAS (nunca romper)

### 2.1 Autenticación

- NextAuth v5 en `auth.js`. Estrategia **JWT**. No hay tabla de sesiones. No hay RLS.
- Provider: Credentials (`login` + `password`).
- `authorize`: `findByLogin` (case-insensitive) → `status === "Activo"` → `bcrypt.compare`. Si no, `null`.
- Hash al crear/actualizar usuario: `bcrypt.hash(password, 10)`. Mínimo 6 caracteres.
- Única ruta pública: `/login`. `/api/auth/*` queda fuera del matcher del proxy.
- Sesión (`session.user`): `id` (UUID), `login`, `role` (**string nombre**), más `name` y `email` de NextAuth.
- **No** están en la sesión: `role_id`, `status`, `last_access_at`.
- Un cambio de rol o status en BD **no** actualiza el JWT hasta re-login. Un usuario inactivado puede seguir autenticado hasta que expire el token.
- Env: `AUTH_SECRET` (obligatorio en producción). NextAuth lo lee solo; no está referenciado en código.

### 2.2 Autorización y roles

Roles sembrados (comparación **exacta** del string, incluida la tilde):

| Constante | Valor en BD / JWT |
|---|---|
| `ROLES.ADMIN` | `Administrador` |
| `ROLES.SUPERVISOR` | `Supervisor` |
| `ROLES.COORDINADOR` | `Coordinador` |
| `ROLES.TECNICO` | `Técnico` |
| `ROLES.USUARIO` | `Usuario` |

**Nunca** uses `"Tecnico"` sin tilde. No hay tabla de permisos finos. `PermissionsMatrix` es solo lectura. Roles no se crean ni editan por API (`GET /api/roles` lista).

Enforcement real: `proxy.js` + `lib/permissions.js`. El Sidebar filtra `NAV_SECTIONS` por `item.roles` (UX, no seguridad).

`rolesFor(pathname)` usa `startsWith` y **el primer prefijo gana**. Orden del array importa. Si no hay match → **cualquier usuario autenticado**.

**Páginas** (`PAGE_PERMISSIONS`):

| Prefijo | Roles |
|---|---|
| `/usuarios` | Admin |
| `/configuracion` | Admin, Supervisor |
| `/reportes` | Admin, Supervisor, Coordinador |
| `/ordenes`, `/equipos` | Admin, Supervisor, Coordinador, Técnico |
| `/tecnicos`, `/calendario-tecnicos`, `/vendedores`, `/par`, `/productos` | Admin, Supervisor, Coordinador |
| `/clientes`, `/dashboard`, `/perfil` | todos |

**APIs** (`API_PERMISSIONS`):

| Prefijo | Roles |
|---|---|
| `/api/user`, `/api/roles` | Admin |
| `/api/technical`, `/api/product`, `/api/par` | Admin, Supervisor, Coordinador |
| `/api/ubicacion`, `/api/configuration` | Admin, Supervisor |
| `/api/client` | todos |

**APIs sin regla** (cualquier autenticado): `/api/service-order`, `/api/equipment`, `/api/notification`, `/api/dashboard`.

**Colisión de prefijo:** `/api/par` también matchea `/api/par-template`. Si añades `/api/par-foo`, hereda roles de PAR salvo que lo declares **antes**.

Denegado: API → 401/403 JSON; página sin sesión → `/login?callbackUrl=`; página sin rol → `/dashboard`.

**No hay autorización por fila.** Un Técnico que llega a `/api/service-order` ve **todas** las órdenes.

Además del control del proxy, PAR llama `auth()` al crear (sella `createdBy` / `elaboradoPor`), al revisar estados (sella `approvedBy`) y al editar ítems/equipos (deriva `actor.role` para permitir edición de aprobados).

### 2.3 Entidades y reglas

| Entidad | Tabla | PK | Notas |
|---|---|---|---|
| Role | `role` | SMALLSERIAL | 5 nombres fijos |
| User | `users` | UUID | Soft-delete → `Inactivo` |
| Técnico | `technical` | UUID | **No** tiene `user_id`. Rol Técnico ≠ fila en `technical` |
| Producto | `product` | UUID | `Servicio` \| `Repuestos`; unique `code` |
| Cliente | `client` | UUID | **No hay CRUD local.** GET + `POST /api/client/sync`. Status Saint `'1'`/`'0'` |
| Ubicación | `country`, `state`, `city` | SERIAL | Sync Saint (`cod_saint`) |
| Orden | `service_order` | SERIAL | Ver máquina de estados |
| Equipo | `equipment` | UUID | unique `serial`; catálogo del selector de equipos del PAR vía `GET /api/equipment?clientId=`. No se puede cambiar `client_id` si el equipo está en ≥1 PAR (cualquier estado) — 409 |
| Notificación | `notification` | UUID | Repo existe; **API aún sirve mock** de `data/notifications.js` |
| Config | `configuration` | `id=1` singleton | Trigger anti-DELETE. Incluye `exchange_rate` |
| PAR | `par_header`, `par_equipment`, `par_item` | SERIAL | Número 7 dígitos (`par_number_seq`) |
| Plantilla PAR | `par_template`, `par_template_item` | SERIAL | Tipo `Servicio` \| `Ventas` |

### 2.4 Máquinas de estado

**Usuarios / técnicos / productos:** `Activo` ↔ `Inactivo`. DELETE = `Inactivo`. Login exige `Activo`.

**Equipos:** `Operativo` \| `En Mantenimiento` \| `Fuera de Servicio` \| `Mudado` \| `Desechado` \| `Validar`. DELETE = `Fuera de Servicio`.

**Órdenes:** `Pendiente` (default) → `Aprobada` → `En Proceso` → `Completada`; `Cancelada` antes de completar. Prioridad `Alta` \| `Media` \| `Baja`. DELETE = `Cancelada`. El repositorio valida transiciones y `par_id` es obligatorio.

**PAR (crítica):**

CHECK BD: `Creado` (default) \| `Aprobado` \| `En Servicio` \| `Finalizado` \| `Rechazado`.

Transiciones **manuales** (`PATCH /api/par/[id]`):

```
Creado  → Aprobado     (sella approved_by + approved_at)
Creado  → Rechazado
Aprobado → Rechazado
```

Cualquier otra (incl. forzar `En Servicio` / `Finalizado`) → 400 `"Transición de X a Y no permitida"`.

`display_status` se **calcula al leer**, no se escribe:

- Si status almacenado ∈ {Aprobado, En Servicio, Finalizado} y hay ≥1 orden no cancelada:
  - todas `Completada` → `Finalizado`
  - si no → `En Servicio`
- Si no, `display_status = h.status`

La UI usa `display_status ?? status`. El filtro `findAll({ status })` usa `h.status`, no el derivado. Un PAR “En Servicio” en UI **no** filtra por `"En Servicio"`.

Edición:

| Acción | Permitido |
|---|---|
| PUT `/api/par/[id]` (solo ítems) | `Creado`, o `Aprobado` para Superadministrador/Administrador/Supervisor; sin órdenes no canceladas |
| DELETE PAR | solo `Creado` |
| POST/PUT/DELETE anidados de ítems/equipos | Misma política de estado, rol y ausencia de órdenes no canceladas; comprobación transaccional en repositorio |

Nuevo PAR siempre `Creado`. `elaborado_por` sale de la sesión. `revisado_por` **fue eliminado** (migración 023); usar `approved_by` / `approved_at`.

Totales: el servidor es la fuente de verdad (`recalcTotals`). Fórmula: `qty * unit * multiplicador * (1 + percent/100)`, 2 decimales. `total_bs = total_usd * exchange_rate`. Existe `calculateLineTotal` en `par.repository.js` **y** en `utils/parCalc.js` — no dejarlos divergir.

### 2.5 Clientes y Saint

- Status persistido: `'1'` / `'0'`. La UI mapea `"1"` → Activo. El Zod `clientSchema` usa Activo/Inactivo y **no lo usa la API**. El dashboard cuenta `status = 'Activo'` (no coincidirá con `'1'`).
- `client.country` / `client.state` guardan códigos Saint (texto), join a `country.cod_saint`.

---

## 3. Convenciones de código obligatorias

### Naming

| Capa | Estilo | Ejemplo |
|---|---|---|
| Form / body frontend | camelCase | `roleId`, `hourlyRate`, `clientId`, `valorUnitUsd` |
| BD / JSON de `SELECT *` | snake_case | `role_id`, `hourly_rate`, `client_id` |
| Componentes | PascalCase | `ProductCardGrid` |
| localStorage | `mq-*` | `mq-theme`, `mq-par-view` |

Mapeo camelCase → snake_case: repositorios (INSERT/UPDATE) y modales. Respuestas JSON se quedan en snake_case. Excepciones: dashboard alias a camelCase; `PUT /api/configuration` acepta snake_case (`company_name`, `exchange_rate`).

IDs mixtos: UUID (`user`, `client`, `product`, `equipment`, `technical`) vs SERIAL (`par_*`, `service_order`, `role`).

### UI

- **Prohibido** TypeScript, Bootstrap, MUI, Chakra, shadcn. Todo el UI en `components/ui/`.
- Tokens CSS (`app/globals.css`): `bg-background`, `bg-surface`, `bg-surface-2`, `border-border`, `text-foreground`, `text-muted`. Dark: clase `.dark`. Primario `blue-600`. Corporativo Maquitech `orange-500`. **No** hardcodear `#fff` / `gray-500`.
- Tablas: `components/tables/DataTable.jsx` + `RowActions`. Páginas lista: `PageHeader` + toolbar (`SearchInput` + `ViewToggle`) + tabla **o** CardGrid + form/view modals + `ConfirmDialog` (exportado desde `Modal.jsx`). Vista dual persistida `mq-{entity}-view`.
- Toasts: `notify` de `@/lib/toast`. No llamar `react-hot-toast` directo.
- Gráficos: `components/charts/`, colores con `useChartTheme()`, import `next/dynamic` `{ ssr: false }`. Hex para Recharts en `lib/charts.js`.
- Estado global **solo** Zustand (`stores/themeStore.js`, `stores/sidebarStore.js`). Datos de dominio: fetch por página vía `lib/api.js`.

### Backend

- SQL **siempre** parametrizado (`$1`, `$2`). Nunca concatenar.
- `users` siempre entre comillas (palabra reservada).
- Validación: Zod en PAR/plantillas/login. Users/técnicos/productos: checks manuales (no uses `user.schema.js`: `roleId` está tipado como UUID y es **SMALLSERIAL**; el schema está sin usar).
- Errores API en español:

| Código | Uso |
|---|---|
| 400 | validación / transición ilegal |
| 401 | no autenticado |
| 403 | no autorizado / regla de negocio PAR |
| 404 | no encontrado |
| 409 | conflicto unique / conflicto de negocio (p. ej. cambiar cliente de un equipo con PARs) |
| 500 | catch-all genérico (no filtrar `error.message` al cliente, salvo el leak actual en `ubicacion/*`) |

- `params` es Promise. `GET /api/user/[id]` no tiene try/catch; no copies ese patrón.
- `lib/db.js`: Pool `max: 10`, cache en `globalThis` en dev. `DATABASE_URL` gana sobre `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`. Default DB: `localhost:5432/db_service`.

### Comentarios

No añadir comentarios salvo que se pidan.

---

## 4. Dependencias clave y entorno

```
DATABASE_URL          # gana si existe
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
AUTH_SECRET           # NextAuth v5 (implícito)
SAINT_API_URL         # origen, NO incluir /api/clientes
SAINT_API_KEY
NODE_ENV              # cache del pool solo fuera de production
```

En deploy, NextAuth también puede honrar `AUTH_URL` / `AUTH_TRUST_HOST`.

`.env*` no se commitea. Copia desde `.env.example` con cuidado (el ejemplo de Saint está mal si se pega tal cual).

---

## 5. Áreas frágiles (precaución extrema)

1. **`auth.js` + `proxy.js` + `lib/permissions.js`** — un cambio rompe login o deja APIs abiertas. Ruta API nueva **sin** entrada en `API_PERMISSIONS` = abierta a todo autenticado.
2. **Migraciones 013–018 (PAR v1→v2).** 014 se reescribió in-place a nombres finales; 016 puede dropear `par_number_seq` que V2 aún usa; 017 busca `par_v2_*`. **No reescribir ni reaplicar 013–018** sin saber el estado real de la BD. No hay runner ni rollbacks. Solo añadir `025-…sql` en adelante.
3. **`par.repository.js`** — `display_status` de solo lectura; `replaceEquipment`/`replaceItems` hacen DELETE-all + INSERT; `data[key] || null` trata `0`/`false` como vacío en algunos updates.
4. **Rutas anidadas PAR**: deben pasar el rol de sesión al repositorio; toda escritura valida estado y órdenes no canceladas bajo bloqueo de la cabecera. No confundir el permiso de edición de aprobados con el de eliminar el PAR completo.
5. **`AuthGuard.jsx`** existe y envuelve el layout del dashboard pese a la regla “no crear AuthGuard”. Es UX (¿hay sesión?), **no** chequea roles. No lo extiendas. No lo borres sin cobertura del proxy.
6. **Notificaciones:** tabla + repo muertos; la API sirve `data/notifications.js`.
7. **`user.schema.js` / `client.schema.js`:** no usarlos como están (UUID vs SMALLSERIAL; Activo vs `'1'`/`'0'`).
8. **Dashboard** (`app/api/dashboard/route.js`): SQL directo, aliases camelCase, KPI de clientes con `'Activo'` incorrecto.
9. **Axios interceptor** muta la respuesta con `status`/`headers`. Si el body tiene `{ status: "Activo" }`, el HTTP status puede pisarlo. 401 redirige a `/login`.
10. **`lib/saint-api.js`:** si `SAINT_API_URL` incluye path, se duplica.
11. **Constitución en `spec/` y `README.md`:** desactualizados (hablan de localStorage auth, shadcn, `/src`). Este archivo manda.
12. **`DEVELOPMENT_RULES.md`** documenta `"Tecnico"` sin tilde — **incorrecto**. El valor real es `"Técnico"`.

---

## 6. Reglas de modificación

Antes de tocar **cualquier** archivo existente:

1. Léelo completo.
2. Identifica quién lo importa y a quién importa (páginas, APIs, repos, permisos, migraciones).
3. Replica el patrón local (no inventes uno nuevo).
4. Si hay ambigüedad de negocio, auth, roles, schema o Next 16: **pregunta**. No adivines.
5. Schema: **nunca** edites un `.sql` ya aplicado. Nueva migración numerada (`025-…`).
6. Auth / roles / `PAGE_PERMISSIONS` / `API_PERMISSIONS` / `proxy.js` / `auth.js`: **no modificar sin confirmación explícita del usuario**.
7. Si añades página o API, actualiza `lib/permissions.js` **y** `NAV_SECTIONS` en `lib/constants.js` en el mismo cambio. Prefijos más específicos **antes** que los genéricos.
8. Tras código no trivial: `npm run lint`. No commitees a menos que te lo pidan.

---

## 7. Prohibiciones explícitas

- Introducir TypeScript, `.tsx`, `tsconfig`, o librerías de UI (Bootstrap / MUI / Chakra / shadcn).
- Crear `middleware.js` / `middleware.ts`.
- Crear un AuthGuard nuevo o basar seguridad en el cliente.
- Concatenar SQL o importar `pool` desde un repositorio.
- Eliminar código, columnas o archivos **sin justificación** escrita en el cambio.
- Cambiar esquemas de BD sin migración nueva. Reaplicar o reescribir 013–018.
- Modificar lógica de autenticación, roles o permisos sin confirmación.
- Forzar transiciones PAR ilegales o escribir `display_status` en BD.
- Recalcular totales PAR solo en el cliente.
- Usar `revisado_por` (columna dropeada).
- Hardcodear colores; llamar `react-hot-toast` directo; saltarse `DataTable` en listados.
- Commitear secretos, `.env*`, o hacer commit si no se pidió.
- Confiar en README, `PERMISOS.MD` o `spec/constitution` por encima de este archivo y del código.

---

## 8. Checklist — la IA debe cumplirlo ANTES de generar código

- [ ] Leí este archivo.
- [ ] Confirmé: JavaScript, Next 16, `proxy.js`, sin TypeScript ni UI kits.
- [ ] Si toco framework Next: consulté `node_modules/next/dist/docs/`.
- [ ] Localicé el patrón existente (página hermana, API hermana, repo hermano) y lo voy a copiar.
- [ ] Leí por completo cada archivo que voy a editar y sé sus dependencias.
- [ ] No toco `auth.js`, `proxy.js`, `lib/permissions.js` ni SQL de schema sin confirmación.
- [ ] Si hay duda de negocio o de API: pregunto, no invento.
- [ ] Body/form camelCase; BD/JSON snake_case; mapeo en repo/modal.
- [ ] UI con tokens semánticos; toasts con `notify`; tablas con `DataTable`.
- [ ] Ruta o API nueva: entrada en `permissions.js` (prefijo específico primero) + nav si aplica.
- [ ] Dynamic route: `await params`. SQL con `$1`. `users` quoted.
- [ ] PAR: respeto la máquina de estados y dejo totales al servidor.
- [ ] No elimino código ni columnas sin justificación.
- [ ] `npm run lint` al terminar.

Si un ítem no aplica, indícalo. Si no puedes cumplirlo, detente y pregunta.

---

## 9. Registro de línea base — Fase 0 (2026-09-17)

- Se verificó la estructura actual: Next.js 16.3.4, React 19, JavaScript, `proxy.js`, PostgreSQL mediante `pg` y sin TypeScript.
- El repositorio inicia limpio en `main`; no se realizaron commits ni cambios de código durante la Fase 0.
- Los archivos guía oficiales son `AI_CONTEXT.md` y `APP_DEPENDENCIES.md`. No existen `CONTEXT_IA.MD` ni `APP_DEPENDECIES.MD` con esos nombres alternativos.
- Se instaló correctamente con `npm ci --ignore-scripts` usando una caché temporal. Se fijó ESLint en `^9.39.5`, compatible con los plugins actuales, y se actualizó `package-lock.json`.
- `npm run build` finaliza correctamente. `npm run lint` ya puede ejecutarse, pero reporta 2 errores existentes en el efecto de sincronización de mes del Dashboard y 8 advertencias (fuentes, React Hook Form y navegación Axios). Estos errores quedan documentados para la Fase 1 y no se corrigieron durante la línea base.
- npm reportó 6 vulnerabilidades (1 moderada, 3 altas y 2 críticas). No se ejecutó `npm audit fix` para evitar cambios de dependencias fuera de esta fase.
- La base `db_service` fue leída mediante MCP en modo solo lectura. PostgreSQL reportó versión 18.6 y 17 tablas públicas.
- Conteos verificados: `client` 1906, `equipment` 9, `product` 23, `par_header` 3, `par_item` 9, `par_equipment` 3 y `service_order` 0.
- Integridad actual: cero PAR sin ítems, cero PAR sin equipo principal, cero múltiples equipos principales, cero descuadres de totales, cero PAR aprobados sin auditoría y cero órdenes vinculadas a PAR no aprobados.
- `par_number_seq` existe y su valor actual es 8; el máximo número PAR observado también es 8.
- La base no contiene una tabla pública de historial de migraciones.
- Riesgos estructurales para una futura migración: `par_item.descripcion` permite NULL, no existe unicidad de `item_no` por PAR, no existe garantía de un único equipo principal por PAR y faltan índices en algunas claves foráneas (`approved_by` y `product_id`).
- Las restricciones y secuencias del módulo PAR conservan nombres heredados `par_v2_*`; no se renombrarán sin una migración compatible.
- Git no muestra cambios de estos archivos guía porque el `.gitignore` actual ignora `*.md`; la corrección de versionado queda reservada para la Fase 8.

La siguiente actividad autorizable es la Fase 1. No avanzar a otra fase sin aprobación explícita del usuario.

## 10. Registro de Fase 1 — correcciones críticas (2026-09-17)

- `lib/axios.js` ya conserva el `status` de dominio y expone metadatos HTTP con nombres no conflictivos: `httpStatus`, `httpStatusText` y `httpHeaders`.
- `.env.example` ahora define `SAINT_API_URL` como origen (`http://localhost:3001`); `lib/saint-api.js` conserva las rutas `/api/clientes`, `/api/paises`, `/api/estados` y `/api/ciudades`.
- `lib/repositories/equipment.repository.js` ahora devuelve `null` cuando un `UPDATE ... RETURNING` no afecta filas, permitiendo que las rutas respondan 404 en lugar de provocar un 500 por acceder a `rows[0].id` inexistente.
- `lib/validators/user.schema.js` ahora valida `roleId` como entero positivo, alineado con `users.role_id` (`smallint`) y con el formulario que envía `Number(values.roleId)`.
- `eslint.config.mjs` ignora `.kilo/**`, que contiene worktrees auxiliares y no forma parte del código de la aplicación.
- Se mantuvieron sin cambios `auth.js`, `proxy.js`, `lib/permissions.js`, migraciones SQL y reglas de negocio PAR.
- Validación: el esquema de usuario acepta un `roleId` numérico y rechaza valores no numéricos; `npm run build` finaliza correctamente. `npm run lint` queda con 1 error preexistente en `app/(dashboard)/dashboard/page.jsx` y 4 advertencias; no se corrigieron porque pertenecen a fases posteriores o requieren decisión funcional.

## 12. Registro de Fase 3 — integridad PAR (2026-09-18)

- En esta fase se limitó la edición a `Creado`; esa restricción fue sustituida por el estado canónico de edición de PAR aprobado del 2026-10-21.
- Las rutas anidadas ya no dependen solo de la interfaz: el repositorio bloquea operaciones mediante `SELECT ... FOR UPDATE` sobre la cabecera PAR.
- Se protegieron crear, editar y eliminar ítems y equipos PAR, además de eliminar la cabecera.
- Las transiciones de estado se validan dentro de una transacción para evitar carreras. Se mantienen `Creado → Aprobado/Rechazado` y `Aprobado → Rechazado`; las demás transiciones manuales se rechazan.
- Solo Administrador y Supervisor pueden aprobar o rechazar PAR; Coordinador puede crear y consultar, pero no revisar estados.
- Se mantienen `display_status` como campo derivado y los totales calculados por el servidor.
- Las órdenes solo pueden vincularse a PAR persistido en `Aprobado`; PAR inexistente devuelve 404 y cualquier otro estado devuelve 409.
- Las operaciones PAR anidadas devuelven 403 para PAR bloqueado y 404 para recursos inexistentes, sin convertir carreras en errores 500.
- No se modificaron migraciones SQL ni el esquema real de PostgreSQL.
- Validación: `npm run test:permissions` y `npm run build` finalizan correctamente. `npm run lint` mantiene 1 error y 4 advertencias preexistentes fuera de esta fase.
- Los cambios de esta fase no deben interpretarse como autorización para comenzar la Fase 2.

## 11. Registro de Fase 2 — seguridad y permisos (2026-09-18)

- `lib/permissions.js` ahora deniega por defecto las rutas sin una regla explícita.
- La comparación de prefijos respeta límites de ruta: `/api/user` no coincide con `/api/userx` y `/api/par` no coincide con `/api/par-template`.
- Se registraron explícitamente las APIs de usuarios, roles, dashboard, notificaciones, clientes, sincronización Saint, órdenes, equipos, técnicos, productos, PAR, plantillas PAR, ubicaciones y configuración.
- `/api/client/sync` tiene reglas específicas para Administrador y Supervisor y se evalúa antes de `/api/client`.
- `/api/dashboard`, `/api/notification` y consulta de clientes permiten todos los roles autenticados.
- Órdenes y equipos permiten Administrador, Supervisor, Coordinador y Técnico.
- `proxy.js` rechaza sesiones cuyo estado no sea `Activo`.
- `auth.js` revalida el usuario en PostgreSQL durante la actualización del JWT; cambios de rol o desactivaciones ya no permanecen vigentes durante toda la vida del token.
- Se agregó `npm run test:permissions` con cobertura de rutas desconocidas, límites de prefijo, sincronización Saint y rutas PAR/PAR-template.
- No se modificaron reglas de negocio PAR ni migraciones SQL.
- Validación: `npm run test:permissions` y `npm run build` finalizan correctamente. `npm run lint` mantiene 1 error preexistente del Dashboard y 4 advertencias.
## Cierre de pendientes Fases 0–3 (2026-09-18)

### Inventario completo de base de datos verificado en Fase 0

- Tablas públicas (17): `city`, `client`, `configuration`, `country`, `equipment`, `notification`, `par_equipment`, `par_header`, `par_item`, `par_template`, `par_template_item`, `product`, `role`, `service_order`, `state`, `technical`, `users`.
- Secuencias públicas (11): `city_id_seq`, `country_id_seq`, `par_number_seq`, `par_template_id_seq`, `par_template_item_id_seq`, `par_v2_equipment_id_seq`, `par_v2_headers_id_seq`, `par_v2_items_id_seq`, `role_id_seq`, `service_order_id_seq`, `state_id_seq`.
- No existe tabla pública de historial de migraciones. `par_number_seq` existe y estaba alineada con el máximo PAR observado (8).

### Inventario de archivos protegidos

Estos archivos no se modifican accidentalmente sin una aprobación funcional explícita: `auth.js`, `proxy.js`, `lib/permissions.js`, `lib/db.js`, `lib/repositories/*.repository.js` cuando el cambio no pertenece a la fase vigente, `db/migrations/001–030`, `db/migrations/consult.sql`, `db/migrations/consult2.sql`, `AI_CONTEXT.md` y `APP_DEPENDENCIES.md` (estos dos últimos solo se actualizan para documentar cambios aprobados).

- `npm test` quedó configurado como puerta de entrada y ejecuta permisos, regresiones de Fase 1 y políticas PAR.
- Se agregaron `spec/phase1.test.mjs` (colisión de `status` y URL base Saint) y `spec/par-policy.test.mjs` (edición, revisión y transiciones PAR).
- La matriz de permisos recorre cada regla y cada rol, además de conservar las pruebas de prefijos y rutas desconocidas.
- Las reglas puras PAR se centralizaron en `lib/par-policy.js` para que repositorios y pruebas consuman la misma definición.
- Se corrigió el error de lint del Dashboard sin alterar su comportamiento. `npm run lint` queda con 0 errores y 4 advertencias informativas preexistentes.
- Las rutas de ubicación y sincronización de clientes ya no exponen mensajes internos en respuestas 500.
- `.gitignore` permite versionar explícitamente `AI_CONTEXT.md`, `APP_DEPENDENCIES.md`, `README.md` y `.env.example`.
- Validación actual: `npm test`, `npm run lint` y `npm run build` finalizan correctamente (lint solo muestra advertencias).
- Las decisiones funcionales de Fase 3 quedaron resueltas en la sección siguiente.

### Verificación final solicitada

- `npm test` existe como script general y ejecuta todas las pruebas de regresión definidas para Fases 0–3.
- Las pruebas cubren conservación de `status`, URL Saint sin duplicación, estados Saint inválidos, respuestas 404, matriz de roles, respuestas esperadas 401/403, transiciones PAR, bloqueo concurrente por `FOR UPDATE` y cálculos monetarios con redondeo.
- La regla vigente es Configuración solo Supervisor, auditoría de rechazo conservada y vinculación de órdenes solo con PAR `Aprobado`.
## Resolución de decisiones Fase 3 (2026-09-18)

- Configuración (`/configuracion` y `/api/configuration`) queda restringida exclusivamente al rol Supervisor.
- Al rechazar un PAR aprobado se conservan `approved_by` y `approved_at` como auditoría histórica.
- Las órdenes solo pueden vincularse a PAR con estado persistido `Aprobado`; `En Servicio` y `Finalizado` son estados derivados y no son vinculables directamente.
## Registro de Fase 4 — validación uniforme (2026-09-18)

- Se añadió `lib/validators/operational.schema.js` con esquemas Zod para equipos, productos, técnicos, órdenes y configuración.
- Las rutas de creación y actualización de estos módulos validan UUID, fechas, estados, números finitos, rangos y campos obligatorios antes de acceder al repositorio.
- Se añadieron pruebas en `spec/validation.test.mjs` para UUID inválido, fechas inválidas, estados, correos y valores `NaN`.
- Los errores de validación responden 400 con mensajes públicos; conflictos de unicidad conservan 409 y recursos inexistentes conservan 404.
- Validación ejecutada: `npm test`, `npm run lint` y `npm run build` exitosos. Lint mantiene cuatro advertencias no bloqueantes.
## Registro de Fase 5 — base reproducible e integridad estructural (2026-09-18)

- No se modificaron las migraciones históricas `001`–`030`.
- Se añadió `db/migrations/031-integrity-and-history.sql`, idempotente, con `schema_migrations`, recuperación segura de `par_number_seq`, `NOT NULL` condicionado para `par_item.descripcion`, unicidad de equipo principal, unicidad de `item_no` por PAR, checks de estados/valores e índices faltantes.
- Se añadió `db/schema.sql` como esquema consolidado para instalaciones nuevas. `db/migrations/consult.sql` y `consult2.sql` quedan como referencias históricas, no ejecutables.
- Se añadió `db/validate.sql` para huérfanos, duplicados, PAR sin ítems/equipo principal, totales y secuencia.
- Se documentó el procedimiento en `db/MIGRATIONS.md`: instalación nueva, actualización existente, orden, historial y validación posterior.
- La base actual fue inspeccionada en solo lectura antes de diseñar la migración: `par_item.descripcion` no tiene NULL, no hay duplicados de `item_no`, no hay múltiples equipos principales y no hay valores monetarios negativos.
- No se ejecutó ninguna migración sobre la base real. El entorno no dispone de `psql`/Docker local para levantar una PostgreSQL aislada; se validaron estáticamente los artefactos y se dejó documentada esa limitación.
- Con autorización explícita para el entorno de desarrollo, 031 se aplicó mediante `npm run db:migrate -- 031-integrity-and-history.sql` y se ejecutó por segunda vez sin error para comprobar idempotencia.
- `npm run db:test-schema` creó un esquema temporal, ejecutó `schema.sql`, verificó 18 tablas y realizó rollback correctamente.
- PostgreSQL confirmó `schema_migrations`, `par_number_seq`, los índices nuevos y cero NULL en `par_item.descripcion` después de la migración.
- `schema_migrations` es exclusivamente un registro operativo de migraciones: la aplicación no la consulta durante su ejecución. Eliminarla no rompe APIs ni reglas de negocio, pero elimina la trazabilidad y el runner la recreará cuando se ejecute una migración.
## Registro de Fase 6 — pruebas y automatización (2026-09-18)

- `npm test` ejecuta permisos, regresiones de Fase 1, políticas PAR, validadores operativos y artefactos de migración.
- `npm run test:coverage` usa la cobertura nativa de Node sobre todos los archivos `spec/*.test.mjs`; la primera ejecución registró 85.98% de líneas y 77.78% de ramas en los módulos cubiertos.
- `npm run verify` funciona como puerta única: pruebas, lint y build.
- Se añadió `.github/workflows/ci.yml` para ejecutar `npm ci` y `npm run verify` en pushes y pull requests a `main`.
- La integración de rutas contra una base aislada se mantiene separada de CI; `npm run db:test-schema` crea un esquema temporal y hace rollback, sin credenciales de producción.

## Registro de Fase 7 — mantenibilidad del frontend (2026-09-18)

- `ParForm.jsx` comenzó su separación estructural: los catálogos ahora se cargan mediante `components/par/useParCatalogs.js`, con estados explícitos de carga y error; los esquemas y etiquetas reutilizables quedaron preparados en `components/par/parFormSchema.js`.
- Se añadió `components/par/ParFormSummary.jsx` como sección visual reutilizable para continuar extrayendo presentación sin alterar tokens ni componentes UI existentes.
- Se retiraron de `lib/api.js` los wrappers de cliente por identificador (`getClientById`, `updateClient`, `deleteClient`) y `createClient`, porque el endpoint actual solo expone `GET /api/client` y no existían consumidores válidos.
- Se mantiene diferida la extracción específica del módulo de Órdenes de Servicio, que será una tarea funcional independiente.

### Estructura frontend adoptada para Fase 7

- `components/par/` contiene componentes visuales específicos del módulo PAR.
- `components/par/sections/` contiene secciones visuales grandes reutilizables, como `ParSummarySection.jsx`.
- `hooks/par/` contiene hooks de datos y estado exclusivos de PAR; `useParCatalogs` es el hook canónico.
- `lib/par/` contiene constantes, etiquetas y mapeos de dominio del PAR.
- `components/ui/` continúa reservado para componentes visuales genéricos y no debe recibir lógica de negocio PAR.
- Las páginas de catálogo conservan sus rutas en `app/(dashboard)/`; la extracción posterior debe mover carga/mutaciones a hooks de cada módulo sin cambiar contratos API.
- Se añadió `components/par/modals/ParTemplateLoadModal.jsx` y el formulario usa la versión extraída.
- Las secciones completas de equipos e ítems fueron extraídas a `components/par/sections/ParEquipmentSection.jsx` y `components/par/sections/ParItemsSection.jsx`; el bloque duplicado oculto fue eliminado de `ParForm.jsx`.
- `lib/ui-errors.js` centraliza mensajes públicos para 401, 403, 404 y 409; Productos, Equipos y Configuración ya no muestran directamente `error.message` en sus operaciones principales.
- `PermissionState` en `components/ui/EmptyState.jsx` establece el componente común para vistas sin autorización.

## Estado canónico de documentación — Fase 8 (2026-09-18)

Esta sección prevalece sobre descripciones históricas anteriores del archivo.

- La autenticación actual es NextAuth v5 con Credentials, JWT y PostgreSQL; ya no se usa autenticación simulada basada en `localStorage`.
- `auth.js` revalida estado y rol durante la actualización del JWT; `proxy.js` aplica el acceso de páginas y APIs con denegación por defecto.
- Configuración (`/configuracion` y `/api/configuration`) corresponde exclusivamente al rol Supervisor.
- El KPI de clientes del Dashboard usa el estado Saint persistido `'1'`; `'0'` representa inactivo.
- La tabla de usuarios vigente es `users` y sus referencias SQL deben citarla cuando corresponda.
- La migración siguiente aplicada es `031-integrity-and-history.sql`; las migraciones `001`–`030` no se reescriben.
- `schema_migrations` es solo historial operativo del runner y no es dependencia funcional del runtime.
- La estructura PAR vigente es `components/par/sections/`, `components/par/modals/`, `hooks/par/` y `lib/par/`.
- La documentación debe actualizarse en el mismo cambio funcional que modifique contratos, permisos, migraciones o estructura de carpetas.
- La validación Zod de usuarios está completa: `userSchema` valida creación con contraseña, `userUpdateSchema` valida actualización con contraseña opcional y `userStatusSchema` valida cambios de estado. Las tres rutas usan estos esquemas antes de acceder al repositorio.

## Estado canónico — normalización de plantas, contactos, órdenes y PAR (2026-09-19)

Esta sección prevalece sobre cualquier descripción histórica incompatible en este archivo.

### Base de datos

- Las migraciones `032-service-order-relations.sql`, `033-par-header-plant-backfill.sql` y `034-required-relations-and-par-contact.sql` están aplicadas en la base de desarrollo.
- Antes de aplicar 034 se eliminaron, con autorización explícita, los 3 PAR de desarrollo. El borrado en cascada dejó `par_header`, `par_equipment` y `par_item` sin registros. No existían órdenes vinculadas a esos PAR.
- 034 creó un contacto de prueba por cada planta existente: 8 contactos para 8 plantas en el momento de la ejecución.
- Todos los nombres nuevos de tablas, columnas y restricciones de base de datos están en inglés.
- Relaciones obligatorias actuales:
  - `equipment.plant_id` es `NOT NULL`.
  - `service_order.client_id`, `plant_id`, `equipment_id`, `technical_id` y `contact_id` son `NOT NULL`.
  - `par_header.client_id`, `plant_id` y `contact_id` son `NOT NULL`.
  - `service_order.amount` es `NOT NULL`, con fallback de migración a `0`.
- `par_header.atencion` fue eliminada. El contacto del PAR se representa exclusivamente mediante `par_header.contact_id`.
- Las claves compuestas validan pertenencia y evitan combinaciones cruzadas entre planta/cliente, equipo/cliente/planta, contacto/cliente/planta, orden y PAR.
- `db/schema.sql` representa este modelo para instalaciones nuevas y `db/validate.sql` incluye verificaciones de relaciones faltantes o inconsistentes.

### Contratos funcionales actuales

- Plantas: CRUD real mediante `/api/plant` y `/api/plant/[id]`; campos `name`, `code`, `address`, `client_id`. `code` es obligatorio y único por cliente.
- Contactos: CRUD real mediante `/api/contact` y `/api/contact/[id]`; campos `name`, `department`, `client_id`, `plant_id`, `phone`, `email`.
- Órdenes de servicio usan relaciones reales obligatorias. Los snapshots `client_description`, `equipment_name` y `technician_name` se conservan únicamente para compatibilidad histórica y fallback de lectura.
- La pantalla `/ordenes` está conectada al backend y expone filtros por cliente, planta, prioridad y estado, además de la búsqueda de `DataTable`.
- El formulario de órdenes exige seleccionar un PAR aprobado y de 1 a 3 técnicos. Cliente, planta, contacto, equipos, productos y descripción se heredan del PAR.
- PAR exige Cliente → Planta → Contacto. `ParPreview.jsx`, `ParPrintSheet.jsx` y el modal de detalle muestran planta y contacto.
- Equipos incluyen `consortium`, `hp` y `pressure`; la unidad presentada para presión es PSI. La lista, tarjetas, detalle, búsqueda y exportación incluyen estos datos. Los modales de detalle y creación/edición usan el tamaño ancho `2xl` y la misma distribución compacta de tres filas. El campo visible es “Tipo de Equipo”, aunque conserva el contrato técnico `name`, y ocupa el mismo ancho que Cliente. Ninguno de los dos modales presenta `location`: Planta (`plant_id`) es la ubicación operativa; la columna histórica permanece en backend por compatibilidad. La migración `049-equipment-drop-maintenance.sql` eliminó `last_maintenance` y `next_maintenance` de `equipment`; ya no aparecen en formulario, tarjetas, detalle, exportación, importación (hoja Equipos) ni en el Dashboard (se quitó el KPI `upcoming` y la card "Próximos mantenimientos").
- Los modales de creación/edición y de detalle de Productos y Equipos siguen el patrón visual de Contactos/Plantas: banner de error animado (`motion`), campos con icono, `*` en las etiquetas obligatorias, `autoFocus` en el primer campo y títulos de detalle “Detalle de producto”/“Información del producto.” y “Detalle de equipo”/“Información del equipo.”, conservando la cuadrícula `2xl`.
- La validación de cliente de esos modales usa Zod (`productSchema` con mensajes en español y `equipmentFormSchema`, que extiende `equipmentSchema` con `plantId` obligatorio) y solo alimenta los errores por campo; el payload enviado a la API no cambió. `hp` y `pressure` pasan por `optionalNumber`, que convierte `""`/`null` en `null` (antes `""` podía llegar al repositorio).
- `/api/dashboard` obtiene cliente, planta, equipo, técnico y contacto mediante JOIN; solo usa los snapshots de órdenes como fallback.
- `/api/search` es la búsqueda global autenticada. Busca clientes, plantas, contactos, órdenes, equipos y técnicos. Está registrada en `API_PERMISSIONS` para todos los roles autenticados.

### Pruebas y estado de validación

- `spec/catalog-order.integration.test.mjs` usa esquemas PostgreSQL temporales y rollback para cubrir CRUD de plantas/contactos, creación y edición de órdenes normalizadas, rechazos por relaciones incorrectas, backfill real de 032/033 y el flujo Cliente → Planta → Equipo → Contacto → Orden.
- `spec/migrations.test.mjs` valida los artefactos de 034 y `spec/validation.test.mjs` exige `contactId` en órdenes.
- `npm test`, `npm run lint` y `npm run build` finalizaron correctamente el 2026-09-19. ESLint conserva 4 advertencias informativas y cero errores.
- El 2026-10-15 se revalidó tras alinear los modales de Productos y Equipos: `npm test` (todas las suites), `npm run lint` (cero errores, 3 advertencias) y `npm run build`.

### Corrección de permisos al crear PAR (2026-09-19)

- `ParForm.jsx` ya no consulta `/api/configuration`, porque esa ruta contiene la configuración completa y permanece restringida exclusivamente a Supervisor.
- La precarga de la tasa usa `GET /api/configuration/exchange-rate`, que devuelve solamente `{ exchange_rate }`.
- La nueva ruta permite Administrador, Supervisor y Coordinador, los mismos roles capaces de crear PAR, y su regla debe permanecer antes de `/api/configuration` en `API_PERMISSIONS`.
- `lib/api.js` expone `getExchangeRate()` para este contrato limitado. No ampliar el permiso de `/api/configuration` para resolver necesidades de lectura parcial.
- La matriz de permisos, las pruebas completas, lint y build fueron ejecutados correctamente después de la corrección.

## Estado canónico — rol Superadministrador (2026-09-19)

- La migración `035-add-super-administrator-role.sql` está aplicada en la base de desarrollo y registra el rol `Superadministrador`.
- `ROLES.SUPER_ADMIN` es el identificador canónico en código.
- `canAccessRole(role, allowedRoles)` concede al Superadministrador acceso a toda ruta registrada, pero mantiene denegadas las rutas desconocidas. No omite autenticación, estado activo, validaciones de negocio ni restricciones de base de datos.
- `proxy.js`, Sidebar y `PermissionsMatrix` consumen esta regla común. No se debe implementar un bypass distinto en cada módulo.
- Las comprobaciones específicas también incluyen Superadministrador: aprobación/rechazo de PAR y edición de costos de productos.
- `/api/user` y `/api/roles` están protegidas contra escalamiento:
  - Administrador no puede asignar el rol Superadministrador.
  - Administrador no puede modificar o desactivar una cuenta Superadministrador.
  - Solo Superadministrador ve ese rol en el catálogo de roles.
  - No se permite retirar el propio acceso ni desactivar al último Superadministrador activo.
- El primer usuario se promueve de forma controlada con `npm run user:grant-super-admin -- <login> --confirm`. El script requiere un usuario existente y activo; no contiene ni crea contraseñas.
- Después de promover una cuenta, el usuario debe cerrar sesión y volver a entrar para renovar el JWT.
- La primera cuenta promovida es `ewil` (Ewil Ascanio). Se verificó activa con rol `Superadministrador` en la base de desarrollo.
- Validación ejecutada: `npm test`, `npm run lint`, `npm run build` y `npm run db:test-schema`; cero errores, cuatro advertencias informativas de lint.

## Estado canónico — flujo PAR → Orden de Servicio y sincronización Saint (2026-09-19)

- Las migraciones `036-normalize-service-orders.sql` a `041-par-equipment-description-required.sql` están aplicadas en la base de desarrollo.
- Toda orden nueva exige `service_order.par_id NOT NULL`; el PAR debe existir, permanecer aprobado, pertenecer a un cliente Saint activo, tener `observations` y al menos un equipo de catálogo.
- `work_description` es obligatorio y se construye en el servidor desde `par_equipment.observaciones`, ordenando primero el equipo principal y luego los adicionales. Si existen varias descripciones se concatenan con saltos de línea. La orden lo muestra como solo lectura y conserva una copia histórica.
- `par_equipment.observaciones` se presenta como **Descripción del trabajo a realizar**, es obligatorio y no puede quedar en blanco. Es la fuente única de `service_order.work_description`.
- `par_header.observations` vuelve a ser opcional. La migración 040 corrige y revierte la restricción introducida por 039; no se debe usar la observación general del PAR como descripción del trabajo.
- Cliente, planta, contacto y equipo principal se resuelven en el servidor desde el PAR; no se confía en identificadores relacionales enviados por la pantalla de órdenes.
- La migración 038 refuerza esa regla con claves foráneas compuestas: el alcance cliente/planta/contacto y el equipo de la orden deben pertenecer al mismo PAR incluso ante escritura SQL directa.
- Campos operativos nuevos: `purchase_order_number`, `quotation_number`, `work_type`, `service_type`, `call_date`, `scheduled_start`, `scheduled_end`, `worked_hours`, `prepared_by`, `approved_by` y `approved_at`.
- `service_order_technician` normaliza la asignación de 1 a 3 técnicos activos. La primera selección es el técnico principal y existe una restricción de base contra un cuarto técnico.
- Estados operativos: `Pendiente → Aprobada → En Proceso → Completada`, con `Cancelada` como salida permitida antes de completar. La aprobación sella usuario y fecha desde la sesión; solo Superadministrador, Administrador y Supervisor pueden aprobar.
- El catálogo de órdenes devuelve PAR aprobados con cliente, planta, contacto, equipos, ítems y descripción. Dashboard y búsqueda global consultan el PAR y la tabla de asignaciones técnicas.
- Clientes continúa siendo una réplica local de solo lectura de Saint. No se eliminan ni se bloquean manualmente; el estado explícito de Saint determina si pueden usarse en operaciones nuevas.
- La sincronización de clientes valida catálogos vacíos, códigos faltantes y duplicados; ejecuta un upsert masivo transaccional con bloqueo consultivo y registra resultados en `integration_sync_run`.
- No se desactiva un cliente por ausencia en la respuesta: solo se aplica el estado explícito recibido desde Saint.
- Verificación posterior: `npm test`, `npm run lint`, `npm run build` y `npm run db:test-schema`; cero errores y cuatro advertencias de lint preexistentes/informativas.

## Estado canónico — presentación de Órdenes de Servicio (2026-09-19)

- `/ordenes` replica el patrón visual de Equipos con selector persistente entre tabla y tarjetas (`mq-ordenes-view`).
- La búsqueda se ejecuta fuera de `DataTable` y alimenta ambas vistas con el mismo resultado; incluye orden, PAR, compra, cotización, cliente, planta, contacto, técnicos, tipo, estado y prioridad.
- Los estados se presentan como selector segmentado. Cliente, planta y prioridad ocupan una segunda fila responsive para evitar que los filtros queden comprimidos o desordenados.
- El contador visible siempre representa el resultado combinado de búsqueda y filtros.
- `ServiceOrderCardGrid.jsx` pagina 12 órdenes y navega al documento completo; el listado ya no crea, edita ni muestra órdenes dentro de modales.
- Cambiar filtros o búsqueda reinicia la paginación de tarjetas. La preferencia tabla/cards se conserva en `localStorage` mediante `useLocalStorage`.
- La creación usa exclusivamente la ruta española `/ordenes/nueva`; al guardar redirige a `/ordenes/[id]`.
- `/ordenes/[id]` concentra vista previa, edición, impresión A4 y transiciones de estado. `ServiceOrderPreview` es la presentación en pantalla y `ServiceOrderPrintSheet` es el documento exclusivo de impresión.
- Solo una orden `Pendiente` admite edición general y el PAR permanece inmutable. En `En Proceso` únicamente se pueden actualizar las horas trabajadas. Órdenes aprobadas, completadas o canceladas quedan bloqueadas para edición general también en el repositorio.
- Aprobar requiere confirmación y el rol Superadministrador, Administrador o Supervisor. La transición registra `approved_by` y `approved_at`; Coordinador y Técnico no ven la acción de aprobación.
- La consulta de órdenes incluye dirección y código del cliente, dirección de planta, teléfono/correo del contacto y datos descriptivos de cada equipo para vista previa e impresión.
- Validación ejecutada: pruebas completas, lint completo y build de producción; cero errores y las mismas cuatro advertencias informativas preexistentes.

### Selección de PAR y técnicos en la orden

- `ServiceOrderForm` usa `ParSearch` en lugar de un `Select`. El buscador localiza PAR aprobados por número, cliente, código de cliente, planta o contacto y presenta la selección como una tarjeta compacta.
- En edición, el PAR seleccionado se muestra bloqueado porque la relación es inmutable.
- `TechnicianSelector` reemplaza la lista permanente de checkboxes. El formulario muestra solo los técnicos asignados y abre un modal para buscar y seleccionar técnicos activos.
- El modal trabaja con una selección temporal: cancelar no altera el formulario y “Aplicar selección” confirma los cambios.
- Se mantienen entre uno y tres técnicos. El principal se elige explícitamente y se conserva como el primer elemento de `technicianIds`.
- Un técnico histórico que se volvió inactivo permanece visible, pero debe quitarse o reemplazarse antes de guardar una orden pendiente.
- Estos cambios no modifican el payload ni requieren migración: continúan usándose `parId` y `technicianIds`.

### Numeración automática de órdenes

- La migración `042-service-order-automatic-number.sql` está aplicada en desarrollo.
- `service_order_number_seq` genera códigos con formato `OS-000001`, `OS-000002`, etc. La secuencia se inicializa por encima del mayor identificador o sufijo numérico existente.
- `order_code` tiene un valor predeterminado de PostgreSQL basado en la secuencia. El repositorio omite esta columna durante la creación, por lo que la numeración es atómica y segura ante creaciones concurrentes.
- El payload de creación ya no acepta ni necesita `orderCode`. El campo se presenta bloqueado: antes de guardar indica que será asignado automáticamente y en el detalle conserva el número real.
- Las órdenes históricas conservan sus códigos actuales; la migración no renumera registros existentes.

### Auditoría visible y acción de creación

- En `/ordenes/nueva`, el botón “Crear Orden” está al final del formulario junto a “Cancelar”; el encabezado conserva únicamente “Volver”.
- `ServiceOrderForm` muestra una sección de auditoría de solo lectura. “Creado por” toma el usuario de la sesión y “Aprobado por” muestra “Pendiente de aprobación” hasta ejecutar la transición.
- La fuente real continúa siendo el servidor: `prepared_by` se asigna desde la sesión en `POST /api/service-order` y `approved_by`/`approved_at` desde la sesión al aprobar. La interfaz no envía esos identificadores.
- Vista previa e impresión usan la etiqueta “Creado por” y reflejan automáticamente el aprobador devuelto por los JOIN de la orden.
- En `ServiceOrderPreview`, “Creado por” aparece únicamente en la sección inferior de firmas junto a “Aprobado por”; el resumen conserva solo técnicos asignados y horas trabajadas. Las líneas se dibujan al inicio de cada columna y permanecen alineadas aunque el aprobador tenga una fecha o el texto de aprobación pendiente.

## Estado canónico — Calendario de Técnicos (2026-09-19)

- `/calendario-tecnicos` dejó de ser una pantalla provisional. Usa FullCalendar React con vistas Mes, Semana, Día y Agenda, filtros por técnico, estado, prioridad, servicio, cliente y planta, resumen del rango y agenda diaria.
- La presentación canónica de estados visibles es:

| Estado en base de datos | Estado visible en calendario | Color | Regla |
|---|---|---|---|
| `Pendiente` | No aparece | — | Todavía no fue aprobada |
| `Aprobada` | Programada · Pendiente de iniciar | Azul | Ya fue aprobada y alimenta la agenda |
| `En Proceso` | En ejecución | Naranja | Los técnicos comenzaron el servicio |
| `Completada` | Completada | Verde | Permanece como histórico |
| `Cancelada` | No aparece | — | Se excluye de la agenda |

- Los textos y colores anteriores son únicamente una presentación del calendario; no agregan estados nuevos ni cambian los valores persistidos.
- FullCalendar React 7 recibe el estilo de cada evento mediante `color`, `contrastColor` y `className`. `getFullCalendarEventStyle` adapta la configuración canónica a ese contrato; no usar las propiedades heredadas `backgroundColor`, `borderColor`, `textColor` o `classNames` en el objeto enviado al calendario porque la versión instalada las ignora y muestra el azul predeterminado.
- La acción de `Aprobada` a `En Proceso` se presenta como **Iniciar servicio** y exige una confirmación que explica que comenzará la ejecución y se habilitarán las horas trabajadas.
- El calendario es estrictamente de solo lectura: no crea, arrastra, redimensiona ni elimina eventos. El detalle navega a `/ordenes/[id]`.
- No existe tabla de eventos ni endpoint de escritura. `GET /api/technician-calendar` deriva cada asignación desde `service_order` + `service_order_technician` y solo consulta órdenes con `approved_by` y `approved_at`, excluyendo `Cancelada`.
- Las órdenes `Aprobada`, `En Proceso` y `Completada` permanecen visibles porque la elegibilidad depende del sello de aprobación y no únicamente del estado actual.
- Aprobar valida dentro de la transacción: horario final posterior al inicial, entre uno y tres técnicos activos y solapamientos contra otras órdenes aprobadas. Un conflicto devuelve `ORDER_SCHEDULE_CONFLICT`; el aprobador debe confirmar explícitamente la excepción.
- `technical.user_id` relaciona de forma única el técnico con su cuenta. Los usuarios con rol Técnico acceden a `/calendario-tecnicos`, pero el backend fuerza su propia agenda. Si no existe vínculo, la API responde `TECHNICIAN_ACCOUNT_NOT_LINKED`.
- El mantenimiento de Técnicos permite seleccionar una cuenta activa con rol Técnico. La migración 043 intenta vincular registros históricos por coincidencia inequívoca de correo.
- La migración `043-technician-calendar.sql` está aplicada en desarrollo. Agrega `technical.user_id`, consistencia conjunta de `approved_by`/`approved_at` e índices parciales para el rango del calendario; no crea tablas de eventos.
- `spec/technician-calendar.test.mjs` cubre elegibilidad, permanencia histórica, cancelación, solapamientos, horarios consecutivos, separación entre técnicos y ausencia de endpoints de escritura.
- Dependencias nuevas: `@fullcalendar/react` y `temporal-polyfill`.
- Verificación ejecutada: `npm test`, `npm run build` y `npm run db:validate`. La validación de base confirma migración 043, auditoría de aprobación consistente, órdenes aprobadas con técnicos y ausencia de usuarios técnicos duplicados.
