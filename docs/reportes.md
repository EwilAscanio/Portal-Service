# Reportes

> Vigente · actualizado el 6 de noviembre de 2026: catálogo con cajón de filtros, órdenes, clientes y PAR por mes. [Índice](README.md).
> Guía principal de reportes. Contexto de origen: [PAR](modulos/par.md), [horas](modulos/horas-tecnicos.md), [cierre O/S](cierre-orden-servicio.md), [órdenes](modulos/ordenes-servicio.md) y [clientes](modulos/clientes-plantas-contactos-equipos.md).

## Acceso y recorrido

Disponible en **Reportes** para Superadministrador, Administrador, Supervisor y Coordinador. Las APIs verifican sesión activa y los mismos permisos. Los reportes los generan usuarios internos del sistema.

1. Elegir una tarjeta: **PAR por cliente**, **Horas estimadas y reales por técnico**, **Órdenes de servicio**, **Clientes** o **PAR por mes**. Cambiar de tarjeta no borra los filtros de las demás mientras se permanece en la página. El número de la tarjeta cuenta filtros con valor, no registros.
2. Abrir el cajón **Filtros**, definir los criterios de ese reporte y pulsar **Mostrar reporte**.
3. Consultar la vista previa y usar **Descargar PDF**.
4. **Volver a filtros** conserva la selección en la URL. **Limpiar** dentro del cajón limpia los criterios y conserva el tipo de reporte.
5. **Actualizar reporte** vuelve a consultar la base y genera un nuevo documento. Descargar reutiliza exactamente los bytes del documento mostrado, aunque otras sesiones hayan cambiado datos posteriormente.

El PDF se mantiene en memoria durante la vista previa; no se guarda como archivo permanente ni se crea un historial de reportes. Al salir de la vista se cancela la solicitud pendiente y se libera su URL temporal. Recargar o volver a entrar genera una lectura nueva. La vista usa el visor PDF del navegador; si no está disponible, el botón de descarga permite abrir el archivo.

## PAR por cliente

Filtros opcionales: cliente, estado visible, finalidad (Todas / Comercial / Referencia para garantía) y fechas de **creación del registro** (`created_at`, no `fecha_emision`). Sin filtros se consultan todos los PAR.

Columnas: número y finalidad, fecha de creación, cliente, planta, estado, horas presupuestadas, subtotal USD, descuento %, monto descontado USD y total final USD. Totales: cantidad de PAR, horas presupuestadas, subtotales, descuentos y totales finales de los registros seleccionados. No se suman los porcentajes.

Los importes proceden de la cabecera guardada: `subtotal_usd`, `discount_percent`, `discount_amount_usd` y `total_usd`. El reporte no recalcula el descuento a partir de un porcentaje promedio; suma importes de cada PAR en centavos. La descarga conserva el mismo PDF mostrado.

El estado se deriva con la misma regla que la consulta de PAR: para un PAR aprobado/con servicio/finalizado, se consideran las O/S normales no canceladas en PAR Comercial y las garantías en PAR de referencia; se muestra Finalizado cuando todas están Completada; en otro caso, En Servicio. El filtro se aplica sobre ese resultado visible, no solamente sobre `par_header.status`.

Las horas se leen de `par_header.budgeted_hours`, suma de cantidades de productos que requieren técnico. No se multiplica por multiplicador comercial ni por cantidad de técnicos.

## Horas estimadas y reales por técnico

Filtros opcionales: cliente, técnico, clasificación (Todas / Normal / Garantía) y fechas de **cierre confirmado** (`closed_at`). Conserva técnicos y clientes inactivos para consultar el historial.

Incluye exclusivamente órdenes `Completada` con `closed_at`, revisión de horas resuelta, al menos una asignación y horas reales confirmadas en todas sus asignaciones. No incluye órdenes abiertas, canceladas ni borradores de horas reales.

El resumen agrupa por técnico **y clasificación** y contiene cantidad de órdenes distintas, horas estimadas, horas reales y diferencia. El detalle identifica clasificación y origen (código O/S o referencia externa), además de O/S, PAR, cliente, fecha de cierre, número/código/descripción del renglón y las tres columnas de horas. Los totales separan Normal y Garantía; el total de técnicos cuenta IDs distintos, sin duplicar a quien participa en ambas. Las horas de garantía no representan consumo del presupuesto comercial del PAR.

- Estimadas: `service_order_labor_allocation.hours`.
- Reales: `service_order_labor_allocation.actual_hours`, confirmadas por el cierre de la cabecera.
- Diferencia: reales menos estimadas. 10 reales − 8 estimadas = **+2 h**; 6 reales − 8 estimadas = **−2 h**.
- Cero real confirmado es un dato válido; NULL significa información faltante, nunca cero.
- Una fila por asignación de técnico/renglón. El nombre del grupo corresponde al técnico actual; los códigos y descripciones de servicios provienen de los snapshots de la asignación.
- La cantidad de O/S por técnico cuenta cada orden una sola vez, aunque tenga varios renglones. El total general cuenta órdenes distintas, no la suma de las participaciones por técnico.
- Las horas y los importes se suman en centésimas enteras; no se calculan comisiones ni pagos.

### Órdenes anteriores sin información confirmada

Las órdenes históricas completadas sin `closed_at` se cuentan aparte por cliente/técnico/clasificación seleccionados y se excluyen del reporte numérico. La advertencia aclara que **no pueden asignarse al período**, por lo que ese conteo no se filtra por fechas ni sustituye el cierre por la fecha programada o la última edición.

Si una orden tiene fecha de cierre dentro del período pero un reparto incompleto, también se informa su exclusión. Esas advertencias aparecen en pantalla, incluso cuando no hay resultados comparables; también se incluyen en el PDF cuando hay filas para generar.

## Órdenes de servicio

Filtros opcionales: cliente, estado guardado (`Pendiente`, `Aprobada`, `En Proceso`, `Completada`, `Cancelada`), clasificación (Todas / Normal / Garantía), técnico y fechas de **inicio programado** (`scheduled_start`). Sin estado se incluyen las canceladas. Sin técnico se incluyen todas las órdenes del resto de filtros.

Una fila por orden: código, PAR, cliente, planta, estado, clasificación, técnicos actuales y inicio programado. Si la orden tiene `closed_at`, el PDF también imprime esa fecha de cierre. El responsable aparece primero. Los nombres salen del catálogo actual de técnicos; si la orden no tiene asignaciones en `service_order_technician`, se usa el nombre guardado en la orden. El total cuenta órdenes y separa Normal y Garantía. No suma horas ni importes.

## Clientes

Filtro opcional: estado Saint, mostrado como Activo (`1`) o Inactivo (`0`). Sin filtro se listan ambos. No hay filtro de cliente, técnico ni fechas, ni saldos o facturas.

Columnas: código Saint, nombre actual, estado y conteos de plantas, contactos y equipos vinculados hoy. El total suma esos conteos. Un cliente inactivo conserva sus relaciones históricas en el conteo.

## PAR por mes

Usa los mismos filtros que PAR por cliente: cliente, estado visible, finalidad y fechas de creación. Cada fila es un mes de `created_at` en `America/Caracas`, no un PAR. Columnas: mes, cantidad de PAR, horas presupuestadas, subtotal USD, descuento USD y total final USD. Los totales del documento suman los meses incluidos. No se promedia ni se suma el porcentaje de descuento. El estado visible reutiliza la regla del detalle de PAR.

## Fechas, lectura y límites

- Zona horaria fija `America/Caracas`, tanto en filtros como en fechas impresas.
- Rango inclusivo por días: desde el inicio del día inicial hasta antes del inicio del día siguiente al final. Se permite dejar cualquiera de los extremos vacío.
- Zod valida tipo de reporte, UUID, fechas reales, orden de fechas y correspondencia de filtros.
- Consultas parametrizadas dentro de una transacción **REPEATABLE READ, READ ONLY**, con timeout por sentencia de 20 segundos. Cabecera, filtros, detalle, exclusiones y totales comparten la misma lectura.
- Máximo 2.000 renglones por documento (PAR, meses, órdenes, clientes o asignaciones). Si se supera, se pide acotar filtros; no se emite un PDF truncado ni totales parciales. En PAR por mes el tope cuenta meses, no cada PAR agrupado. Solicitud de generación en el navegador: timeout de 120 segundos.
- Sin filas: mensaje de ausencia de resultados y descarga deshabilitada.
- Datos y PDFs con `Cache-Control: private, no-store`.

## Implementación y despliegue

Dependencia de generación: **`@react-pdf/renderer`**, con versión declarada en `package.json` y resolución en `package-lock.json`. Generación con `renderToBuffer` en runtime Node. La versión instalada de Next incluye este paquete en su lista automática de dependencias externas del servidor. No se usa el paquete visor `react-pdf` ni se necesita PDF.js.

Plantilla A4 horizontal, encabezados y columnas repetidos, totales y páginas numeradas. Logo local `public/Logo.png`; nombre, RIF, contacto y dirección desde `configuration`. No se descargan logos remotos ni se leen rutas configurables. Mantener ese PNG en el despliegue. Fuentes estándar Helvetica integradas, sin descargas externas.

Requiere las migraciones **051** (asignaciones), **052** (cierre), **053** (descuento PAR) y **057** (clasificación y origen de garantía), o un esquema consolidado que incluya esa estructura. Generar el reporte no modifica datos operativos.

### Archivos

- `app/(dashboard)/reportes/page.jsx`: selección y filtros.
- `app/(dashboard)/reportes/vista/page.jsx`: vista previa.
- `components/reports/ReportFilters.jsx` y `ReportPreview.jsx`: interfaz.
- `lib/reports.js`: constantes, formato, centésimas y filtros URL.
- `lib/validators/report.schema.js`: contrato de filtros.
- `lib/repositories/report.repository.js`: lectura y agregación.
- `lib/reports/pdf.jsx`: plantilla del documento.
- `lib/reports/api.js`: sesión, permisos y errores públicos.
- `lib/api.js`: catálogos y generación binaria, incluidos errores JSON recibidos como Blob.

### Endpoints

- `GET /api/reports/catalogs`: clientes y técnicos, incluidos inactivos.
- `POST /api/reports`: JSON `{ type, clientId, technicianId, status, parPurpose, orderKind, from, to }`. `type` es `pars`, `technician-hours`, `service-orders`, `clients` o `par-monthly`; los filtros que no corresponden al tipo viajan vacíos con `""`. PAR y PAR por mes usan cliente, estado visible, finalidad y fechas de creación. Horas usa cliente, técnico, clasificación y fecha de cierre, con `status` y `parPurpose` vacíos. Órdenes usa cliente, estado de la orden, clasificación, técnico y fechas de inicio programado. Clientes solo usa `status` con `1`, `0` o vacío. Finalidades válidas: Comercial/ReferenciaGarantia; clasificaciones: Normal/Garantia; vacío incluye ambas.
- Respuesta con filas: `application/pdf`, nombre de archivo, `X-Report-Generated-At`, `X-Report-Rows`, `X-Report-History` y `X-Report-Incomplete`.
- Sin filas: JSON `{ empty: true, undatedHistoryCount, incompleteCount }`.
- Errores: 400 filtros inválidos, 401 sesión inválida, 403 acceso denegado, 422 reporte demasiado amplio/consulta agotada, 500 fallo de generación.

No se debe agregar un endpoint de descarga que consulte datos de nuevo: la descarga utiliza el mismo Blob de la vista previa.

Referencias: [React PDF Node API](https://react-pdf.org/docs/v4/node), [compatibilidad con React](https://react-pdf.org/docs/v4/compatibility).

## Alcance de revisión

La revisión del 22 de octubre de 2026 corresponde a documentación y lectura estática. No se generaron reportes contra la base ni se ejecutaron pruebas de aplicación durante esta reorganización. Las comprobaciones de la entrega anterior son [evidencia histórica](historico/README.md), no una garantía de ejecución actual.
