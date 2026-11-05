# Tabla y cards en la lista de pendientes

> Implementación del 31 de octubre de 2026; verificación final del 1 de noviembre de 2026. Registro histórico; comportamiento vigente en [pendientes](../../modulos/pendientes.md#vistas-de-tabla-y-cards).

## Alcance

Se agregó `PendingCardGrid` y el selector compartido `ViewToggle` a la página de pendientes. La preferencia se conserva localmente; ambas vistas reciben la misma página del servidor, filtros, permisos y orden. La card identifica estado, descripción resumida, cliente, planta, O/S, PAR y publicación. La tabla identifica también el PAR.

Fila, card y acción abren el modal existente. Los enlaces a la O/S conservan su navegación y la activación por teclado no abre acciones adicionales. Completar mantiene la vista y filtros, recarga la primera página y conserva la validación, revisión e historial existentes.

Fuentes: `app/(dashboard)/pendientes/page.jsx`, `components/pending/PendingCardGrid.jsx` y `components/pending/pendingPresentation.js`. No cambian API, repositorios, permisos, SQL ni dependencias. No se modificaron datos operativos.

La guía de pendientes documenta el comportamiento; AI_CONTEXT resume la reutilización y APP_DEPENDENCIES enlaza productores, presentación y resolución. No se añadió una tarea en TAREAS.MD.

## Comprobaciones

- `npm run lint`: cero errores; permanecen las tres advertencias previas en `app/layout.jsx`, `components/par/ParForm.jsx` y `lib/axios.js`.
- `npm run build`: compilación de producción correcta.
- Suite existente de `spec/service-pending.integration.test.mjs`, ejecutada desde una copia temporal que amplía únicamente la preparación de navegador: correctos los permisos, alcance del técnico, publicación al cierre, snapshots, concurrencia, resolución, historial y resumen del dashboard. La copia añadió 24 renglones ficticios para comprobar la paginación visual.
- Navegador: segunda página con seis registros idénticos al alternar tabla/cards; persistencia de la vista al volver; búsqueda sin resultados; filtros por descripción, estado y O/S; apertura por teclado desde card y fila; enlace a la O/S; resolución con longitud mínima y consulta posterior de la solución como Completado.
- Presentación: una columna a 390 px, dos en la vista de 1270 px y tres a 1440 px; estados Pendiente/Completado, temas claro/oscuro, texto largo resumido y detalle completo.
- Verificación final del 1 de noviembre: el Técnico visualiza sus cards y el detalle, sin botones de resolución ni campo de solución; no aparecen las órdenes del otro técnico ficticio.

Las pruebas usan una base aislada y datos ficticios. Se cerró la sesión, se detuvo el servidor temporal y se retiraron su esquema y archivos de prueba. Las capturas locales se conservan fuera de Git. Los resultados corresponden a esta ejecución; no certifican instalaciones posteriores.
