# Fotos y pendientes de las órdenes de servicio

> Vigente · 1 de noviembre de 2026. [Índice](../README.md) · [Expediente y cierre](../cierre-orden-servicio.md).

## Propósito y flujo

La O/S conserva la evidencia del servicio y origina pendientes que pueden resolverse después de su cierre. Cada pendiente pertenece a toda la O/S, sin equipo individual, y conserva el cliente, planta y PAR de origen.

Flujo: O/S En Proceso → fotos y renglones guardados → Cerrar O/S → O/S Completada y renglones publicados como Pendiente → seguimiento → Completado. La lista puede estar vacía. La existencia de pendientes no impide cerrar la orden.

## Fotos del servicio

- Hasta **cinco fotos vigentes por O/S**, compartidas por todos los participantes; opcionales, JPG/JPEG o PNG, hasta 10 MB por foto.
- La galería permite ampliar, descargar, reemplazar y retirar durante En Proceso. Retirar requiere motivo; reemplazar registra el archivo que lo sustituye. Se conserva contenido, autor y fecha de las versiones anteriores.
- No forman una quinta categoría obligatoria de los documentos por equipo. El cierre comprueba la disponibilidad de las fotos guardadas.
- Contenido en el mismo disco privado del expediente; metadatos en `service_order_photo`. Descarga autenticada, sin caché pública y con verificación de hash.
- Cinco posiciones, de 1 a 5, con índice único parcial por orden/posición vigente. El servidor bloquea PAR → O/S y revisa `closure_revision` antes de cargar; una carga concurrente no puede superar el límite.

## Borradores de pendientes

El técnico escribe una descripción por renglón, agrega/retira líneas y pulsa **Guardar pendientes**. Se permiten hasta 200 líneas de 1–2000 caracteres; no se guardan líneas vacías ni identificadores repetidos. Cliente/planta se obtienen del servidor y no son campos editables del formulario.

Cada fila se guarda en PostgreSQL como Borrador, con identidad UUID estable, posición, autor original y último editor. Guardar no publica ni cambia el estado de la O/S. Retirar conserva la fila y la operación en el historial. El control de revisión impide sobrescribir cambios de otra sesión.

Las modificaciones locales sin guardar bloquean Cerrar O/S. Actualizar el expediente solicita confirmación antes de descartarlas. El usuario debe guardar antes de abandonar la pantalla; no existe autoguardado.

## Publicación y conservación del origen

El cierre valida documentos, fotos y horas; confirma la O/S y publica sus líneas activas en **la misma transacción**. No copia filas: pasa las existentes de Borrador a Pendiente y conserva su UUID. Un reintento no duplica registros y un fallo de publicación revierte también el cierre.

Al publicar se conservan código/nombre del cliente, código/nombre de planta, código O/S y número PAR, además de las FK originales. Los cambios posteriores de catálogo no reescriben esas copias. Una FK compuesta obliga a que orden, PAR, cliente y planta sean compatibles.

Cancelar una O/S conserva sus borradores y fotos como consulta, sin publicar pendientes. Órdenes anteriores no reciben pendientes ni fotos inventados. Las Completadas/Canceladas no permiten nuevas cargas ni edición del contenido original.

## Seguimiento y dashboard

La página **Lista de pendientes** (`/pendientes`) consulta exclusivamente filas publicadas. Permite filtrar por cliente, planta, estado, texto de código O/S y descripción. Pagina en servidor de 20 en 20 y muestra los más antiguos primero.

**Resolver pendiente** solicita una solución de 5–2000 caracteres. Al confirmar, guarda Completado, solución, usuario, fecha y un evento. La revisión y el bloqueo de la fila evitan completar dos veces. No se reabre la O/S, ni se cambian horas o importes; el texto y origen publicados permanecen inmutables mediante trigger SQL. Los completados se conservan, sin borrado ni reapertura implementados.

El expediente cerrado muestra el texto original y, por separado, el estado actual del seguimiento y su solución. Este estado puede evolucionar sin modificar el cierre documental.

La card del dashboard **Lista de pendientes** muestra el total abierto y los cinco más antiguos con cliente, planta y O/S; **Ver todos** abre la página. Ambos consumen datos reales y el mismo alcance de autorización. Al volver al dashboard se consulta el resumen actualizado; no existe actualización por eventos en tiempo real.

### Vistas de tabla y cards

El selector y los filtros comparten la barra de la lista, con el mismo orden visual de Plantas: búsqueda, cliente, planta, estado, contador y alternancia tabla/cards. La búsqueda de texto compara la descripción o el código de la O/S y, al pausar la escritura, vuelve a la página 1. Cliente, planta y estado se aplican al cambiarlos y también vuelven a la página 1. La vista inicial es Tabla; la preferencia se guarda en el navegador con `mq-pendientes-view`. Si el almacenamiento no está disponible, la selección funciona durante la sesión de la página. Solo se guarda la preferencia visual, no el contenido de los pendientes.

Ambas vistas consumen los mismos `items`, `total`, `pageSize` y `canComplete` de `/api/pending`. Cambiar de vista conserva los filtros aplicados y la página actual, sin consultar otra lista, ordenar nuevamente ni paginar dentro del componente de cards. Recargar la página recupera la vista elegida, pero los filtros y la página vuelven a sus valores iniciales.

Cada card corresponde a un pendiente publicado y muestra estado, descripción resumida, cliente, planta, O/S, PAR y fecha de publicación. La tabla también identifica el PAR junto a la O/S. Los datos de origen son las copias históricas recibidas del servidor, no consultas nuevas a los catálogos. La cuadrícula usa una columna en móvil, dos desde la pequeña, tres en pantallas grandes y cuatro en las más amplias, igual que Plantas. Comparte colores, estados vacíos y formato de fecha con la tabla.

Pulsar una fila, una card o su botón abre el mismo modal de consulta/resolución, con descripción completa, autor, solución e historial. La card y la fila admiten teclado; enlaces y botones internos no disparan adicionalmente la consulta. El enlace O/S navega a la orden. El botón es **Resolver pendiente** solo para registros Pendiente cuando `canComplete` es verdadero; en los demás casos es **Ver detalle**. La autorización sigue comprobándose en servidor.

Tras completar, se conserva la vista y los filtros, se cierra el modal y se recarga la página 1. Con filtro Pendiente el registro desaparece; con Todos/Completado se consulta su estado y solución. La revisión, historial y reglas de cierre existentes permanecen iguales. Carga, error y ausencia de resultados se presentan sin habilitar acciones sobre datos en carga.

Fuentes de presentación: `app/(dashboard)/pendientes/page.jsx`, `components/pending/PendingCardGrid.jsx`, `components/pending/pendingPresentation.js`, `ViewToggle` y `useLocalStorage`. No hay una segunda API. La búsqueda de un solo texto compara descripción o código de O/S; si la consulta envía orden y descripción a la vez, ambas deben coincidir.

## Permisos

| Acción | SA / Administrador / Supervisor / Coordinador | Técnico | Usuario |
|---|---|---|---|
| Preparar fotos y pendientes | Cualquier O/S En Proceso | Solo O/S donde esté programado y tenga usuario vinculado | No |
| Consultar nuevas fotos y pendientes | Todos | Solo sus O/S programadas | No |
| Completar pendientes publicados | Sí | No | No |
| Cerrar O/S | SA / Administrador / Supervisor | No | No |

La nueva autorización de Técnico es específica para fotos y pendientes. No habilita escritura de horas, documentos por equipo o No aplica. `technical.user_id` y `service_order_technician` se comprueban en servidor; no se deduce identidad por nombre o cédula. Un técnico sin vínculo no ve resultados de seguimiento ni puede cargar. Los datos nuevos tampoco se exponen en los eventos de expediente a técnicos ajenos a la O/S. El alcance general previo de las demás consultas de órdenes se conserva.

## Fuentes, persistencia y validación

- Migración `056-service-order-photos-pending.sql`; espejo en `db/schema.sql`. Tablas `service_order_photo`, `service_pending_item`, `service_pending_event`; FK, índices y trigger de conservación.
- `lib/service-pending.js`, `lib/validators/service-pending.schema.js`: límites y contratos.
- `lib/repositories/service-pending.repository.js`: alcance, borradores, publicación, consulta, resolución y resumen.
- `lib/repositories/service-order-closure.repository.js`: transacción de cierre, fotos y revisión compartida.
- `app/api/service-order/[id]/closure/`, `app/api/pending/`, `app/api/dashboard/route.js`: APIs autenticadas.
- `ServiceOrderFieldWork`, `ServiceOrderClosure`, página `/pendientes` y `PendingDashboardCard`: edición y consultas.
- `lib/permissions.js`, `lib/constants.js`, `lib/api.js`: rutas, navegación y clientes HTTP.

Prueba reproducible: `npm run test:service-pending`. Usa esquema y almacenamiento temporales con datos ficticios, retirados al finalizar. [Operación](../operacion/despliegue-respaldo-migraciones.md) · [Evidencia de entrega](../historico/2026-10-30/fotos-pendientes-os.md) · [Comprobaciones de tabla y cards](../historico/2026-10-31/cards-pendientes.md).
