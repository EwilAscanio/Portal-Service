# Fotos y pendientes de O/S

> Entrega del 30 de octubre de 2026. Evidencia histórica; las reglas vigentes están en [fotos y pendientes](../../modulos/pendientes.md).

## Alcance implementado

- Galería opcional de hasta cinco fotos vigentes por O/S, JPG/JPEG/PNG de hasta 10 MB; ampliación, descarga, reemplazo y retiro con historial y almacenamiento privado.
- Renglones de pendientes persistidos como borradores, sin equipo individual. Los técnicos vinculados y programados pueden prepararlos, al igual que Superadministrador, Administrador, Supervisor y Coordinador.
- Publicación de pendientes y snapshots de cliente/planta/O/S/PAR dentro de la transacción de cierre. El cierre conserva sus permisos y validaciones de documentos y horas; cambios de pendientes sin guardar lo bloquean en pantalla.
- Página Lista de pendientes con filtros, paginación, resolución e historial. Solo los cuatro roles de gestión pueden completar; los técnicos consultan exclusivamente sus órdenes.
- Card de dashboard con total abierto y cinco pendientes más antiguos. Resolver un pendiente no reabre la O/S ni modifica horas.
- Migración 056, esquema consolidado y documentación de contexto, dependencias, módulos, seguridad, relaciones y operación.

## Comprobaciones realizadas

| Comprobación | Resultado |
|---|---|
| `npm run test:service-pending` | Correcto: migración aislada, permisos, borradores, formatos/tamaños, límite concurrente de fotos, revisión, reemplazo, publicación y rollback, snapshots, filtros, resumen, resolución concurrente e inmutabilidad |
| `npm test` | Correcto |
| `npm run lint` | Sin errores; tres advertencias anteriores en layout, ParForm y axios |
| `npm run build` | Correcto; 57 rutas generadas |
| Flujo en navegador | Carga de foto, guardado de pendiente, cierre de O/S ficticia, publicación, resolución desde Lista de pendientes y resumen actualizado en dashboard |

La prueba visual verificó que Cerrar O/S permanece deshabilitado con pendientes sin guardar y que la orden termina Completada después de confirmar el cierre. La consulta de completados mostró texto original y solución. Se usaron únicamente usuarios y órdenes ficticios en esquema/almacenamiento temporales, retirados al finalizar; no se cerraron órdenes operativas. La captura local de verificación está en `.private/verification/pendientes-os.png`, fuera de la documentación versionada.

## Base local y respaldo

La inspección encontró la migración 056 ya registrada en la base local con checksum coincidente; no se reaplicó. Se verificaron tablas, índice de posiciones, trigger habilitado y conservación de los datos operativos durante la verificación.

SHA-256 del archivo de migración: `5d7430e477f5476fd112d222705c894e41f6b01e60920dde6e9cc441c5a7559e`.

Se generó un respaldo de la base ya migrada en `.private/backups/verified-056-2026-10-30T18-36-34.776Z.dump` (901938 bytes), con catálogo legible mediante `pg_restore --list`. Es un respaldo posterior a la migración, no evidencia de un respaldo previo. La carpeta de documentos operativa estaba vacía en esa verificación; el manifiesto privado conserva el inventario. No se incorporaron datos personales, secretos ni respaldos a los documentos.

## Límites de esta entrega

No incorpora autoguardado, reapertura o eliminación de pendientes publicados, notificaciones ni actualización del dashboard en tiempo real. Conserva los permisos anteriores de horas y documentos por equipo. Las pruebas no equivalen a una restauración completa ni a un despliegue de producción. Se preservaron los cambios anteriores del workspace; no se realizó commit ni publicación remota.
