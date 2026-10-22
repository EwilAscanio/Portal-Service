# Reportes de PAR y horas por técnico

## Acceso y recorrido

Disponible en **Reportes** para Superadministrador, Administrador, Supervisor y Coordinador. Las APIs verifican sesión activa y los mismos permisos. Los reportes los generan usuarios internos del sistema.

1. Seleccionar **PAR por cliente** u **Horas estimadas y reales por técnico**.
2. Elegir filtros y pulsar **Mostrar Reporte**.
3. Consultar la vista previa y usar **Descargar PDF**.
4. **Volver a filtros** conserva la selección en la URL. **Limpiar filtros** limpia los criterios y conserva el tipo de reporte.
5. **Actualizar reporte** vuelve a consultar la base y genera un nuevo documento. Descargar reutiliza exactamente los bytes del documento mostrado, aunque otras sesiones hayan cambiado datos posteriormente.

El PDF se mantiene en memoria durante la vista previa; no se guarda como archivo permanente ni se crea un historial de reportes. Al salir de la vista se cancela la solicitud pendiente y se libera su URL temporal. Recargar o volver a entrar genera una lectura nueva. La vista usa el visor PDF del navegador; si no está disponible, el botón de descarga permite abrir el archivo.

## PAR por cliente

Filtros opcionales: cliente, estado visible del PAR y fechas de **creación del registro** (`created_at`, no `fecha_emision`). Sin filtros se consultan todos los PAR.

Columnas: número, fecha de creación, cliente, planta, estado, horas presupuestadas e importe USD. Totales: cantidad de PAR, horas presupuestadas e importe USD de los registros seleccionados.

El estado se deriva con la misma regla que la consulta de PAR: para un PAR aprobado/con servicio/finalizado, si tiene órdenes no canceladas, se muestra Finalizado cuando todas están Completada; en otro caso, En Servicio. El filtro se aplica sobre ese resultado visible, no solamente sobre `par_header.status`.

Las horas se leen de `par_header.budgeted_hours`, suma de cantidades de productos que requieren técnico. No se multiplica por multiplicador comercial ni por cantidad de técnicos.

## Horas estimadas y reales por técnico

Filtros opcionales: cliente, técnico y fechas de **cierre confirmado** (`closed_at`). Conserva técnicos y clientes inactivos para consultar el historial.

Incluye exclusivamente órdenes `Completada` con `closed_at`, revisión de horas resuelta, al menos una asignación y horas reales confirmadas en todas sus asignaciones. No incluye órdenes abiertas, canceladas ni borradores de horas reales.

El resumen contiene técnico, cantidad de órdenes distintas, horas estimadas, horas reales y diferencia. El detalle agrupa por técnico y muestra O/S, PAR, cliente, fecha de cierre, número/código/descripción del renglón de mano de obra y las tres columnas de horas.

- Estimadas: `service_order_labor_allocation.hours`.
- Reales: `service_order_labor_allocation.actual_hours`, confirmadas por el cierre de la cabecera.
- Diferencia: reales menos estimadas. 10 reales − 8 estimadas = **+2 h**; 6 reales − 8 estimadas = **−2 h**.
- Cero real confirmado es un dato válido; NULL significa información faltante, nunca cero.
- Una fila por asignación de técnico/renglón. El nombre del grupo corresponde al técnico actual; los códigos y descripciones de servicios provienen de los snapshots de la asignación.
- La cantidad de O/S por técnico cuenta cada orden una sola vez, aunque tenga varios renglones. El total general cuenta órdenes distintas, no la suma de las participaciones por técnico.
- Las horas y los importes se suman en centésimas enteras; no se calculan comisiones ni pagos.

### Órdenes anteriores sin información confirmada

Las órdenes históricas completadas sin `closed_at` se cuentan aparte por cliente/técnico seleccionados y se excluyen del reporte numérico. La advertencia aclara que **no pueden asignarse al período**, por lo que ese conteo no se filtra por fechas ni sustituye el cierre por la fecha programada o la última edición.

Si una orden tiene fecha de cierre dentro del período pero un reparto incompleto, también se informa su exclusión. Esas advertencias aparecen en pantalla, incluso cuando no hay resultados comparables; también se incluyen en el PDF cuando hay filas para generar.

## Fechas, lectura y límites

- Zona horaria fija `America/Caracas`, tanto en filtros como en fechas impresas.
- Rango inclusivo por días: desde el inicio del día inicial hasta antes del inicio del día siguiente al final. Se permite dejar cualquiera de los extremos vacío.
- Zod valida tipo de reporte, UUID, fechas reales, orden de fechas y correspondencia de filtros.
- Consultas parametrizadas dentro de una transacción **REPEATABLE READ, READ ONLY**, con timeout por sentencia de 20 segundos. Cabecera, filtros, detalle, exclusiones y totales comparten la misma lectura.
- Máximo 2.000 renglones por documento (PAR o asignaciones). Si se supera, se pide acotar filtros; no se emite un PDF truncado ni totales parciales. Solicitud de generación en el navegador: timeout de 120 segundos.
- Sin filas: mensaje de ausencia de resultados y descarga deshabilitada.
- Datos y PDFs con `Cache-Control: private, no-store`.

## Implementación y despliegue

Dependencia nueva: **`@react-pdf/renderer` 4.9.0**, registrada en `package.json` y `package-lock.json`. Generación con `renderToBuffer` en runtime Node. Next 16.3.4 ya incluye este paquete en su lista automática de dependencias externas del servidor. No se usa el paquete visor `react-pdf` ni se necesita PDF.js.

Plantilla A4 horizontal, encabezados y columnas repetidos, totales y páginas numeradas. Logo local `public/Logo.png`; nombre, RIF, contacto y dirección desde `configuration`. No se descargan logos remotos ni se leen rutas configurables. Mantener ese PNG en el despliegue. Fuentes estándar Helvetica integradas, sin descargas externas.

No requiere migración adicional: presupone las migraciones **051** (asignaciones) y **052** (cierre) ya aplicadas. No modifica datos operativos.

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
- `POST /api/reports`: JSON `{ type, clientId, technicianId, status, from, to }`. `type` es `pars` o `technician-hours`; filtros opcionales vacíos con `""`. Para PAR, `technicianId` vacío; para horas, `status` vacío.
- Respuesta con filas: `application/pdf`, nombre de archivo, `X-Report-Generated-At`, `X-Report-Rows`, `X-Report-History` y `X-Report-Incomplete`.
- Sin filas: JSON `{ empty: true, undatedHistoryCount, incompleteCount }`.
- Errores: 400 filtros inválidos, 401 sesión inválida, 403 acceso denegado, 422 reporte demasiado amplio/consulta agotada, 500 fallo de generación.

No se debe agregar un endpoint de descarga que consulte datos de nuevo: la descarga utiliza el mismo Blob de la vista previa.

Referencias: [React PDF Node API](https://react-pdf.org/docs/v4/node), [compatibilidad con React](https://react-pdf.org/docs/v4/compatibility).

## Comprobaciones de entrega

`npm run lint` sin errores (tres advertencias preexistentes en layout, ParForm y Axios); `npm run build` correcto; revisión de formato sin errores. No se añadieron ni ejecutaron pruebas funcionales o automatizadas, ni se generaron reportes de prueba contra la base.
