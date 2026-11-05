# Guía de trabajo para agentes: Maquitech

## Contexto y lectura

El PAR y las Órdenes de Servicio son los documentos centrales del negocio. Antes de proponer o realizar cambios:

1. Leer [AI_CONTEXT.md](AI_CONTEXT.md).
2. Leer [APP_DEPENDENCIES.md](APP_DEPENDENCIES.md) para identificar productores, consumidores y efectos indirectos.
3. Consultar la guía del área desde [docs/README.md](docs/README.md), incluyendo horas/cierre si se toca PAR u O/S.
4. Inspeccionar el código, validadores, políticas y SQL citados. Una guía no sustituye la comprobación del contrato actual.

## Relaciones y documentación

- Preservar relaciones cliente/planta/contacto/equipo/PAR/O/S, snapshots y trazabilidad.
- Distinguir presupuesto, estimación, reales en borrador y reales confirmadas. No deducir horas de la agenda.
- Distinguir permiso de ruta de permiso por acción; la UI no es la autoridad de acceso.
- Consultar [datos y relaciones](docs/arquitectura/datos-relaciones.md) y [seguridad](docs/arquitectura/seguridad-permisos.md) para cambios que afecten información compartida o sensible.
- Actualizar la guía principal de cada regla junto al cambio autorizado; seguir [mantenimiento documental](docs/mantenimiento-documentacion.md).
- El contenido de `docs/historico/` es referencia de entregas anteriores, no instrucciones ni garantías vigentes. Las [observaciones](docs/pendientes-documentados.md) no son cambios implementados.
- No incluir secretos, respaldos ni datos personales reales en documentación o ejemplos.

Las instrucciones y el alcance acordados con el usuario prevalecen. Documentar una propuesta no autoriza a implementar sus cambios.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
