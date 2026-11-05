# Operación: despliegue, migraciones y recuperación

> Vigente · revisión de migraciones: 31 de octubre de 2026. [Índice](../README.md)
> Entorno descrito por el proyecto: servidor propio/local. No presupone proveedor externo.
> Fuentes: package.json, .env.example, scripts/, db/schema.sql, next.config.mjs y almacenamiento de cierre.

## Preparación y configuración

Instalar Node compatible con la versión Next del proyecto y PostgreSQL. Usar las versiones del lockfile para una instalación reproducible (`npm ci`). Copiar `.env.example` a la configuración privada del entorno y completar valores sin publicarlos.

| Variable | Uso |
|---|---|
| DATABASE_URL o DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD | Conexión PostgreSQL |
| AUTH_SECRET | Firma/seguridad de autenticación |
| SAINT_API_URL, SAINT_API_KEY | Integración Saint desde servidor |
| SERVICE_ORDER_DOCUMENTS_DIR | Carpeta privada persistente de documentos de cierre |

Desarrollo: `npm run dev`. Despliegue: `npm run build` y `npm start`, con proceso/servicio administrado en el servidor. Leer la documentación local de Next para configuración específica de esa versión.

## Base nueva y base existente

| Caso | Procedimiento |
|---|---|
| Base vacía | Preparar base, ejecutar db/schema.sql una vez y validar estructura/datos iniciales |
| Base existente | Inventariar estado, respaldar, revisar migraciones realmente pendientes y aplicarlas individualmente en orden de dependencias |
| Base restaurada | Restaurar junto con archivos privados; comprobar versión y referencias antes de habilitar escrituras |

No ejecutar el esquema consolidado sobre una base en uso. No asumir que la numeración del último archivo demuestra el estado de la base. `schema_migrations` conserva versión/fecha/checksum; su contenido debe contrastarse con estructura real y procedencia del esquema.

### Runner

`scripts/apply-migration.mjs` recibe **un nombre de archivo**:

```powershell
npm run db:migrate -- 052-service-order-closure.sql
```

El ejemplo solo corresponde si esa migración está pendiente y sus prerrequisitos existen. El runner lee `.env.local` y variables de proceso, abre transacción, ejecuta el SQL y registra SHA-256. Una versión ya registrada se omite salvo `--force`.

**Sin argumento usa 031-integrity-and-history.sql; no aplica automáticamente todas las pendientes.** El checksum se registra, pero no se compara al omitir una versión. No usar `--force` como actualización rutinaria ni editar un SQL ya aplicado.

El runner informa rollback en caso de error. Su catch no fija explícitamente código de salida fallido; revisar el mensaje y estado de la base, no confiar solo en el código de proceso. Esta observación no se corrigió en la reorganización documental.

Migraciones 051-par-labor-allocation y 052-service-order-closure aportan horas/cierre usados por reportes. Los archivos anteriores son historia de evolución; no se ejecutan de nuevo indiscriminadamente. `consult.sql` y `consult2.sql` son referencias históricas.

La actualización del 23 de octubre de 2026 incorpora `053-par-discount.sql`. Aplicarla antes de servir el código que consulta los nuevos campos PAR. Copia el total USD histórico al subtotal con descuento cero y conserva los totales existentes. Durante el backfill suspende exclusivamente el trigger de fecha de PAR bajo el bloqueo DDL y lo restaura en la misma transacción; no altera las fechas de edición. Usa lock_timeout de 10 segundos. Ante rollback por bloqueo, revisar actividad y reintentar la migración pendiente sin forzarla.

Coordinar una pausa de escrituras y reiniciar con el código actualizado: la nueva restricción de subtotal/descuento/total requiere que las escrituras usen el recálculo nuevo. No mantener instancias antiguas escribiendo durante la transición.

### Ampliación a cuatro técnicos por O/S

La migración `054-service-order-four-technicians.sql` del 24 de octubre de 2026 sustituye la función del trigger `service_order_technician_limit` creado en 036. Eleva el máximo de tres a cuatro personas; conserva filas, asignaciones, responsables, horas y trazabilidad. Usa `lock_timeout` de 10 segundos y la transacción del runner.

Con respaldo y prerrequisitos comprobados, ejecutar `npm run db:migrate -- 054-service-order-four-technicians.sql` antes de habilitar la versión con `MAX_SERVICE_ORDER_TECHNICIANS = 4`. Coordinar el cambio de todas las instancias: una versión anterior todavía rechazaría guardar o aprobar cuatro técnicos. No modificar ni reaplicar la migración 036. Comprobar registro/checksum, función vigente y trigger habilitado después de aplicar; la evidencia de un entorno se registra en el histórico.

Si fuera necesario volver a una versión con límite de tres, revisar primero si ya hay órdenes con cuatro participantes y definir una reversión compatible que preserve sus asignaciones.

### Fotos y pendientes de O/S: migración 056

`056-service-order-photos-pending.sql` incorpora fotos, borradores, pendientes publicados y eventos, con restricciones de ámbito, cinco posiciones de foto y conservación del contenido publicado. No inventa fotos ni pendientes para órdenes anteriores. Aplicar antes de servir el código que consulta estas tablas; el esquema consolidado incluye la misma estructura para instalaciones nuevas.

Inventariar primero `schema_migrations` y comparar manualmente el checksum con el archivo. Si la versión ya está registrada y coincide, verificar estructura sin reaplicarla. Con respaldo conjunto de base y archivos privados, pausa de escrituras y prerrequisitos comprobados, aplicar únicamente si está pendiente:

```powershell
npm run db:migrate -- 056-service-order-photos-pending.sql
```

Comprobar tablas `service_order_photo`, `service_pending_item`, `service_pending_event`, índice `service_order_photo_slot_idx` y trigger habilitado `preserve_published_pending_trigger`, además del registro y checksum. La evidencia de la instalación local se conserva en la [nota de entrega](../historico/2026-10-30/fotos-pendientes-os.md).

Las fotos comparten la carpeta privada del expediente y conservan versiones retiradas. Respaldar esa carpeta completa y las tres tablas junto con el resto de la base. `npm run test:service-pending` prueba migración y flujo con datos ficticios en un esquema temporal; no equivale a demostrar la restauración de un respaldo operativo.

### Garantías: migración 057

`057-service-order-warranty.sql` agrega finalidad PAR, clasificación/origen de O/S, FK de origen, restricciones e índices. Las filas existentes reciben Comercial/Normal; no se recalculan cantidades, importes, horas, estados ni fechas. El esquema consolidado incluye la misma estructura para bases vacías.

Con prerrequisitos hasta 056 comprobados, respaldo conjunto, pausa de escrituras e inventario de versión/checksum, aplicar solo si está pendiente, antes de servir el código que consulta los nuevos campos:

```powershell
npm run db:migrate -- 057-service-order-warranty.sql
```

Verificar columnas y restricciones, FK de origen, índices y los triggers habilitados `preserve_par_purpose_trigger`, `normalize_reference_par_item_trigger`, `validate_service_order_warranty_trigger` y `validate_warranty_equipment_trigger`. Comparar checksum registrado con el archivo; no usar --force ni editar una migración aplicada. Coordinar reinicio de las instancias con el código actualizado.

`npm run test:service-order-warranty` comprueba el flujo y migración en un esquema aislado con datos ficticios. La [nota de entrega](../historico/2026-10-31/ordenes-garantia.md) conserva la evidencia de la base local y los límites de respaldo; no acredita otros servidores.

### Disponibilidad por motivo: migración 058

`058-technician-unavailability.sql` renombra las tablas de vacaciones y su FK de historial, agrega `reason_type` y conserva datos/snapshots. El código actualizado utiliza exclusivamente los nombres nuevos. Inventariar prerrequisitos hasta 057, respaldar base y carpeta privada, comparar checksum y coordinar todas las instancias: evitar servir código anterior después del cambio de nombres.

Con escrituras detenidas, aplicar únicamente si está pendiente:

```powershell
npm run db:migrate -- 058-technician-unavailability.sql
```

Comprobar `technical_unavailability`, `technical_unavailability_event.unavailability_id`, sus FK/índices/secuencia y restricciones de categoría/Otros; verificar ausencia de las tablas antiguas, IDs/fechas/actores/cancelaciones y snapshots intactos. Todos los registros previos deben tener Vacaciones. No modificar 055 ni reescribir JSON antiguos. Reiniciar con la misma versión de API/UI y recargar clientes abiertos: rutas y respuesta cambian de vacations a unavailability.

La reversión al código anterior no es compatible con los nombres nuevos y tampoco representa categorías distintas a Vacaciones. Preparar una migración correctiva o recuperación conjunta compatible que conserve los datos incorporados; no renombrar a ciegas ni restaurar sobre escrituras nuevas. `npm run test:technician-unavailability` verifica la migración y los flujos con datos ficticios aislados. La evidencia local se registra en [histórico](../historico/2026-10-31/disponibilidad-tecnicos.md).

### Vendedores: migración 059

`059-vendor.sql` crea la tabla `vendor` para el catálogo Saint. No modifica clientes, PAR ni órdenes. En una base existente se aplica una sola vez, con respaldo previo, si aún no está registrada:

```powershell
npm run db:migrate -- 059-vendor.sql
```

`db/schema.sql` incluye la misma tabla para instalaciones vacías. No reaplicar el esquema consolidado sobre datos existentes ni editar 059 después de aplicarla. Comprobar la tabla, el índice parcial de cédula, el trigger `vendor_set_updated_at` y que `status` solo acepte `'1'` y `'0'`.

## Archivos persistentes del cierre

Carpeta predeterminada: `.private/service-order-documents`. Para servicio permanente configurar una ruta absoluta persistente fuera del directorio sustituido al desplegar. La cuenta Node necesita leer y escribir; todas las instancias deben compartir base y carpeta.

No ubicar archivos en public/.next/out ni publicarlos mediante el servidor web. Mantener `public/Logo.png` para PDFs de reportes; ese logo es distinto de los archivos privados del expediente.

Si hay proxy delante, admitir el tamaño multipart requerido: límite Next 12 MB, cuerpo de ruta 11 MB y archivo individual 10 MiB. Cambiar la ruta de almacenamiento requiere copiar archivos conservando storage_key y reiniciar con la nueva configuración; la variable no mueve contenido.

Detalle de formato, retiro, reemplazo y hash en [cierre](../cierre-orden-servicio.md).

## Respaldo consistente

1. Coordinar una ventana sin escrituras.
2. Respaldar PostgreSQL, incluida la trazabilidad de migraciones.
3. Copiar toda la carpeta privada, incluidos archivos retirados.
4. Conservar de forma protegida la configuración necesaria para recuperar el servicio, sin incorporarla a Git.
5. Registrar fecha y versión del código a la que corresponde el conjunto.
6. Reanudar escrituras tras completar la copia.

La base por sí sola no contiene los documentos. Un archivo huérfano puede deberse a una interrupción entre escritura en disco y confirmación de metadatos. No limpiarlo automáticamente: cotejar referencias, detener escrituras y respaldar antes de una acción administrativa autorizada.

## Restauración

Preparar una instancia aislada → restaurar base y carpeta del mismo conjunto → configurar conexión/ruta/permisos → comprobar versión y acceso autorizado a archivos → validar relaciones → habilitar servicio.

La comprobación de recuperación debe incluir expediente, archivos retirados, hashes, horas y relaciones PAR/O/S. Aquí se describe el procedimiento; no se realizó una restauración ni una comprobación contra base real en esta entrega documental.

## Herramientas y evidencia

`npm run db:validate` invoca validación de datos; `npm run db:test-schema` comprueba el esquema en transacción temporal; `npm test`, `npm run lint`, `npm run build` y `npm run verify` tienen sus comandos en package.json.

Consultar los scripts antes de ejecutarlos y hacerlo en el entorno autorizado. No afirmar resultados actuales a partir de una nota de entrega anterior. No guardar respaldos, secretos o salidas con datos reales en documentación.
