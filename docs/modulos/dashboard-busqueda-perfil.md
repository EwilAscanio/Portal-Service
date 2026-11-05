# Dashboard, búsqueda y módulos de apoyo

> Vigente · revisión estática: 22 de octubre de 2026. [Índice](../README.md)

## Dashboard

Fuentes: `app/api/dashboard/route.js`, `app/(dashboard)/dashboard/page.jsx`.

Flujo: abrir → consultar KPI y últimas órdenes → renderizar resumen → navegar al módulo autorizado. Consulta PostgreSQL; no escribe estados de negocio.

Lee órdenes, clientes, equipos y técnicos. Cliente activo se compara con `'1'`. Últimas órdenes se relacionan con PAR, cliente, planta, contacto y roster técnico. El campo de ingresos agrega `service_order.amount` de completadas; no representa facturas, cobros ni comisiones.

**Límite observado:** la serie `ordersByStatus` del endpoint incluye Completada, En Proceso, Pendiente y Cancelada; no incluye Aprobada, aunque el total general sí cuenta todas. No asumir que las categorías suman el total.

Actualización del 30 de octubre de 2026: la card **Lista de pendientes** consulta el total abierto y los cinco más antiguos publicados al cerrar O/S, con acceso a `/pendientes`. `pendingSummary` aplica permisos en servidor: gestores ven todos, Técnico solo órdenes donde participa y Usuario no recibe el resumen. La card informa carga/error y no confunde un fallo con cero pendientes. Ver [flujo de seguimiento](pendientes.md).

## Búsqueda global

Fuente: `app/api/search/route.js` y consumidores de `lib/api.js`.

Flujo: texto → mínimo dos caracteres → consultas parametrizadas → hasta tres resultados por categoría → navegación. Consulta clientes, plantas, contactos, órdenes, equipos y técnicos; no crea ni modifica documentos.

El endpoint está disponible a todos los roles autenticados registrados y ejecuta las seis consultas sin filtrar cada entidad según sus permisos de módulo. Puede devolver teléfonos, correos, identificación técnica y referencias comerciales. Esta es una observación del alcance actual, no una garantía de filtrado por rol; ver [pendientes](../pendientes-documentados.md).

## Perfil

Fuente: `app/(dashboard)/perfil/page.jsx`.

Muestra identidad de sesión, formulario local, estadísticas de demostración y actividad recibida de notificaciones. Guardar muestra una confirmación simulada y no persiste cambios en users. Foto de perfil anuncia una función pendiente.

No usar sus estadísticas, antigüedad o actividad como auditoría de acciones reales. La gestión efectiva de usuarios está en el módulo de usuarios.

## Notificaciones

Fuentes: `app/api/notification/route.js`, `app/api/notification/[id]/route.js`, `data/notifications.js`, `lib/repositories/notification.repository.js`.

La ruta actual usa datos de demostración; las acciones de marcado responden sin constituir una persistencia completa de notificaciones de negocio. La existencia del repositorio o una tabla no demuestra que las APIs estén conectadas a ellos.

No hay generación automática documentada de notificaciones al aprobar PAR, crear O/S o cerrar el servicio. El flujo visual no se debe presentar como trazabilidad operativa.

## Vendedores

Fuentes: `app/(dashboard)/vendedores/page.jsx`, `components/catalog/VendorCardGrid.jsx`, `app/api/vendor/route.js`, `app/api/vendor/sync/route.js`, `lib/repositories/vendor.repository.js`, `app/(dashboard)/configuracion/page.jsx`, migración `059-vendor.sql`.

Flujo: Configuración → Sincronizar Vendedores → Saint `GET /api/vendedores` → upsert por `codvend` → la ventana consulta el catálogo. La pantalla ofrece búsqueda, filtro Activo/Inactivo, tabla y tarjetas, y un detalle de solo lectura. No hay alta, edición ni eliminación local.

Saint es la fuente. `CodVend` se guarda en `codvend`, `Descrip` en `description`, `ID3` en `cedula`, `Telef` en `phone`, `Activo` en `status` (`'1'`/`'0'`), `Email` en `email` y `Pais`/`Estado`/`Ciudad` como códigos `cod_saint`. Un código de ubicación `0` se guarda vacío. Los nombres de ubicación salen por `LEFT JOIN`. La cédula puede venir vacía o repetirse. Un catálogo vacío, un código vacío, un código duplicado o un estado distinto de `'1'`/`'0'` rechaza la corrida. Los vendedores que dejan de venir en la respuesta se conservan. La corrida queda en `integration_sync_run` con entidad `Vendor`.

Consultan Administrador, Supervisor y Coordinador, además de Superadministrador. Sincronizan Administrador, Supervisor y Superadministrador. El catálogo no se asigna a PAR u órdenes y no calcula comisiones.

## Cambio futuro

Conectar estos módulos requerirá definir datos, alcance de acceso, escritura, auditoría y consumidores. Hasta entonces distinguir expresamente las consultas reales del contenido de demostración. No completar la descripción con capacidades supuestas.
