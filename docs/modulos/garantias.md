# Órdenes de Servicio de garantía

> Vigente · 31 de octubre de 2026. [Índice](../README.md)
> Guía principal de clasificación, origen y preparación de garantías. Los estados y el expediente se mantienen en [O/S](ordenes-servicio.md) y [cierre](../cierre-orden-servicio.md).

## Propósito

Registrar una nueva atención por garantía con su propio código, programación, técnicos, trabajos, horas y expediente. Siempre pertenece a un PAR aprobado. La O/S anterior conserva su estado, alcance, estimaciones, reales y cierre; crear una garantía no la reabre ni la modifica.

La clasificación **Normal / Garantía** es independiente del tipo de trabajo y tipo de servicio. Las órdenes existentes se clasifican Normal al migrar; no se infieren garantías antiguas a partir de textos. No hay cambios de clasificación después de crear una orden.

## Origen de la atención

| Origen | Entrada requerida | Validación y relación |
|---|---|---|
| O/S registrada | O/S Completada, motivo y trabajo por equipo | Misma identidad de PAR, cliente y planta; solo equipos atendidos por esa O/S |
| Servicio anterior externo | PAR aprobado, referencia del servicio, fecha si se conoce, motivo y trabajo por equipo | No se inventa una O/S histórica; los equipos pertenecen al PAR seleccionado |

La referencia externa admite 5–500 caracteres; el motivo, 5–2000. Cada equipo seleccionado requiere su propio trabajo de garantía, hasta 10000 caracteres. Se guarda en el snapshot de equipos de la nueva O/S, sin sobrescribir el trabajo del PAR ni de la orden anterior.

Si el trabajo antiguo tiene PAR registrado, se selecciona ese PAR. Si tampoco tiene PAR, primero se crea y aprueba un **PAR de referencia para garantía**. No se omiten cliente, planta, contacto, equipos ni la validación de sus relaciones.

## PAR de referencia

Al crear el PAR se elige finalidad **Comercial** o **Referencia para garantía**. La finalidad es inmutable; no convierte documentos comerciales anteriores.

El PAR de referencia conserva las relaciones, los trabajos por equipo y renglones de productos que identifican el tipo de mano de obra. No cotiza un nuevo servicio: cantidad, precio, ajuste porcentual e importe de sus renglones son cero; multiplicador es uno. Subtotal, descuento, total USD/Bs y presupuesto de horas son cero. El servidor y SQL normalizan esos valores, aunque el navegador envíe importes o cantidades.

Se guarda Creado y se aprueba con el flujo habitual del PAR; no hay aprobación automática. Solo puede originar O/S de garantía. Las horas previstas se capturan en cada O/S, sobre los renglones marcados como técnicos. No usar cantidades ficticias para habilitar la asignación.

## Recorrido operativo

1. Desde una O/S Completada, pulsar **Crear O/S de garantía**: se abre **Nueva O/S de garantía**, con clasificación Garantía y O/S original fijas. También puede elegirse Garantía desde Nueva orden.
2. Solo en la creación general se elige origen registrado o externo. Desde una completada, el origen registrado y su PAR se toman automáticamente. Para origen externo se elige el PAR aprobado y se identifica el servicio anterior.
3. Seleccionar equipos permitidos, explicar el motivo y escribir el trabajo de garantía para cada equipo.
4. Repartir estimaciones propias por renglón entre uno y cuatro técnicos activos, incluido el responsable. Indicar fechas, tipo de trabajo, servicio y demás datos habituales.
5. Guardar Pendiente. Se conserva clasificación y origen; mientras esté Pendiente pueden corregirse motivo, trabajos y programación conforme a los permisos existentes.
6. Aprobar y luego iniciar. Siguen aplicando [disponibilidad por cualquier motivo](tecnicos-calendario.md#disponibilidad-del-técnico), confirmación de conflictos de agenda y reprogramación controlada antes del inicio.
7. En Proceso, abrir **Crear Expediente**, preparar documentos por equipo, horas reales, fotos opcionales y pendientes.
8. Usar **Cerrar O/S** al final del expediente. Persiste Completada y confirma las horas de garantía; los pendientes se publican con el flujo existente.

La cancelación conserva trazabilidad. No se introducen suspensión, sustitución durante la ejecución, cierre parcial ni reapertura. La clasificación, PAR, origen registrado, referencia externa y fecha histórica no se cambian al editar.

## Creación desde una O/S completada

El enlace `/ordenes/nueva?garantiaDe=<id>` establece un contexto fijo de creación, no una sugerencia editable. El formulario muestra **Garantía** y el código de **O/S original** como datos de solo lectura, con enlace de consulta a la orden. No presenta el selector de origen y toma el mismo PAR automáticamente; el usuario no puede cambiarlo por otro. El motivo sigue siendo obligatorio y editable; equipos, trabajos, técnicos y programación conservan sus reglas.

El título y la acción de guardado identifican **O/S de garantía**. Mientras cargan los catálogos o si fallan, no se habilita la creación. Si el ID no existe, no corresponde a una completada o su PAR no está disponible, se muestra un error y se bloquea el guardado: no se convierte silenciosamente en Normal ni se elige otro origen. Cambiar el parámetro de origen reinicia el formulario para evitar reutilizar datos de otra orden.

Al guardar, el formulario construye clasificación, origen y PAR a partir del contexto fijo. El servidor revalida la O/S Completada, el mismo PAR y sus equipos, junto con permisos y disponibilidad. La nueva O/S conserva código propio y estado Pendiente; no se modifica el cierre ni las horas de la original.

La entrada general `/ordenes/nueva` conserva Normal/Garantía y la elección de origen registrado/externo. Esto permite atender servicios históricos sin O/S registrada. El contexto fijo se aplica únicamente cuando se entra desde una O/S completada.

## Referencias comerciales

Una garantía, registrada o externa, no captura **Orden de compra** ni **Cotización**. Esos campos se ocultan al crear/editar y en la vista previa e impresión de garantías. Las órdenes Normales conservan su captura y presentación habitual.

El formulario omite ambos campos del envío de garantías. El repositorio rechaza su incorporación al crear y su modificación al editar, incluso con una solicitud directa a la API. En una garantía anterior que ya tenga referencias, omitirlas conserva los valores almacenados; reenviar el mismo valor tampoco los cambia. No se limpian referencias históricas mediante migración ni al editar otros datos.

Este ajuste reutiliza las tablas y rutas existentes y no requiere migración SQL. Fuentes: `ServiceOrderForm.jsx`, página `ordenes/nueva`, `ServiceOrderPreview.jsx`, `ServiceOrderPrintSheet.jsx` y la validación `assertWarrantyCommercialReferences` del repositorio de garantías.

## Horas y efecto sobre PAR

Las estimaciones y reales de garantía **no reservan, consumen ni liberan horas del presupuesto comercial del PAR**. Se puede preparar una garantía con saldo comercial cero, o con un PAR de referencia cuyo presupuesto es cero. Se siguen validando renglón de mano de obra, técnicos, responsable, valores positivos de estimación y límite total.

Ejemplo ficticio: un PAR de 8 h tiene una O/S normal cerrada de 8 h. Una garantía estima 3 h y cierra con 5 h justificadas. El saldo comercial sigue en 0; el reporte separa 8 h normales de 5 h de garantía. Si la garantía usa menos de lo previsto o se cancela, tampoco añade saldo comercial.

Al cerrar se exige justificación si una asignación real supera su propia estimación. No se compara el trabajo de garantía con el presupuesto comercial. La distinción borrador/confirmado, explicación de ceros y participantes programados permanece igual. [Contrato principal de horas](horas-tecnicos.md).

En PAR Comercial, En Servicio/Finalizado se deriva únicamente de las O/S normales no canceladas. Las garantías abiertas se muestran como conteo separado y no reabren visualmente el servicio comercial terminado. En PAR de referencia, el estado visible se deriva de sus garantías. Cualquier O/S no cancelada, incluso una garantía Completada, continúa bloqueando la edición del PAR.

## Permisos

Superadministrador, Administrador, Supervisor y Coordinador pueden crear y gestionar garantías, sujetos al estado. El repositorio consulta el usuario activo y su rol en la base; acceder a la ruta general de órdenes no basta para escribir una garantía. Solo los tres primeros aprueban y cierran.

Se mantienen los permisos del expediente: los cuatro gestores preparan documentos y horas; el técnico vinculado y programado puede preparar fotos y pendientes durante En Proceso. Este acceso no permite cambiar origen, reparto, reales, aprobar ni cerrar. [Matriz de seguridad](../arquitectura/seguridad-permisos.md).

## Consulta y reportes

Listado, tarjetas, detalle, impresión y CSV identifican la clasificación. El detalle enlaza la O/S registrada de origen y muestra las garantías vinculadas a una orden; para un servicio externo presenta referencia y fecha informada.

El reporte de horas conserva solo cierres confirmados y filtra Todas / Normal / Garantía. Agrupa por técnico y clasificación, con totales separados; una persona que participa en ambas clasificaciones cuenta una sola vez en el total de técnicos. El reporte PAR filtra por finalidad y conserva importes cero de las referencias. [Filtros y PDF](../reportes.md).

## Contrato técnico y conservación

- `par_header.purpose`: Comercial (predeterminado) o ReferenciaGarantia.
- `service_order.order_kind`: Normal (predeterminado) o Garantia.
- Origen: `warranty_origin` Registered/External; `warranty_origin_order_id` FK a otra O/S; `warranty_reference` y `warranty_service_date` para externo; `warranty_reason` obligatorio.
- Creación usa `orderKind`, `warrantyOrigin`, `warrantyOriginOrderId` o `warrantyReference`/`warrantyServiceDate`, `warrantyReason` y `warrantyWorks: [{ equipmentId, description }]`, además del contrato habitual. Una O/S Normal rechaza contenido de garantía.
- Misma familia `/api/service-order`; catálogo incluye finalidad PAR y O/S completadas con equipos. Listado admite `orderKind`.
- Errores de dominio: `WARRANTY_INVALID` (400) y `WARRANTY_FORBIDDEN` (403).
- No hay tablas paralelas de órdenes ni de horas. Se reutilizan asignaciones y expediente, conservando bloqueo PAR → O/S. Las consultas de saldo excluyen Garantia explícitamente.
- Migración `057-service-order-warranty.sql`: columnas, restricciones, cuatro triggers e índices; no recalcula documentos históricos. [Datos y relaciones](../arquitectura/datos-relaciones.md), [aplicación y respaldo](../operacion/despliegue-respaldo-migraciones.md).

## Fuentes y verificación

`lib/warranty.js`, `lib/repositories/service-order-warranty.repository.js`, repositorios de PAR, O/S, horas, cierre y reportes; validadores de PAR/O/S/reportes; `ServiceOrderForm.jsx`, `WarrantySummary.jsx`, `LaborAllocationEditor.jsx`, `ServiceOrderClosure.jsx` y componentes PAR/reportes.

`npm run test:service-order-warranty` comprueba presentación del formulario, referencias comerciales, consulta/impresión y migración, orígenes, permisos, equipos, inmutabilidad, conservación histórica, horas separadas, reprogramación previa al inicio, cierre, cancelación y reportes. La integración usa un esquema aislado con datos ficticios; no crea servicios operativos. Evidencia inicial en [histórico](../historico/2026-10-31/ordenes-garantia.md) y ajuste de entrada en [nota de entrega](../historico/2026-10-31/creacion-garantia-desde-os.md).
