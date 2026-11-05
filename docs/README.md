# Documentación de Maquitech

> Índice vigente · actualizado: 31 de octubre de 2026.

**PAR y Órdenes de Servicio son la base de Maquitech.** La documentación sigue su recorrido, desde los catálogos que los alimentan hasta el cierre y los reportes.

## Por dónde comenzar

| Necesidad | Leer |
|---|---|
| Entender el proyecto como IA o nuevo colaborador | [AI_CONTEXT](../AI_CONTEXT.md) → [APP_DEPENDENCIES](../APP_DEPENDENCIES.md) → guía del área |
| Entender la operación completa | [Flujo general y vocabulario](negocio/flujo-general.md) |
| Cambiar PAR, O/S o horas | Las tres guías centrales y el [cierre](cierre-orden-servicio.md) |
| Evaluar datos sensibles o permisos | [Seguridad y acceso](arquitectura/seguridad-permisos.md) |
| Instalar, actualizar o recuperar el servidor | [Operación](operacion/despliegue-respaldo-migraciones.md) |
| Agregar o mantener documentación | [Procedimiento](mantenimiento-documentacion.md) y [plantilla](plantillas/modulo.md) |

## Documentos centrales

- [PAR: origen, relaciones, etapas y edición](modulos/par.md).
- [Órdenes de Servicio: alcance, programación y estados](modulos/ordenes-servicio.md).
- [Garantías: origen registrado/externo, PAR de referencia y horas separadas](modulos/garantias.md).
- [Horas presupuestadas, estimadas y reales](modulos/horas-tecnicos.md).
- [Expediente y cierre de O/S](cierre-orden-servicio.md).
- [Fotos y lista de pendientes: expediente, publicación y seguimiento](modulos/pendientes.md).
- [Reportes: filtros, vista previa y PDF](reportes.md).

## Catálogos y módulos de apoyo

- [Clientes, plantas, contactos y equipos](modulos/clientes-plantas-contactos-equipos.md).
- [Productos y plantillas PAR](modulos/productos-plantillas.md).
- [Técnicos: disponibilidad por motivo y calendario](modulos/tecnicos-calendario.md).
- [Usuarios, roles y configuración](modulos/usuarios-configuracion.md).
- [Importaciones](modulos/importaciones.md).
- [Dashboard, búsqueda, perfil, notificaciones y vendedores](modulos/dashboard-busqueda-perfil.md).

## Arquitectura y operación

- [Capas, contratos y librerías](arquitectura/arquitectura.md).
- [Modelo de datos, relaciones y snapshots](arquitectura/datos-relaciones.md).
- [Autenticación, permisos y datos sensibles](arquitectura/seguridad-permisos.md).
- [Despliegue, migraciones, respaldos y recuperación](operacion/despliegue-respaldo-migraciones.md).

## Mantenimiento e historial

- [Cómo mantener y ampliar la documentación](mantenimiento-documentacion.md).
- [Plantilla para documentar un módulo](plantillas/modulo.md).
- [Observaciones verificadas y límites actuales](pendientes-documentados.md).
- [Archivo histórico y originales](historico/README.md).

Las guías vigentes describen el código revisado. El histórico conserva información anterior, incluidos resultados puntuales de entregas; no debe usarse como contrato actual. Las observaciones no autorizan ni representan correcciones implementadas.
