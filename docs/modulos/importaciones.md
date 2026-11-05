# Importaciones de catálogos

> Vigente · revisión estática: 22 de octubre de 2026. [Índice](../README.md)

## Propósito, acceso y fuentes

Carga controlada de Excel para productos, plantas, contactos y equipos. Solo Superadministrador. Los clientes proceden de Saint; no se crean mediante esta carga.

Fuentes: `app/api/import/`, `lib/import/workbook.js`, `lib/import/schemas.js`, `lib/import/analyzer.js`, `lib/import/executor.js`, `lib/repositories/data-import.repository.js`, `app/(dashboard)/importaciones/page.jsx`.

El lector admite hasta 5 MiB y 5.000 filas. La plantilla define hojas Productos, Plantas, Contactos y Equipos; respetar sus nombres y columnas.

## Etapas

| Etapa | Acción / validación | Datos y resultado |
|---|---|---|
| Preparar | Descargar plantilla y llenar columnas admitidas | Archivo Excel; aún sin cambios de catálogo |
| Analizar | Recibir archivo, validar estructura y filas contra catálogos | Operaciones Crear/Actualizar/Error, advertencias y resumen |
| Guardar análisis | Persistir archivo identificado por nombre/hash y filas normalizadas | data_import_batch en Validado y data_import_row |
| Revisar | Mostrar errores/advertencias y descargar errores | El usuario corrige y presenta un nuevo análisis si procede |
| Confirmar | Creador del lote, Superadministrador, estado Validado y cero errores | Bloqueo del lote y paso Importando dentro de transacción |
| Ejecutar | Productos → plantas → contactos → equipos; volver a resolver relaciones | Actualizaciones/inserciones y filas Completado |
| Finalizar | Commit completo | Lote Completado, fecha y resumen |
| Fallar | Error de ejecución | Rollback de cambios; marca Fallido fuera de la transacción fallida |

“Validado” es un estado del análisis: puede tener `error_count > 0`. Solo cero errores permite confirmar. Las advertencias no equivalen a errores bloqueantes. Repetir la confirmación de un lote procesado no vuelve a ejecutarlo.

## Relaciones y datos que deben preservarse

- Clientes referenciados deben existir y cumplir actividad; plantas se identifican en el ámbito del cliente.
- Contactos y equipos se resuelven contra la planta compatible.
- Cambios de ámbito de equipos con referencias PAR se protegen; el importador no debe convertirse en un atajo para romper relaciones.
- Actualizar productos conserva su marca existente de técnico; no convertir un producto marcado a categoría incompatible. Productos nuevos parten de la marca predeterminada.
- La vista previa no garantiza que la base no cambió entre análisis y confirmación. Ejecución y restricciones vuelven a proteger consistencia.

El lote guarda autor, fechas, conteos y payload normalizado de filas. Es información que puede contener datos personales/comerciales; no publicar ejemplos con filas reales.

## Endpoints y consumidores

`/api/import/template`: plantilla; `/preview`: análisis; `/api/import`: lotes; `/[id]/errors`: errores; `/[id]/commit`: confirmación. Consultar los handlers para verbos, límites y respuestas exactas.

Los catálogos modificados afectan futuras selecciones PAR y también lecturas actuales por JOIN. No crea PAR/O/S ni expedientes; no recalcula documentos históricos al terminar.
