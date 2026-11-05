# Técnicos y calendario

> Vigente · actualizado: 31 de octubre de 2026, disponibilidad por motivo y días completos. [Índice](../README.md)

## Catálogo de personas

Fuentes: `lib/repositories/technical.repository.js`, `app/api/technical/`, `components/technical/`, `lib/validators/operational.schema.js`.

| Etapa | Regla | Resultado |
|---|---|---|
| Crear técnico | Cédula única, nombre y contacto válido | technical Activo/Inactivo |
| Vincular usuario opcional | Usuario elegible según catálogo; vínculo único | technical.user_id permite resolver agenda propia |
| Editar | Validación de datos y unicidad | Cambia datos actuales; asignaciones mantienen copias |
| Inactivar | Cambio de estado | No elimina órdenes ni históricos; nuevas asignaciones requieren técnico activo |
| Programar en O/S | Renglones y horas disponibles | Persona participa en roster y una o varias asignaciones |
| Registrar ejecución | Asignaciones ya programadas | Reales por renglón durante el cierre |

Un técnico puede existir sin cuenta de acceso. El vínculo técnico/usuario es opcional y único; la cédula o el nombre no se utilizan para adivinarlo.

Los productos “técnico 1”, “especialista”, etc. representan el servicio cotizado. La persona se decide en la O/S. Detalle en [horas](horas-tecnicos.md).

## Calendario derivado de órdenes

Fuentes: `app/api/technician-calendar/route.js`, `lib/repositories/technician-calendar.repository.js`, `lib/technician-calendar-policy.js`, `app/(dashboard)/calendario-tecnicos/page.jsx`.

Flujo: abrir agenda → validar sesión y filtros → resolver técnico propio si corresponde → consultar órdenes aprobadas que intersectan el intervalo → presentar eventos → abrir detalle de orden.

Condiciones de inclusión:

- `approved_by` y `approved_at` presentes.
- Estado distinto de Cancelada.
- Intervalo programado que intersecta el rango consultado.
- Técnicos vinculados mediante `service_order_technician`.

Una O/S con varios técnicos produce una participación por persona. No hay tabla independiente de eventos ni CRUD manual de agenda. Pendiente no aparece; Completada conserva su programación histórica. La etiqueta Aprobada puede mostrarse como Programada y En Proceso como En ejecución.

## Alcance por rol

Superadministrador, Administrador, Supervisor y Coordinador pueden consultar la agenda con filtros autorizados. Para Técnico, el servidor fuerza su `technical.user_id`, incluso si se envía otro técnico. Sin vínculo responde `TECHNICIAN_ACCOUNT_NOT_LINKED`.

Esta restricción pertenece a la consulta del calendario. No implica que todas las rutas de O/S estén limitadas a órdenes propias. [Permisos](../arquitectura/seguridad-permisos.md).

## Conflictos y efectos

Al aprobar una O/S se revisa solapamiento por técnico con órdenes aprobadas no canceladas. Dos intervalos que solo comparten el extremo no se solapan. El conflicto requiere confirmación explícita; no se desplaza automáticamente otra orden.

Cambiar selección/horario se hace en la edición permitida de la O/S. Cancelar quita su participación; cerrar conserva horario y permite consulta histórica. Las horas reales no alargan eventos ni se deducen de su duración.

La UI usa FullCalendar React; su versión y API están fijadas por las dependencias del proyecto. No copiar propiedades de versiones anteriores sin revisar el paquete instalado.

## Disponibilidad del técnico

En la consulta de un técnico, **Disponibilidad del técnico → Registrar no disponibilidad** permite guardar un período por días completos. No se usa un check permanente: el bloqueo se determina por las fechas y la cancelación del período, independientemente del estado Activo/Inactivo del catálogo.

| Campo | Contrato |
|---|---|
| Motivo | Vacaciones, Días compensatorios, Enfermedad, Permisos u Otros |
| Fecha de inicio / último día no disponible | Fechas válidas, final igual o posterior al inicio; ambos días incluidos |
| Detalle administrativo | Opcional, máximo 2000 caracteres; Otros exige al menos cinco caracteres sin espacios exteriores |
| Motivo del cambio | Obligatorio al modificar o cancelar, entre 5 y 2000 caracteres |

Todos los motivos bloquean igual; no hay permisos por horas. La zona operativa es `America/Caracas`. Un período del 10 al 12 bloquea desde las 00:00 del 10 hasta las 00:00 del 13, extremo final excluido. Una O/S que termina exactamente al comenzar la ausencia, o comienza al terminarla, no coincide.

### Flujo y etapas

1. Seleccionar motivo y fechas; escribir detalle si corresponde.
2. **Revisar coincidencias** consulta O/S abiertas y otros períodos del técnico. La revisión es informativa: el servidor vuelve a comprobar al guardar.
3. Si coincide una O/S Pendiente, Aprobada o En Proceso, resolverla primero; no se puede guardar ni ampliar la ausencia sobre ella. Aplica a órdenes Normales y Garantía, aunque solo coincida el cuarto técnico.
4. Guardar crea el período y un evento con actor, fecha y snapshot. Dos períodos no cancelados del mismo técnico no pueden solaparse, aunque tengan motivos distintos.
5. Modificar exige revisión actual y justificación; conserva ID y registra valores anteriores/nuevos, incluida la categoría. Cancelar es lógico: conserva filas e historial y deja de bloquear.

| Estado visible del período | Cuándo | Efecto |
|---|---|---|
| Programado | Hoy es anterior al inicio | Ya bloquea O/S programadas dentro de esas fechas |
| Vigente | Hoy está entre inicio y final incluidos | Muestra No disponible hasta… |
| Finalizado | Hoy es posterior al último día | Deja de bloquear fechas posteriores; conserva el intervalo histórico |
| Cancelado | Tiene fecha de cancelación | No bloquea, independientemente de sus fechas |

Estos estados se calculan, no se almacenan ni requieren una tarea programada. Finalizar o cancelar un período no reactiva un técnico Inactivo. Tabla y tarjetas muestran el mismo resumen de disponibilidad; el modal contiene los períodos y controles permitidos.

### Bloqueo de O/S y reprogramación

Crear, editar programación/reparto, aprobar, iniciar y reprogramar una O/S comprueban disponibilidad en el servidor. El formulario deshabilita técnicos incompatibles y avisa si la selección previa quedó bloqueada; esa ayuda no sustituye la validación al guardar. `confirmScheduleConflict` no permite omitir una ausencia: solo aplica al conflicto entre órdenes.

Una O/S Pendiente se corrige mediante su edición habitual. Una Aprobada que todavía no pasó a En Proceso tiene la acción controlada de reprogramación para Superadministrador, Administrador o Supervisor: puede ajustar fechas o sustituir técnicos, exige motivo y `schedule_revision`, conserva documento, equipos y total por renglón, registra la aprobación previa y vuelve a Pendiente para una nueva aprobación. En Proceso no admite esa reprogramación; debe resolverse por el flujo vigente antes de registrar una ausencia coincidente. No se incorpora suspensión, sustitución durante ejecución ni cierre parcial.

El presupuesto PAR, las horas estimadas y las reales no se calculan a partir de la ausencia. Registrar una ausencia no cambia órdenes, asignaciones ni aprobaciones automáticamente. [Horas](horas-tecnicos.md) · [O/S](ordenes-servicio.md) · [cierre](../cierre-orden-servicio.md).

### Permisos y privacidad

| Actor / superficie | Información y acciones |
|---|---|
| Superadministrador, Administrador, Supervisor | Consultar categorías, notas e historial; registrar, modificar, cancelar y revisar coincidencias |
| Coordinador | Consultar períodos, fechas y bloqueo; sin categoría, nota, justificación ni eventos administrativos |
| Técnico en calendario | Solo su disponibilidad y sus órdenes según vínculo de usuario, forzado en servidor |
| Calendario, catálogos de técnicos y selectores O/S, para cualquier rol | Fechas y disponibilidad genérica; nunca categoría ni notas administrativas |
| Usuario | Sin acceso a esta gestión |

La API omite físicamente los campos privados en las respuestas restringidas; no basta ocultarlos en pantalla. El motivo Enfermedad se trata como información administrativa sensible y no se publica en agenda. Evitar diagnósticos o información personal innecesaria en las notas.

### Persistencia y concurrencia

- `technical_unavailability`: FK a técnico; `reason_type`, fechas inclusivas, nota, revisión, actores/fechas de creación, edición y cancelación.
- `technical_unavailability_event`: FK `unavailability_id`, actor, acción, justificación y JSON antes/después.
- `service_order_schedule_event` y `service_order.schedule_revision` conservan la reprogramación; no pertenecen a la ausencia.
- La migración 058 renombra las tablas anteriores, sus restricciones, índices, secuencia y FK. Clasifica filas previas como Vacaciones, incluso canceladas, sin reescribir sus snapshots. Solo el historial administrativo interpreta la ausencia de `reason_type` en un snapshot antiguo como Vacaciones.
- Los valores persistidos son `Vacaciones`, `DiasCompensatorios`, `Enfermedad`, `Permisos` y `Otros`; API usa `reasonType`. Los nuevos registros exigen categoría explícita; SQL también valida el detalle de Otros.
- Ausencias y escrituras de programación comparten un bloqueo transaccional por técnico, con UUID ordenados y clave estable `maquitech:technical-schedule:`. O/S mantiene PAR → O/S → técnicos; ausencia toma solo técnicos. Esto evita confirmar simultáneamente dos reservas incompatibles. SQL directo fuera de esos repositorios no adquiere esta protección automáticamente.

### Contratos y fuentes

| Capa | Fuente |
|---|---|
| Reglas, categorías y fechas | `lib/technician-unavailability.js` |
| Validación | `lib/validators/technician-unavailability.schema.js` |
| Escrituras, permisos y bloqueo | `lib/repositories/technician-unavailability.repository.js`, repositorio O/S |
| HTTP y cliente | `lib/technician-unavailability-http.js`, `app/api/technical/[id]/unavailability/`, `lib/api.js` |
| Consulta/formulario y resúmenes | `TechnicalUnavailabilityPanel`, `TechnicalAvailability`, `TechnicalViewModal`, tabla y tarjetas |
| Consumidores | `technical.repository`, `technician-calendar.repository`, `LaborAllocationEditor`, `ServiceOrderForm` y reprogramación |
| SQL y comprobaciones | Migración 058, `db/schema.sql`, `npm run test:technician-unavailability` |

GET/POST de `/api/technical/[id]/unavailability` consulta/registra; PUT/DELETE de `.../[unavailabilityId]` modifica/cancela; POST de `.../impact` revisa fechas y admite excluir el período editado. Las respuestas usan `unavailability`, no `vacations`; actualización de UI y servidor debe desplegarse junta. La ruta antigua no forma parte del contrato vigente.

## Ausencias en el calendario

La agenda combina participaciones O/S con períodos de no disponibilidad no cancelados, de día completo. Los períodos proceden de su propia tabla; no son nuevos eventos editables del calendario. Aparecen con texto genérico **No disponibilidad**, sin categorías ni notas, y no incrementan los contadores de órdenes.

Los filtros por cliente o planta no ocultan ausencias; el filtro por técnico y el alcance de agenda propia sí se aplican. Calendario, tabla y tarjetas consultan las mismas fechas. El extremo final exclusivo enviado a FullCalendar es el día posterior al último día registrado.
