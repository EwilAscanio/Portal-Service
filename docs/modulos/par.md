# PAR: documento base de Maquitech

> Vigente · actualizado el 31 de octubre de 2026: finalidad de referencia para garantía. [Índice](../README.md)

## Propósito y fuentes

El PAR concentra el alcance que se usará para cotizar y ejecutar el servicio. Define relaciones comerciales, equipos atendidos, trabajos, productos, importes y horas presupuestadas. Es el padre obligatorio de las O/S.

Fuentes: `lib/par-policy.js`, `lib/par-calculation.js`, `lib/labor-hours.js`, `lib/repositories/par.repository.js`, `lib/validators/par.schema.js`, `app/api/par/`, `components/par/`, `hooks/par/`, `db/schema.sql`.

## Finalidad del documento

La finalidad se elige al crear y no se convierte después: **Comercial** conserva el flujo de cotización descrito abajo; **Referencia para garantía** identifica un servicio histórico sin PAR registrado y solo origina garantías. Conserva cliente, planta, contacto, equipos, trabajos y productos de referencia; cantidades, importes, descuento y horas presupuestadas quedan en cero. Se aprueba por el flujo habitual y las estimaciones se cargan en la O/S. [Preparación y reglas completas](garantias.md#par-de-referencia).

## Qué consume y qué conserva

| Entrada | Regla / transformación | Persistencia o lectura |
|---|---|---|
| Cliente | Cliente activo en Saint para nuevas relaciones | client_id; datos de cliente consultados por JOIN |
| Planta | Pertenece al cliente | plant_id; nombre actual por JOIN |
| Contacto | Pertenece al cliente y planta | contact_id; datos actuales por JOIN |
| Equipos | Pertenecen al mismo cliente/planta | par_equipment: vínculo, orden, principal y copia de datos/trabajo |
| Productos | Categorías Servicio/Repuestos; selección de productos válidos | par_item: vínculo, descripción, cantidad, categoría, precios y marca de técnico |
| Plantilla opcional | Copia inicial de renglones editables | No queda una FK desde PAR hacia la plantilla |
| Tasa de cambio | Se toma de configuración al preparar el documento | exchange_rate del PAR; no cambia por editar la tasa global |
| Actor | Sesión autenticada; aprobación con roles específicos | Autor/aprobador según campos de cabecera |
| Cantidades | Suma de renglones marcados como técnicos | budgeted_hours calculado; ver [horas](horas-tecnicos.md) |
| Descuento general | Porcentaje entre 0 y 100, hasta dos decimales | discount_percent en cabecera; monto y totales calculados en servidor |

El código de producto que se consulta en el PAR puede venir del catálogo actual. Las asignaciones de O/S guardan su propio código y descripción como snapshot. No describir todo el PAR como una copia inmutable de todos los catálogos.

## Flujo de preparación

1. Crear cabecera con número PAR de siete dígitos y datos requeridos por el formulario/validador.
2. Elegir cliente → planta → contacto y equipos compatibles. Cambiar cliente/planta obliga a revisar y limpiar selecciones dependientes en el formulario.
3. Definir descripción del trabajo por equipo; señalar el principal según las reglas del documento.
4. Agregar servicios y repuestos, directamente o desde una plantilla. Introducir cantidades, valores y ajustes comerciales.
5. Introducir el descuento general en el resumen; revisar subtotal, monto descontado, totales finales y presupuesto de horas; guardar cabecera, equipos e ítems.
6. Consultar vista/impresión y revisar antes de aprobar.

Los cambios no se validan solo en pantalla: el repositorio comprueba relaciones y la base conserva FK compuestas. Cabecera, reemplazo de detalles y recálculo se coordinan mediante transacción. Una referencia inválida o un fallo SQL revierte la operación.

## Consulta desde el listado y vista previa

Los cuatro accesos de consulta del listado abren el mismo `ParConsultationModal`: clic en la tarjeta, botón **Ver PAR** de la tarjeta, clic en la fila y botón del ojo **Ver PAR** de la tabla. Comparten la selección `setViewPar`; los botones de consulta no navegan directamente a otra página. La carga sigue `getParById` → `GET /api/par/[id]` → `par.repository.findById`. La fila del listado solo contiene un resumen: no se utiliza para reconstruir los equipos ni los renglones. Cada apertura solicita el documento completo.

El modal y la página de detalle comparten `ParPreview`: cliente, planta, contacto, estado visible, equipos, productos, horas presupuestadas, descuento y totales finales. **Cerrar** devuelve al listado y **Gestionar PAR** navega a `/par/[id]`, donde están la edición, revisión e impresión con sus permisos y condiciones existentes. Este botón sustituye el nombre **Abrir PAR**. El modal tiene ancho ampliado, contenido con desplazamiento vertical y controles fuera de esa zona; la tabla de productos permite desplazamiento horizontal.

Cada equipo tiene un bloque con su número, tipo, marca, serial, modelo, indicador de principal y **Trabajo a realizar**. El texto procede de `par_equipment.observaciones`, conserva sus saltos de línea y permanece asociado al equipo correspondiente. No se agrupan los trabajos como párrafos sin identificación. Si un registro anterior carece de trabajo, se muestra «Sin trabajo a realizar registrado»; si no tiene equipos, se indica expresamente.

Las observaciones generales de cabecera no se muestran en esta consulta ni en `ParPreview`. El campo técnico `par_header.observations` continúa en el contrato y almacenamiento existentes; esta entrega retira su presentación del modal, sin borrar datos históricos. No confundirlo con `par_equipment.observaciones`, que contiene el trabajo y sigue siendo obligatorio al capturar equipos.

Durante la consulta se muestra la carga. Un error ofrece **Reintentar**; cerrar o cambiar de PAR invalida las respuestas pendientes para evitar mostrar otro documento. La consulta utiliza los permisos existentes de `/api/par` y no habilita escrituras. `ParPrintSheet` sigue siendo el componente independiente de impresión, que ya relaciona cada trabajo con su equipo.

Fuentes de presentación: `app/(dashboard)/par/page.jsx`, `components/par/ParCardGrid.jsx`, `components/par/ParConsultationModal.jsx`, `components/par/ParPreview.jsx`, `components/ui/Modal.jsx` y `app/(dashboard)/par/[id]/page.jsx`.

## Estados guardados y transiciones

| Origen | Acción | Resultado | Actor / condición |
|---|---|---|---|
| Creado | Editar contenido | Creado | Acceso PAR; sin O/S no canceladas |
| Creado | Aprobar | Aprobado | Superadministrador, Administrador o Supervisor |
| Creado | Rechazar | Rechazado | Mismos roles de revisión |
| Aprobado | Editar contenido | Aprobado | Esos tres roles y ninguna O/S no cancelada |
| Aprobado | Rechazar | Rechazado | Transición permitida por la política actual; véase observación inferior |
| Creado | Eliminar | Documento eliminado | Operación permitida por estado y restricciones referenciales |
| Rechazado | Editar/reabrir | No disponible | No hay transición de retorno definida |

**Observación de implementación:** `updateStatus` valida la transición y bloquea el PAR, pero no aplica la comprobación de O/S activas usada por la edición de contenido. No asumir que el rechazo de un aprobado esté protegido por esa misma regla. Está registrado en [observaciones](../pendientes-documentados.md), sin modificar comportamiento.

## Bloqueo de edición por órdenes

Se considera bloqueante toda O/S cuyo estado sea distinto de Cancelada: Pendiente, Aprobada, En Proceso y Completada. La existencia de una orden completada sigue bloqueando el PAR.

El repositorio bloquea la cabecera y consulta órdenes antes de aceptar escrituras del PAR. Ese mismo documento coordina nuevas reservas de O/S. El permiso visual por sí solo no autoriza una escritura concurrente.

Si todas las órdenes están canceladas, el PAR guardado Aprobado vuelve a ser candidato a edición para los tres roles autorizados. Las asignaciones canceladas conservan snapshots, aun si se reemplazan los ítems originales.

## Estado mostrado

Para un PAR guardado Aprobado, En Servicio o Finalizado se consideran **solo O/S Normal** si es Comercial, o sus garantías si es ReferenciaGarantia:

- Si tiene O/S no canceladas y todas están Completada: `display_status = Finalizado`.
- Si tiene O/S no canceladas y alguna no está completada: `display_status = En Servicio`.
- Si no tiene O/S no canceladas: se muestra el estado guardado.

Las garantías abiertas se muestran aparte mediante `warranty_open_orders` (no Cancelada ni Completada). No reabren el estado visible del PAR Comercial. El bloqueo de edición, en cambio, incluye **ambas clasificaciones**. Crear/cerrar/cancelar órdenes modifica esta lectura derivada. No confundirla con un cambio manual de `par_header.status`. La selección para una nueva O/S exige estado **guardado Aprobado**, además del presupuesto en órdenes normales y las demás validaciones.

El filtro `status` de `par.repository.findAll` usa el estado guardado; el reporte filtra el estado visible. Esta diferencia actual está documentada, sin uniformarla en esta entrega.

## Importes y horas

Cada renglón calcula cantidad × valor unitario × multiplicador efectivo × (1 + porcentaje/100), redondeado a dos decimales. El multiplicador efectivo es 1 cuando el valor no es positivo; porcentaje efectivo 0 si no es positivo. El campo Valor % del renglón conserva ese ajuste comercial.

### Descuento general

El resumen permite ingresar **Descuento %** y muestra **Monto de descuento USD** como solo lectura. Se aplica a todos los servicios y repuestos después de calcular los renglones.

| Valor | Campo / cálculo |
|---|---|
| Subtotal USD | `subtotal_usd`: suma de `line_total_usd` |
| Porcentaje | `discount_percent`: 0 a 100, hasta dos decimales; inicialmente 0 |
| Descuento USD | `discount_amount_usd`: redondear(subtotal × porcentaje / 100, 2) |
| Total final USD | `total_usd`: subtotal − monto de descuento |
| Total final Bs. | `total_bs`: redondear(total final USD × tasa del PAR, 2) |

Ejemplo ficticio: subtotal USD 1.000, descuento 10 %, monto USD 100 y total final USD 900. Un subtotal cero produce monto cero; 100 % produce total final cero; volver a 0 % elimina el descuento.

`lib/par-calculation.js` calcula la vista del formulario usando centavos y centésimas de porcentaje. El servidor recalcula con NUMERIC de PostgreSQL dentro de la transacción que guarda los ítems. No acepta subtotal, monto ni total enviados como autoridad por el navegador. Al cambiar un renglón vuelve a aplicar el porcentaje guardado.

Crear admite `discountPercent` opcional (predeterminado 0). El PUT del PAR admite `items` y `discountPercent` opcional; omitir el porcentaje conserva el actual. El botón **Editar ítems y descuento** abre esta edición comercial; los datos generales siguen en consulta en esa vista.

El descuento tiene los mismos permisos y bloqueos de edición del PAR: Creado admite los roles del módulo; Aprobado solo Superadministrador, Administrador y Supervisor, y ninguna O/S no cancelada. No añade una excepción para documentos vinculados a órdenes.

Vista previa, consulta e impresión muestran el desglose. Listado y tarjetas usan el total final guardado; el [reporte](../reportes.md) suma subtotales, descuentos y totales finales por separado.

La migración `053-par-discount.sql` añade los campos y restricciones. En registros anteriores fija 0 % y monto 0, copia el total USD guardado al subtotal y conserva totales USD/Bs, horas, estados y fecha de edición. No recalcula los renglones históricos. `db/schema.sql` incorpora la estructura para bases vacías.

El presupuesto de horas suma únicamente `qty` de ítems con `requires_technician`. No utiliza precio, porcentaje, multiplicador ni descuento. El descuento tampoco redistribuye importes a O/S ni calcula pagos/comisiones. [Regla y ejemplos completos](horas-tecnicos.md).

## Salidas, consumidores y trazabilidad

- O/S hereda cliente, planta y contacto; selecciona equipos y renglones del PAR.
- Saldo disponible se calcula por ítem entre las O/S normales del PAR; las garantías registran sus horas aparte.
- Reportes leen cabecera, relaciones actuales, presupuesto y estado derivado.
- Vistas e impresión consumen equipos y detalles guardados.
- Aprobación conserva actor/fecha; no existe un historial universal de cada edición de campo.

Antes de cambiar estructura, estados o cantidades recorrer [APP_DEPENDENCIES](../../APP_DEPENDENCIES.md), O/S, horas, cierre y reportes.
