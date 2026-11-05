# Entrega: órdenes de garantía

> Implementación iniciada el 30 y verificada el 31 de octubre de 2026, zona America/Caracas. Evidencia de esta entrega, no contrato permanente. [Índice histórico](../README.md).

## Alcance entregado

- Clasificación Normal/Garantía y origen registrado (O/S Completada) o externo, con referencia y fecha conocida opcional.
- PAR de referencia aprobado para servicios sin PAR histórico, con cantidades, importes y presupuesto comercial cero; finalidad inmutable.
- Motivo y trabajo de garantía por equipo; ámbito y subconjunto validados en repositorio y SQL. La orden original se conserva.
- Estimaciones y reales de garantía excluidas del consumo comercial, incluso con saldo PAR cero. Cierre habitual con justificación por exceso propio.
- Roles de gestión y aprobación, hasta cuatro técnicos, disponibilidad y reprogramación previa al inicio conservados.
- Identificación en listado, cards, detalle, impresión y CSV; filtros de horas por clasificación y de PAR por finalidad; totales de horas separados.
- Estado comercial PAR calculado sin garantías, indicador aparte de garantías abiertas y bloqueo de edición que incluye todas las órdenes no canceladas.

La guía vigente es [Garantías](../../modulos/garantias.md). Se actualizaron contexto, dependencias, índice, flujo general, PAR, O/S, horas, cierre, reportes, datos, seguridad y operación. No se modificó TAREAS.MD. El plan descartado de suspensión, sustitución durante la ejecución y cierre parcial no forma parte de esta entrega.

## Migración local y conservación

Se creó un respaldo PostgreSQL de formato custom antes de aplicar 057, de 911619 bytes. Su catálogo se pudo leer con pg_restore; se conservó bajo .private/backups, fuera de Git. La carpeta privada del expediente no contenía archivos en ese momento; se verificó el inventario antes y después. No se realizó una restauración completa del respaldo.

Se aplicó `057-service-order-warranty.sql` mediante el runner. SHA-256 registrado y contrastado con el archivo:

`bc4be983911d176ac465360921d92c37f260db076a5700c5c9ceab87ac9804af`

Se verificaron los cuatro triggers habilitados. Conteos y huellas de las tablas operativas PAR, equipos, ítems, órdenes, técnicos/asignaciones, requisitos, archivos, eventos, fotos y pendientes coinciden con el inventario previo, excluyendo únicamente las columnas nuevas. La migración conserva importes, horas, estados y fechas anteriores. No se crearon ni cerraron órdenes operativas para probar la funcionalidad.

Esta evidencia corresponde a la base local configurada durante el trabajo; no implica instalación en otro servidor ni publicación en Git.

## Comprobaciones

- `npm test`: suite general correcta.
- `npm run test:service-order-warranty`: integración en esquema aislado; ambos orígenes, permisos, alcance, finalidad/origen inmutables, fecha civil externa, independencia de saldo, edición bloqueada por garantías, reprogramación, cierre, cancelación y reportes.
- `npm run test:service-pending`: expediente, fotos, publicación y seguimiento correctos.
- Integraciones de cuatro técnicos y vacaciones: correctas. Se actualizaron sus preparaciones aisladas para la estructura vigente y la resolución de next/link en Node, conservando las comprobaciones de las migraciones originales.
- Lint sin errores; tres advertencias existentes sobre fuente, React Hook Form y navegación en axios.
- Compilación de producción correcta, 57 rutas generadas.
- Navegador sobre datos ficticios: creación desde O/S completada, captura de motivo/trabajo y horas con saldo cero; selección del origen habilitada y PAR fijado; formulario de referencia sin importes comerciales. El reporte de horas filtrado por Garantía generó y descargó PDF. El visor integrado del navegador de prueba no dibujó el documento; no se acredita inspección visual completa del PDF.

Se corrigieron durante la revisión la selección de la O/S original, la representación de DATE como YYYY-MM-DD y la separación entre conteos de bloqueo y de estado visible del PAR. Las pruebas temporales se retiran al terminar. La comprobación de migración aplicada no se repite mediante --force.
