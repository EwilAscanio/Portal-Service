# Entrega: hasta cuatro técnicos por O/S

> 24 de octubre de 2026 · Registro histórico de esta entrega local. La regla vigente está en [Órdenes de Servicio](../../modulos/ordenes-servicio.md#límite-compartido-y-persistencia).

## Alcance implementado

- Creación y edición de una O/S Pendiente con entre uno y cuatro técnicos activos distintos, incluido el responsable. El límite se cuenta en toda la orden, aunque una persona participe en varios renglones de mano de obra.
- Cuatro personas pueden compartir un mismo renglón. El cuarto técnico puede ser responsable cuando tiene horas asignadas. Se rechaza una quinta persona en interfaz, validadores y repositorio; el trigger de PostgreSQL también limita la tabla de técnicos a cuatro por orden.
- Se conservan permisos, estados, asignaciones anteriores y reglas de presupuesto/reserva/consumo. Ocho horas repartidas entre cuatro personas siguen sumando ocho horas.
- Agenda y conflictos, consulta/impresión, cierre y reporte de horas consumen la lista existente de técnicos. La comprobación de esta entrega incluye al cuarto participante.

## Fuentes modificadas

- Límite común: [lib/service-order-policy.js](../../../lib/service-order-policy.js).
- Validación y persistencia: [operational.schema.js](../../../lib/validators/operational.schema.js) y [service-order.repository.js](../../../lib/repositories/service-order.repository.js).
- Distribución activa: [LaborAllocationEditor.jsx](../../../components/service-orders/LaborAllocationEditor.jsx). También se sincronizó [TechnicianSelector.jsx](../../../components/service-orders/TechnicianSelector.jsx), selector auxiliar que el formulario actual no utiliza.
- Base nueva: [db/schema.sql](../../../db/schema.sql). Base existente: [migración 054](../../../db/migrations/054-service-order-four-technicians.sql), que sustituye únicamente la función del trigger creado en la migración 036.
- Guías actualizadas: AI_CONTEXT, APP_DEPENDENCIES, O/S, horas, cierre, datos/relaciones y operación. Las reglas completas permanecen en sus guías principales.

## Aplicación local de la migración

1. Se comprobó el registro de migraciones y que el trigger anterior limitaba la orden a tres técnicos.
2. Se generó un respaldo completo de PostgreSQL en formato personalizado dentro de `.private/backups/`, excluido de Git. Se comprobó que `pg_restore --list` podía leer su catálogo; no se realizó una restauración completa.
3. Se ejecutó `npm run db:migrate -- 054-service-order-four-technicians.sql` correctamente. El runner registró el checksum SHA-256 `d7f1993771d57e3aa33142cf1c4b74074e2f4ee3858639f1a03c0543e5846835`.
4. Se comprobó la función con límite cuatro, el trigger habilitado y la coincidencia de cantidades y huellas de filas de las diez tablas operativas de PAR, O/S, asignaciones, equipos y cierre, antes y después de la migración. Los datos operativos existentes se conservaron.

Esta evidencia corresponde a la base configurada localmente durante la entrega; otras instalaciones requieren su propio respaldo y aplicación de la migración. La reversión y las precauciones cuando ya existan órdenes con cuatro personas se describen en [operación](../../operacion/despliegue-respaldo-migraciones.md#ampliación-a-cuatro-técnicos-por-os).

## Comprobaciones ejecutadas

| Comando | Resultado y alcance |
|---|---|
| `npm run test:service-order-technicians` | Correcto: política, validadores, integración de catálogo y nueva integración del flujo con cuatro técnicos. |
| `node spec/migrations.test.mjs` | Correcto: incluye contrato de la migración 054, límite del esquema consolidado y ausencia de cambios destructivos en esa migración. |
| `npm run lint` | Sin errores; tres advertencias preexistentes en app/layout.jsx, components/par/ParForm.jsx y lib/axios.js. |
| `npm run build` | Correcto: compilación de producción y generación de las 55 páginas estáticas reportadas por Next. |

La integración [service-order-technicians.integration.test.mjs](../../../spec/service-order-technicians.integration.test.mjs) utiliza datos ficticios en un esquema PostgreSQL aislado y lo elimina al terminar. Comprueba:

- Transición del trigger de tres a cuatro conservando una orden existente; rechazo del quinto técnico.
- Creación y aprobación con uno, dos, tres o cuatro técnicos; edición de tres a cuatro mientras la orden está Pendiente.
- Responsable entre los asignados, rechazo de inactivos, duplicados en un renglón, quinta persona entre varios renglones y edición de una orden aprobada.
- Agenda para los cuatro participantes y detección de un conflicto que afecta exclusivamente al cuarto.
- Validación y renderizado de la distribución, consulta e impresión; el cuarto está disponible y el quinto queda deshabilitado cuando se alcanza el máximo.
- Cierre con horas reales de los cuatro programados. Una estimación de ocho horas y un cierre de seis conserva la estimación y libera dos horas para otras órdenes del mismo PAR.
- Reporte con los cuatro participantes y totales estimados/reales coherentes con el cierre.

No se realizó una revisión manual de las pantallas en navegador, una restauración completa del respaldo ni una prueba de despliegue en otro servidor. Las comprobaciones de esta entrega no sustituyen las de cambios futuros.
