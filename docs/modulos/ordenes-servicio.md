# Órdenes de Servicio: ejecución del PAR

> Vigente · actualizado el 31 de octubre de 2026: clasificación y origen de garantías. [Índice](../README.md)

## Propósito y fuentes

La O/S transforma el alcance del PAR en trabajo programado y ejecutado. Siempre pertenece a un PAR; un PAR puede originar varias órdenes.

Fuentes: `lib/repositories/service-order.repository.js`, `lib/service-order-policy.js`, `lib/repositories/service-order-equipment.repository.js`, `lib/repositories/service-order-labor.repository.js`, `lib/validators/operational.schema.js`, `app/api/service-order/`, `app/(dashboard)/ordenes/`.

## Clasificación y origen

Cada O/S se crea **Normal** o **Garantía**, sin conversión posterior. Al crear desde una completada, Garantía, O/S original y PAR quedan fijos; no se elige de nuevo el origen. OC/cotización solo se capturan y muestran en formularios, consulta e impresión de órdenes Normales. Garantía exige una O/S Completada de origen o referencia de un servicio externo, motivo y trabajo propio por equipo. Mantiene PAR obligatorio; admite PAR de referencia cuando no existe uno histórico. Sus estimaciones y reales no reservan ni consumen presupuesto comercial. [Guía completa de garantías](garantias.md).

## Preparación y relaciones

1. Seleccionar PAR con estado guardado Aprobado y cliente activo. El servidor obtiene cliente, planta, contacto y alcance desde ese PAR.
2. Seleccionar uno o varios equipos pertenecientes al PAR. No se exige cubrirlos todos en la misma O/S.
3. Repartir horas estimadas de los renglones que requieren técnico entre 1 y 4 técnicos distintos activos, incluido el responsable. Cada técnico puede participar en varios renglones y cuenta como una sola persona en toda la orden.
4. Indicar técnico responsable dentro del reparto. No se permite un responsable ajeno a las asignaciones.
5. Definir tipo de trabajo, servicio, prioridad, llamada y fechas de programación; conservar las referencias comerciales correspondientes.
6. Guardar Pendiente. El código O/S se genera mediante secuencia con formato OS-000001. El total estimado se deriva de las asignaciones.

Se guardan relaciones normalizadas y snapshots de equipos/asignaciones. El cliente no puede cambiar `parId` en una O/S existente ni enviar horas totales para sustituir el reparto.

## Etapas

La tabla expresa el efecto presupuestario de las órdenes **normales**. Las garantías conservan los mismos estados, aprobación, agenda y expediente, con horas independientes del saldo comercial.

| Estado | Acciones y actor | Validaciones | Efectos |
|---|---|---|---|
| Pendiente | Editar alcance, reparto y programación; aprobar o cancelar | PAR y equipos compatibles, saldo suficiente por renglón, técnicos válidos | Reserva estimaciones; bloquea PAR; aún no sale en calendario |
| Aprobada | Iniciar o cancelar; edición general bloqueada | Aprobación por Superadministrador/Administrador/Supervisor; horario y técnicos; conflictos confirmados si existen | Registra approved_by/approved_at; agenda visible |
| En Proceso | Preparar expediente; cerrar con permiso; cancelar | Documentación por equipo y reales por asignación | Borradores conservan reserva estimada |
| Completada | Consultar e imprimir | Solo se alcanza mediante cierre validado | Fija reales y fecha/actor; consumo real; conserva agenda histórica |
| Cancelada | Consultar historial | Se cancela antes de Completada | Excluye consumo y calendario; no elimina documento ni trazas |

Para órdenes normales, crear, editar pendiente, iniciar y cancelar conservan el permiso general de la familia de órdenes; la política añade permisos específicos para aprobar, revisar horas antiguas y cerrar. El rol Técnico tiene acceso general a esta familia: el filtro de “solo propias” está implementado específicamente en calendario.

Para garantías, crear/editar/iniciar/cancelar exige además usuario activo Superadministrador, Administrador, Supervisor o Coordinador, comprobado en repositorio; aprobar y cerrar conserva los tres primeros roles.

Transiciones: Pendiente → Aprobada → En Proceso → Completada; Pendiente/Aprobada/En Proceso → Cancelada. No hay reapertura de estados terminales. `DELETE /api/service-order/[id]` solicita cancelación, no borrado físico.

## Aprobación y calendario

La aprobación comprueba intervalo válido y entre uno y cuatro técnicos activos. Detecta solapamientos para todos, incluido el cuarto, con órdenes que tienen aprobación registrada y no están canceladas; solicita confirmación explícita mediante `confirmScheduleConflict` cuando corresponde.

La disponibilidad se revalida para todos los motivos al crear, editar, aprobar, iniciar y reprogramar órdenes Normales y Garantía. Una ausencia coincidente bloquea la acción y no puede omitirse confirmando conflicto. La reprogramación controlada de una Aprobada exige motivo y revisión actual, conserva el total por renglón y vuelve a Pendiente para nueva aprobación; En Proceso no admite esta acción. [Flujo completo y permisos](tecnicos-calendario.md#bloqueo-de-os-y-reprogramación).

El calendario se deriva de la orden; no se crea otro evento editable. Ver [técnicos y calendario](tecnicos-calendario.md).

## Contrato de asignaciones

El contrato vigente usa `laborAllocations` con `parItemId`, `technicalId` y `hours`; `equipmentIds` define equipos y `leadTechnicianId` al responsable. No usar el contrato antiguo basado en `technicianIds` y `workedHours`: el repositorio rechaza esos campos de escritura.

Por orden se admite hasta 500 asignaciones; cada par renglón/técnico es único. Las horas estimadas son positivas y tienen hasta dos decimales. El total permitido es hasta 999999.99 horas. El límite de cuatro personas es por orden: agregar una quinta en otro renglón también se rechaza. Un renglón puede repartirse entre los cuatro técnicos y cualquiera de ellos puede ser responsable si tiene horas asignadas.

### Límite compartido y persistencia

`MAX_SERVICE_ORDER_TECHNICIANS = 4` en `lib/service-order-policy.js` es la fuente compartida por `LaborAllocationEditor`, el selector auxiliar `TechnicianSelector`, el validador Zod y el repositorio al guardar y aprobar. El formulario vigente utiliza `LaborAllocationEditor`; el selector auxiliar no reemplaza ese reparto.

La base aplica el límite mediante `enforce_service_order_technician_limit`, ejecutada por el trigger de inserción de `service_order_technician`. La migración `054-service-order-four-technicians.sql` actualiza esa función; `db/schema.sql` contiene el límite para instalaciones nuevas. Al cambiarlo en el futuro, sincronizar la constante y una nueva migración SQL. [Procedimiento de despliegue](../operacion/despliegue-respaldo-migraciones.md).

El cuarto se incorpora al crear o editar una orden Pendiente. Las órdenes anteriores conservan sus participantes; la revisión histórica sigue limitada a las personas originales y el cierre a las programadas. El presupuesto del PAR y los cálculos de horas conservan su regla de reparto. Consulta, impresión, agenda, expediente y reportes consumen las colecciones completas de técnicos/asignaciones.

Comprobaciones reproducibles del cambio: `npm run test:service-order-technicians`. La integración utiliza datos ficticios en un esquema aislado que se elimina al terminar. Evidencia y límites de esta entrega en [histórico](../historico/2026-10-24/cuatro-tecnicos-os.md).

`service_order.worked_hours` conserva el **total estimado**, aunque su nombre sugiera otra cosa. El total real confirmado es `service_order.actual_hours`. [Guía de horas](horas-tecnicos.md).

## Cierre y efecto sobre PAR

El botón superior **Crear Expediente** abre la preparación mientras la O/S sigue **En Proceso**. La acción definitiva **Cerrar O/S** está al final del expediente y persiste **Completada** tras validar y confirmar. El PUT general no permite completarla directamente y responde con `ORDER_CLOSURE_REQUIRED`. Consultar [acceso, permisos y confirmación del expediente](../cierre-orden-servicio.md#acceso-y-acción-final).

En una orden Normal, cerrar sustituye el consumo estimado por el real, mantiene la cotización del PAR y puede liberar horas para otra orden del mismo PAR. Cancelar libera su reserva. Ambos afectan el estado visible del PAR, sin sobrescribir por ello su estado guardado. En Garantía, el cierre confirma sus horas por separado y cancelar no libera saldo comercial; el estado visible del PAR depende de su finalidad. [Reglas de estado PAR](par.md#estado-mostrado).

El expediente admite cinco fotos opcionales por O/S y pendientes en borrador. Al cerrar publica estos últimos para seguimiento independiente; una O/S Completada puede tener pendientes abiertos. Cancelar no los publica. Ver [fotos y pendientes](pendientes.md).

## Historial y concurrencia

Las escrituras adquieren bloqueo PAR → O/S antes de recalcular saldo o cambiar estado. Una segunda sesión debe validar contra los datos confirmados, no contra la disponibilidad que había visto anteriormente.

Las órdenes anteriores pueden requerir revisión de reparto y confirmación de equipos. `labor_review_required`, `legacy_worked_hours` y campos de revisión distinguen esa situación. No reconstruir automáticamente el trabajo real desde un total histórico. La revisión especial requiere roles aprobadores, justificación y técnicos del roster original; puede registrar un reparto vacío justificado cuando no corresponde asignar horas.

Los cierres anteriores sin expediente permanecen identificados como tales. La auditoría disponible comprende aprobación, revisión de horas y eventos del expediente; no equivale a un log completo de todas las modificaciones generales.

El listado de órdenes para consulta e impresión está en [reportes](../reportes.md).
