# Cierre de órdenes de servicio

## Alcance

Una O/S conserva su programación y reúne el resultado del trabajo de campo en su **Expediente de cierre**. La acción final se llama **Cerrar O/S**. El estado interno sigue siendo `Completada`, compatible con PAR, calendario, filtros y reportes.

## Preparar una orden

1. Seleccionar un PAR aprobado.
2. Seleccionar al menos un equipo del PAR. Una O/S puede atender solo una parte de sus equipos.
3. Distribuir las horas **estimadas** de los renglones de mano de obra entre uno y tres técnicos, indicando el responsable.
4. Guardar y seguir el flujo de aprobación e inicio del servicio.

Cliente, planta y contacto siguen procediendo del PAR. La descripción de trabajo, vista previa e impresión contienen los equipos seleccionados. La selección general se puede cambiar mientras la orden esté pendiente.

## Documentos por equipo

Durante **En Proceso**, abrir **Cerrar O/S** o **Expediente de cierre**. Cada equipo requiere resolver estas cuatro categorías:

- Reporte de Servicio.
- Check List de Trabajo.
- Lista de Verificación Previa.
- Lista de Verificación Posterior.

Cada categoría se resuelve adjuntando al menos un archivo vigente o marcando **No aplica** con una justificación de al menos cinco caracteres. Los estados visibles son Pendiente, Adjunto y No aplica.

Se admiten varios archivos por categoría, PDF, JPG/JPEG o PNG, de hasta **10 MB por archivo**. La selección múltiple se carga de uno en uno: si un archivo falla, los anteriores que terminaron permanecen guardados. Un archivo fallido no cuenta para cerrar.

Los archivos se pueden abrir y descargar. **Retirar** exige un motivo y conserva el contenido en el historial. **Reemplazar** carga una nueva versión y retira la anterior en una sola operación; si falla, la anterior continúa vigente. Retirar el último archivo deja la categoría pendiente. Antes de marcar No aplica deben retirarse los archivos vigentes; antes de adjuntar debe quitarse No aplica.

El historial identifica el archivo, tamaño, usuario, fecha y retiro/reemplazo. Las justificaciones de No aplica también conservan su historial.

## Registrar horas reales

La tabla muestra los renglones de mano de obra y los técnicos **ya programados**. No se incorporan otros técnicos durante el cierre.

- Registrar expresamente las horas reales reportadas, hasta dos decimales. Los campos no se rellenan automáticamente con la estimación.
- Si un técnico no participó en una asignación, registrar **0** y explicar el motivo.
- Las horas reales corresponden al técnico y renglón del PAR. Dos técnicos que trabajan cuatro horas cada uno representan ocho horas de mano de obra.
- Un mismo técnico puede tener varias asignaciones; cada una mantiene su producto, descripción y tipo de mano de obra.
- Guardar las horas y observaciones antes de cerrar. Guardar un borrador no libera presupuesto.
- Si alguna asignación supera su estimación, o las horas reales superan el saldo del renglón del PAR, justificar el exceso antes de cerrar.

La programación, los técnicos originales y las estimaciones se conservan. Las horas reales no se deducen de las fechas programadas, del momento del cierre ni del multiplicador comercial. El PAR mantiene sus cantidades cotizadas y totales monetarios. No se calculan comisiones ni pagos en esta etapa.

## Saldo de horas

El saldo se calcula **por renglón del PAR**. Dos renglones con el mismo producto tienen presupuestos independientes:

`Disponible = cantidad presupuestada − estimaciones de órdenes abiertas − horas reales de órdenes cerradas con expediente`.

Las órdenes completadas antes de esta implementación, sin horas reales confirmadas, conservan su reserva histórica. Las canceladas no consumen saldo.

| Estimación de la O/S | Horas reales | Resultado al cerrar |
|---:|---:|---|
| 8 | 6 | Libera 2 horas del mismo renglón |
| 8 | 8 | Mantiene el consumo |
| 8 | 10 | Consume 2 adicionales; exige justificación |

Se permite cerrar aunque el consumo supere el presupuesto, con justificación. La interfaz identifica el exceso y muestra cero horas disponibles para nuevas asignaciones del renglón agotado. Las estimaciones de otras órdenes existentes se conservan. Los saldos de PAR con revisiones históricas pendientes son provisionales y las nuevas reservas siguen bloqueadas hasta resolverlas.

## Permisos

| Acción | Superadministrador | Administrador | Supervisor | Coordinador | Técnico |
|---|:---:|:---:|:---:|:---:|:---:|
| Consultar expediente y archivos | Sí | Sí | Sí | Sí | Sí |
| Confirmar equipos de órdenes anteriores | Sí | Sí | Sí | Sí | No |
| Adjuntar, retirar y reemplazar documentos | Sí | Sí | Sí | Sí | No |
| Justificar No aplica y registrar horas reales | Sí | Sí | Sí | Sí | No |
| Cerrar O/S | Sí | Sí | Sí | No | No |

Las escrituras requieren que la O/S esté **En Proceso**. Los permisos se obtienen de la sesión y se validan en servidor. Después del cierre, documentos, horas y observaciones quedan en consulta. No existe reapertura en esta entrega.

## Confirmar el cierre

La pantalla muestra los requisitos pendientes y exige:

1. Equipos confirmados y al menos uno seleccionado.
2. Cuatro categorías resueltas por equipo, con archivos vigentes disponibles o No aplica justificado.
3. Revisión de las horas anteriores de la orden, si corresponde.
4. Horas reales de todas las asignaciones, con explicación de los ceros.
5. Justificación de los excesos.
6. Cambios de horas y observaciones guardados.

Al confirmar, el servidor valida otra vez, registra usuario y fecha, fija el total de horas reales, cambia el estado a Completada y actualiza el consumo de horas mediante una sola transacción. Si otra persona modificó el expediente, se debe actualizar antes de continuar; la pantalla avisa antes de descartar horas locales sin guardar.

El calendario conserva la programación original. Vista previa, impresión, tabla, tarjetas y CSV distinguen estimaciones de horas reales confirmadas.

## Órdenes anteriores

- Las órdenes abiertas de antes de la migración requieren confirmar los equipos: la interfaz anterior mostraba todos los del PAR. Las pendientes pueden seleccionarlos en su edición; las órdenes en proceso los confirman en el expediente.
- Las seis órdenes que ya estaban completadas al aplicar la migración quedaron identificadas como cierres anteriores. No se reabrieron ni se inventaron documentos, usuarios de cierre o horas reales.
- Las revisiones históricas de horas introducidas en la migración 051 siguen vigentes.

## Almacenamiento y operación en servidor propio

No hay servicios de almacenamiento externos ni dependencias npm nuevas.

Variable opcional **`SERVICE_ORDER_DOCUMENTS_DIR`**: ruta de una carpeta privada persistente. En el entorno local, sin configurarla, se usa `.private/service-order-documents` dentro del proyecto; está excluida de Git. La carpeta se crea con la primera carga.

Para un despliegue permanente, configurar una ruta absoluta fuera de la carpeta que se reemplaza al desplegar. Ejemplo en Windows:

```dotenv
SERVICE_ORDER_DOCUMENTS_DIR=D:/MaquitechData/service-order-documents
```

La cuenta que ejecuta Node necesita lectura y escritura sobre esa carpeta. No publicarla por IIS, Nginx u otro servidor web. No usar `public`, `.next` ni `out`; el almacenamiento rechaza esas ubicaciones dentro del proyecto. Todas las instancias deben compartir la misma carpeta y base de datos.

Si se cambia la ruta después de cargar documentos, copiar primero todo el contenido a la nueva ubicación, conservar los nombres internos y actualizar la variable al reiniciar el servicio. La variable no mueve archivos por sí sola.

La base conserva metadatos, identificadores y hashes SHA-256; los nombres internos de archivos son UUID. Las descargas pasan por rutas autenticadas, con `Cache-Control: private, no-store`, contenido tipado y comprobación del hash. El nombre original nunca se usa como ruta en disco. El servidor revisa extensión, MIME, firmas de contenido y límite de tamaño; esta comprobación de formato no es un servicio antivirus.

Next usa `experimental.proxyClientMaxBodySize: "12mb"` para admitir 10 MB de archivo más multipart. La ruta limita a 11 MB el cuerpo recibido y a 10 MB el archivo. Si hay un proxy delante, su límite debe permitir al menos 12 MB. Reiniciar Next después de cambiar la configuración.

### Respaldos y recuperación

Respaldar conjuntamente PostgreSQL y la carpeta privada, incluyendo archivos retirados. Un respaldo de base de datos por sí solo no contiene los documentos.

Para una copia consistente, detener temporalmente las escrituras del portal, respaldar ambos y reanudar. Al restaurar, recuperar ambos conjuntos y la configuración de la ruta. No borrar archivos retirados: forman parte del historial.

El contenido se escribe y sincroniza en disco antes de confirmar sus metadatos. Una caída o fallo de base puede dejar un archivo sin referencia; no se elimina automáticamente porque el resultado de un COMMIT interrumpido puede ser incierto. Antes de una limpieza administrativa, cotejar `storage_key` con la base, detener escrituras y respaldar. La aplicación nunca usa archivos sin referencia para satisfacer requisitos de cierre.

## Contrato técnico

- Migración: `db/migrations/052-service-order-closure.sql`, incluida en `db/schema.sql` para instalaciones nuevas. No reaplicar migraciones antiguas ni ejecutar el esquema consolidado sobre una base existente.
- Tablas nuevas: `service_order_equipment`, `service_order_closure_requirement`, `service_order_closure_file`, `service_order_closure_event`.
- `service_order_labor_allocation.hours` y `service_order.worked_hours` conservan las estimaciones. `allocation.actual_hours` permite borradores; `service_order.actual_hours` solo se fija al cerrar.
- `closed_at` distingue una ejecución confirmada del historial. `closure_legacy` identifica cierres anteriores. `closure_revision` impide sobrescribir un expediente que cambió.
- `GET /api/service-order/[id]/closure`: expediente, asignaciones, requisitos, historial y presupuesto.
- `PUT /api/service-order/[id]/closure`: acciones `equipment`, `hours`, `requirement`, `close`, todas con `revision`.
- `POST /api/service-order/[id]/closure/files`: multipart con `file`, `equipmentId`, `category`, `revision` y `replaceId` opcional. Un archivo por petición.
- `GET /api/service-order/[id]/closure/files/[fileId]`: apertura autenticada; `?download=1` descarga. Incluye consulta de archivos retirados.
- `DELETE` en la misma ruta: retiro lógico, con `revision` y `reason`.
- El PUT general que intenta cambiar a Completada responde `ORDER_CLOSURE_REQUIRED`: debe usarse el expediente.
- Crear una orden exige `equipmentIds`; editar una pendiente puede actualizarlos. El servidor comprueba pertenencia al PAR, conserva snapshots y deriva descripción y equipo principal.
- Orden de bloqueos de escritura: PAR → O/S → datos de cierre. Las lecturas del saldo se hacen después de adquirir el bloqueo del PAR. Cancelaciones, estimaciones y cierre usan la misma coordinación.
- La familia de rutas conserva el permiso general `/api/service-order`; las nuevas rutas vuelven a validar sesión activa y rol. No hay entrada adicional de menú: se accede desde la orden existente.
- No hay cálculo de comisiones ni cambios a la agenda original.

Para otra base existente, después de un respaldo, ejecutar:

```powershell
npm run db:migrate -- 052-service-order-closure.sql
```

La migración se aplicó en la base configurada del entorno el 22 de octubre de 2026, con respaldo previo. Las comprobaciones de entrega se registran en `AI_CONTEXT.md`.
