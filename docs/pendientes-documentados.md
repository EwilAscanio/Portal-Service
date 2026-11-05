# Observaciones verificadas y límites actuales

> Revisión estática: 22 de octubre de 2026. [Índice](README.md)
> Este registro describe el código observado. No autoriza cambios ni afirma que se hayan corregido.

| Área | Hecho observado | Implicación / decisión futura | Fuente |
|---|---|---|---|
| Estado PAR | Listado filtra h.status; reporte filtra display_status | Un mismo nombre de filtro puede devolver conjuntos distintos; decidir semántica común antes de cambiar | lib/repositories/par.repository.js, report.repository.js |
| Rechazo PAR | updateStatus valida transición, sin comprobación de O/S no canceladas usada por edición | No prometer bloqueo de rechazo por órdenes; requiere decisión de negocio y revisión de efectos | lib/par-policy.js, par.repository.js |
| Búsqueda global | Endpoint accesible a todos los roles consulta seis grupos sin filtrar permiso por entidad | Revisar alcance deseado para datos personales/comerciales antes de ampliar exposición | app/api/search/route.js, lib/permissions.js |
| Órdenes propias | Restricción por técnico vinculado vive en calendario; no es filtro general de familia O/S | No describir acceso técnico como universalmente limitado a sus órdenes | technician-calendar.repository.js, service-order.repository.js, permisos |
| Dashboard | Serie de estados omite Aprobada; total incluye todas | Categorías de la serie pueden no sumar total | app/api/dashboard/route.js |
| Perfil | Guardado, estadísticas y foto son simulados/parciales | No usar como persistencia ni auditoría real | app/(dashboard)/perfil/page.jsx |
| Notificaciones | Rutas usan demostración y respuestas de marcado sin flujo persistente completo | No hay notificación operativa automática de PAR/O/S demostrada | app/api/notification/ |
| Vendedores | Catálogo Saint de solo lectura | No asigna vendedores a PAR/O/S ni calcula comisiones | app/(dashboard)/vendedores/page.jsx, vendor |
| Migraciones | Runner registra checksum, omite versión sin comparar contenido y usa 031 por defecto | No es detector automático de pendientes ni verificador de integridad de archivos aplicados | scripts/apply-migration.mjs |
| Error de migración | Catch hace rollback/log, sin fijar exitCode fallido | Revisar salida/estado explícitamente al operar; no confiar solo en exit status | scripts/apply-migration.mjs |
| Datos mostrados | Conviven snapshots con JOIN a nombres/códigos actuales | No prometer reproducción histórica inmutable de todo documento | Repositorios PAR/O/S/reportes |
| Auditoría | Hay trazas por operación específica, no historial universal de CRUD | No afirmar quién cambió cada campo sin evidencia persistida | Esquema y repositorios |

## Cómo resolver una observación

Confirmar primero que sigue vigente, definir resultado esperado con el responsable, evaluar dependencias, aprobar el cambio correspondiente y entonces implementar. Al resolverla actualizar su guía principal y retirar o marcar resuelta esta fila con referencia a la entrega.

Las discrepancias corregidas **solo en documentación** —roles omitidos, sesiones no revalidadas descritas como vigentes, O/S simuladas, contratos antiguos de horas/productos— quedan conservadas en los [originales históricos](historico/README.md).
