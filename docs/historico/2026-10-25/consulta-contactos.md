# Consulta compartida de contactos

> Entrega del 25 de octubre de 2026. Evidencia puntual; la regla vigente se mantiene en la [guía del módulo](../../modulos/clientes-plantas-contactos-equipos.md#consulta-compartida-desde-tabla-y-cards).

## Problema y resultado

Las cards abrían un detalle propio y la tabla solo ofrecía editar/eliminar. Ahora fila, card y Ver contacto muestran los mismos seis campos mediante un único modal administrado por la página. La consulta permite pasar al formulario existente, sin superponer modales ni activar el detalle al usar botones internos.

Se ajustaron los textos largos y el desplazamiento de consulta/edición para pantallas pequeñas, así como la distribución de los filtros. Se conservaron búsqueda, filtro por cliente, 8 registros por página de tabla, 12 por página de cards y ordenamiento propio de la tabla.

## Archivos de la entrega

- `components/catalog/ContactConsultationModal.jsx`: detalle compartido con campos completos, valores vacíos y desplazamiento.
- `components/catalog/ContactCardGrid.jsx`: delegación de consulta mediante `onView` y separación del teclado de botones internos.
- `app/(dashboard)/contactos/page.jsx`: selección compartida, clic de fila, Ver contacto, aislamiento del menú y transición a edición.
- Guía de catálogos, AI_CONTEXT, APP_DEPENDENCIES e índice histórico: comportamiento, recorrido de datos y enlaces.

No se cambiaron API, validadores, repositorios, permisos, tablas ni migraciones como parte de esta entrega. Se conservaron los cambios previos del espacio de trabajo; esta nota no certifica otras funcionalidades pendientes en él.

## Comprobaciones realizadas

| Comprobación | Evidencia / resultado |
|---|---|
| `npm.cmd run lint` | Salida 0: sin errores; 3 advertencias preexistentes en `app/layout.jsx`, `components/par/ParForm.jsx` y `lib/axios.js` |
| `npm.cmd run build` | Compilación correcta y generación de 55/55 páginas |
| Fila, Ver contacto y card | Comparación del texto completo del diálogo para el mismo contacto: idéntico desde los tres accesos |
| Consulta → editar → guardar | Un solo diálogo de edición; cambio de teléfono ficticio reflejado en cards y tabla tras recargar |
| Teclado | Enter sobre card y espacio sobre fila abren detalle; Escape lo cierra. Editar con espacio en card y con Enter en menú de tabla abre solo edición |
| Eliminar desde ambas vistas | Abre únicamente la confirmación; se canceló en ambos casos, sin ejecutar la eliminación física |
| Campos vacíos | Departamento, teléfono y email muestran `—` |
| Filtros y paginación | 8 filas / 12 cards; siguiente página de tabla; filtro por cliente reinicia a primera página; búsqueda combinada con cliente conservada al cambiar a cards |
| Presentación | Revisión visual a 1280×720 y 390×844; consulta desde tabla móvil, textos extensos ajustados y desplazamiento hasta el correo completo |

Se utilizó la compilación local con un usuario Administrador ficticio y 17 contactos en un esquema PostgreSQL temporal aislado. La sesión de pruebas y su esquema se retiraron al terminar. No se editaron contactos operativos ni se utilizaron datos personales reales. La captura local de comprobación contiene únicamente datos ficticios y queda fuera de Git en `.private/verification/consulta-contactos.png`.

No se ejecutó la suite de integración de negocio para esta modificación de interfaz. La validación visual cubre el entorno y los tamaños indicados; no representa una prueba de todos los navegadores, lectores de pantalla o roles. No se publicó ni se realizó commit de la entrega.
