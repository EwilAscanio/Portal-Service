# Entrega: descuento general del PAR

> Fecha: 23 de octubre de 2026. Registro histórico de esta entrega.
> Regla vigente: [guía PAR](../../modulos/par.md). [Índice](../../README.md).

## Alcance implementado

- Porcentaje de 0 a 100, hasta dos decimales, aplicado a servicios y repuestos.
- Subtotal, monto descontado automático y total final USD/Bs.
- Persistencia de porcentaje y desglose en cabecera; cálculo NUMERIC en servidor.
- Mismos roles y bloqueo por O/S no canceladas que la edición del PAR.
- Formulario, consulta, vista previa, impresión, listado/tarjetas y reporte PDF actualizados.
- Horas presupuestadas y asignaciones de O/S conservan su significado.

## Base de datos

Se creó y aplicó la migración 053-par-discount en la base configurada del entorno. Se generó antes un respaldo PostgreSQL en formato custom dentro de .private/backups, excluido de Git; no contiene una copia de la carpeta de documentos de cierre.

La comprobación posterior confirmó el registro y checksum de la migración, el trigger de fecha habilitado y los ocho PAR existentes con descuento cero. El digest de ID, totales USD/Bs, horas presupuestadas, estado y updated_at coincide antes/después. Este conteo corresponde solo a ese entorno y momento.

La migración no recalculó importes históricos ni modificó documentos de cierre. En otras bases debe revisarse y aplicarse su migración pendiente; el estado de este entorno no se traslada automáticamente.

## Comprobaciones realizadas

- npm run lint: sin errores, tres advertencias preexistentes (layout, React Hook Form y navegación Axios).
- npm run build: completado correctamente.
- git diff --check: sin errores de formato.
- Lectura y revisión de contratos entre formulario, API, repositorio, campos y reporte.

No se añadieron ni ejecutaron pruebas funcionales, de integración o unitarias, ni se creó un PAR o PDF de prueba. La compilación y la comprobación de la migración no sustituyen una validación del flujo completo en navegador.

## Documentación

Actualizadas las guías de PAR, datos/relaciones, horas, reportes y operación, junto con AI_CONTEXT.md y APP_DEPENDENCIES.md. No se modificó TAREAS.MD ni se realizó commit/push.
