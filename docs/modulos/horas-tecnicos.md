# Horas: presupuesto, estimación y ejecución

> Vigente · actualizado el 31 de octubre de 2026: horas de garantía independientes. [Índice](../README.md)
> Fuente principal de las reglas de horas compartidas entre PAR, O/S, cierre y reportes.

## Tres medidas distintas

| Medida | Origen y campo | Momento / uso |
|---|---|---|
| Presupuestadas | par_item.qty cuando requires_technician; suma en par_header.budgeted_hours | Lo previsto en el PAR para cotizar |
| Estimadas | service_order_labor_allocation.hours; suma en service_order.worked_hours | Distribución al programar; reserva comercial solo en O/S Normal |
| Reales | allocation.actual_hours; suma confirmada en service_order.actual_hours | Borrador en expediente; efectiva al existir closed_at |
| Horario de agenda | scheduled_start / scheduled_end | Intervalo programado, independiente de las tres anteriores |

**Cantidad 8 en un renglón de técnico significa 8 horas de mano de obra.** El multiplicador comercial, precio, porcentaje y descuento general del PAR no intervienen. Repartir entre dos personas no duplica el presupuesto. La incorporación del descuento (23 de octubre de 2026) conserva esta regla.

Un producto como técnico 1, técnico 2, especialista o ayudante define el servicio cotizado. `technical` identifica a la persona que lo realiza. No hay un vínculo fijo producto → persona: la O/S asigna la persona a cada renglón. No hay cálculo de comisiones; futuros porcentajes por tipo de renglón necesitarán diseño y aprobación propios.

Una O/S admite de uno a cuatro técnicos distintos en total, incluido el responsable. Ocho horas pueden repartirse como 2 + 2 + 2 + 2; siguen siendo 8 h estimadas. Un técnico en varios renglones cuenta una sola vez para el límite, y sus horas se conservan por asignación. [Validaciones del límite](ordenes-servicio.md#límite-compartido-y-persistencia).

## Identidad del presupuesto

El saldo pertenece a **cada ítem del PAR**. No se agrupa por código de producto ni solo por PAR. Dos ítems con el mismo producto siguen siendo presupuestos independientes.

La marca de mano de obra se copia desde el producto a `par_item.requires_technician`. Cambiar el catálogo después no reescribe automáticamente presupuestos históricos. Las asignaciones conservan identidad y número de origen, producto/código/descripción y técnico.

## Cálculo del saldo

Para un renglón, contando únicamente O/S con `order_kind = Normal`:

```text
Consumo comprometido =
    estimaciones de O/S no canceladas sin closed_at
  + horas reales de O/S no canceladas con closed_at

Saldo = cantidad presupuestada del renglón - consumo comprometido
```

- O/S Pendiente, Aprobada y En Proceso reservan sus estimaciones.
- Guardar reales en borrador no cambia esa reserva.
- Cerrar sustituye la estimación por lo real.
- Cancelada no consume, aunque conserve asignaciones e historial.
- Completada histórica sin cierre confirmado conserva estimación/reparto histórico.
- Para validar una edición o un cierre se excluye temporalmente la propia O/S del consumo y se compara su nuevo reparto con el disponible.
- Revisiones históricas pendientes de otras órdenes no canceladas bloquean nuevas reservas normales; el saldo mostrado sigue siendo provisional.

Las nuevas estimaciones no pueden exceder el saldo. El cierre real sí puede superar la estimación o el disponible si se justifica. La consulta puede producir saldo negativo; la interfaz no ofrece ese saldo como horas disponibles para nuevas asignaciones.

## Horas de garantía

Las asignaciones de Garantía usan los mismos renglones y snapshots, pero quedan excluidas de todas las consultas de reserva y consumo comercial. No requieren saldo comercial disponible ni resolver revisiones de otras órdenes para reservarlo, porque no lo utilizan. Un PAR de referencia mantiene cantidades y presupuesto en cero: las estimaciones se ingresan directamente en la garantía.

Guardar reales conserva un borrador. Cerrar confirma esas horas por separado y exige justificación si alguna asignación supera su estimación; no compara contra el presupuesto PAR. Menor consumo o cancelación no libera horas comerciales. Se conservan límites de técnicos, renglones válidos, decimales y justificación de ceros. [Origen y ejemplo de garantía](garantias.md#horas-y-efecto-sobre-par).

## Ejemplos

### Reparto y liberación entre órdenes

PAR, renglón 1: 12 h. O/S A reserva 8 h: Ana 5 y Luis 3. O/S B reserva 4 h.

| Momento | Consumo A | Consumo B | Disponible |
|---|---:|---:|---:|
| Ambas abiertas | 8 | 4 | 0 |
| Borrador real A = 6 | 8 | 4 | 0 |
| Cierra A con Ana 4 + Luis 2 | 6 | 4 | 2 |
| Cancela B | 6 | 0 | 6 |

El reporte por técnico asigna a Ana 5 estimadas/4 reales y a Luis 3 estimadas/2 reales. No asigna las 8 o 6 horas completas a cada persona.

### Exceso

PAR, renglón 1: 8 h. O/S reserva 8 y cierra con 10. Se exige motivo; el consumo real es 10 y el saldo aritmético −2. El PAR continúa cotizando 8 h; no se modifica su importe.

También requiere justificación que una asignación supere su estimación aunque otras reduzcan horas y el total no supere el presupuesto. La justificación cubre ambas comprobaciones de cierre.

### Mismo producto, otro renglón

Renglón 1: 8 h de especialista; renglón 2: 4 h del mismo producto. Una reserva en el renglón 1 no puede tomar automáticamente las 4 h del renglón 2. Debe existir la asignación al ítem correcto.

## Registro de reales

- Solo personas y asignaciones programadas; no incorporar un técnico distinto al cerrar.
- Cada asignación debe tener un valor explícito, con hasta dos decimales.
- Cero es válido con explicación de al menos cinco caracteres.
- NULL significa sin informar; no equivale a cero ni a la estimación.
- Superadministrador, Administrador, Supervisor y Coordinador pueden preparar el borrador en En Proceso.
- Solo los tres primeros confirman el cierre, sujeto a documentos, horas, revisión histórica y justificación de excesos.

El cálculo usa centésimas de hora para comparar y sumar. Una hora decimal no se interpreta como formato HH:MM: 1.50 h equivale a una hora y media.

## Históricos, reportes y trazabilidad

La revisión de órdenes anteriores distribuye la estimación histórica sin inventar horas reales. Una orden Completada sin `closed_at` no entra en la comparación de horas del reporte; se informa como exclusión histórica. Con fecha de cierre pero asignaciones incompletas, se informa otra exclusión. [Reporte](../reportes.md).

Al cerrar se conservan estimaciones originales, horas reales, notas, motivo de exceso, actor y fecha. Las escrituras coordinan bloqueos sobre el PAR y la orden; el expediente añade revisión optimista. [Cierre](../cierre-orden-servicio.md).

## Fuentes e impacto

- `lib/labor-hours.js`.
- `lib/repositories/par.repository.js`.
- `lib/repositories/service-order-labor.repository.js`.
- `lib/repositories/service-order-closure.repository.js`.
- `lib/repositories/report.repository.js`.
- `db/migrations/051-par-labor-allocation.sql`, `052-service-order-closure.sql` y `057-service-order-warranty.sql`.

Cualquier cambio de fórmula exige recorrer captura PAR, asignaciones, saldos, cancelación, cierre, vistas/impresión y reportes. No usar el horario como sustituto de horas pagables ni inferir comisiones de estos campos.
