# Maquitech: contexto para trabajar con IA

> Vigente. Revisión base del 22 de octubre de 2026; actualizado el 3 de noviembre: catálogo de vendedores sincronizado desde Saint.
> Entrada de contexto; el detalle se consulta por tema en [docs/README.md](docs/README.md).
> Esta revisión es documental y estática; no certifica el estado de una base o servidor desplegado.

## 1. Qué es Maquitech

Portal interno para organizar servicios industriales. **El PAR y la Orden de Servicio (O/S) son los documentos centrales del negocio**: los catálogos los alimentan y la ejecución, el cierre, las horas y los reportes dependen de ellos.

El **PAR** define cliente, planta, contacto, equipos, trabajo y productos con cantidades y precios. Esa información sirve de base para cotizar al cliente. Los renglones marcados como mano de obra definen las horas presupuestadas. La cotización es parte del proceso comercial; el portal conserva una referencia de cotización en las O/S normales, sin un módulo autónomo de cotizaciones implementado.

El trabajo a realizar pertenece a cada equipo del PAR y se consulta junto con su identificación. El modal y la vista de detalle comparten esa presentación; las observaciones generales de cabecera no se muestran. [Consulta y fuentes de los trabajos](docs/modulos/par.md#consulta-desde-el-listado-y-vista-previa).

La **O/S** ejecuta parte del alcance de un PAR aprobado. Selecciona equipos de ese PAR, reparte horas estimadas por renglón entre técnicos y programa el servicio. Su cierre conserva documentos por equipo y las horas reales reportadas. Un PAR puede tener varias O/S. Las [garantías](docs/modulos/garantias.md) son nuevas órdenes con origen registrado o externo y horas separadas del presupuesto comercial; si no existe PAR histórico se crea un PAR de referencia, con importes y presupuesto cero.

Flujo: **Saint y catálogos → PAR → aprobación → O/S → programación y aprobación → ejecución → cierre → saldo de horas y reportes**. Véase [flujo general](docs/negocio/flujo-general.md).

## 2. Lectura según el trabajo

1. Este contexto y [APP_DEPENDENCIES.md](APP_DEPENDENCIES.md).
2. La guía del módulo y sus consumidores en el [índice](docs/README.md).
3. [Datos y relaciones](docs/arquitectura/datos-relaciones.md) y [seguridad](docs/arquitectura/seguridad-permisos.md) si afecta datos, acceso o historial.
4. Código, validadores, políticas y SQL pertinentes antes de proponer cambios.

La documentación describe lo observado; el código y el esquema versionado permiten comprobarlo. Una discrepancia se registra como tal, sin convertir una intención futura en una función existente. Las copias de [histórico](docs/historico/README.md) conservan decisiones anteriores y **no son reglas vigentes**.

## 3. Reglas que cruzan módulos

| Regla | Consecuencia | Referencia principal |
|---|---|---|
| Cliente, planta, contacto y equipos deben pertenecer al mismo ámbito | Un cambio de selección puede invalidar selecciones dependientes; servidor y FK comprueban relaciones | [PAR](docs/modulos/par.md) |
| Una O/S pertenece obligatoriamente a un PAR con estado guardado Aprobado al crearla | El vínculo no se puede cambiar; no se crean órdenes independientes | [O/S](docs/modulos/ordenes-servicio.md) |
| PAR aprobado editable por Superadministrador, Administrador o Supervisor, sin O/S no canceladas | Una O/S completada también bloquea edición; cancelar todas permite reevaluarla | [PAR](docs/modulos/par.md) |
| Estado guardado del PAR y estado visible son distintos | En Servicio y Finalizado se derivan de órdenes normales en PAR Comercial, o garantías en PAR de referencia; no usar etiquetas como transiciones manuales | [PAR](docs/modulos/par.md) |
| Descuento general del PAR: porcentaje editable, monto calculado | Se aplica al subtotal de servicios y repuestos; total_usd/total_bs son finales. Conserva permisos del PAR y no altera horas | [PAR](docs/modulos/par.md) |
| Crear garantía desde una O/S Completada fija clasificación, origen y PAR | La entrada general conserva origen externo; garantías no capturan OC/cotización y las referencias históricas no se borran | [Garantías](docs/modulos/garantias.md#creación-desde-una-os-completada) |
| Horas presupuestadas = cantidades de renglones que requieren técnico | El multiplicador comercial no interviene; no multiplicar por cantidad de técnicos | [Horas](docs/modulos/horas-tecnicos.md) |
| Solo las O/S normales reservan y consumen presupuesto, por renglón del PAR | Dos renglones con el mismo producto tienen saldos distintos | [Horas](docs/modulos/horas-tecnicos.md) |
| Una O/S distribuye estimaciones entre 1 y 4 técnicos distintos, incluido el responsable | El límite es por orden; las horas se reparten y los técnicos del cierre son los programados | [O/S](docs/modulos/ordenes-servicio.md) |
| No disponibilidad por días completos y motivo, independiente de Activo/Inactivo | Bloquea programación O/S Normal/Garantía; requiere resolver órdenes abiertas coincidentes. Categoría y notas solo para Superadministrador, Administrador y Supervisor | [Técnicos y calendario](docs/modulos/tecnicos-calendario.md#disponibilidad-del-técnico) |
| Guardar horas reales es un borrador hasta confirmar cierre | Las normales consumen reales y liberan diferencia; las garantías confirman sus horas aparte. Se justifican excesos sobre estimaciones | [Cierre](docs/cierre-orden-servicio.md) |
| Crear Expediente mantiene En Proceso; Cerrar O/S al final persiste Completada | Cuatro categorías por equipo: archivo vigente o No aplica justificado; horas completas, guardadas y permisos | [Cierre](docs/cierre-orden-servicio.md) |
| Fotos: hasta cinco por O/S; pendientes por orden completa | Técnicos programados pueden prepararlos; al cerrar se publican pendientes sin duplicarlos. Resolverlos no reabre la O/S ni cambia sus horas | [Pendientes](docs/modulos/pendientes.md) |
| Los clientes y vendedores Saint usan '1' / '0' | No compararlos con Activo/Inactivo de productos, técnicos y usuarios. El vendedor no se edita en el portal | [Catálogos](docs/modulos/clientes-plantas-contactos-equipos.md), [vendedores](docs/modulos/dashboard-busqueda-perfil.md#vendedores) |
| Historial incompleto no equivale a cero | Revisiones anteriores y cierres sin fecha real tienen tratamiento explícito | [Horas](docs/modulos/horas-tecnicos.md), [reportes](docs/reportes.md) |

No hay cálculo de comisiones o pagos. El renglón conserva el tipo de servicio cotizado y la asignación identifica a la persona; esos datos podrán apoyar un desarrollo posterior.

## 4. Arquitectura y fuentes

- Next.js App Router, React y JavaScript; versiones declaradas en `package.json`, resolución en `package-lock.json`.
- PostgreSQL con `pg`, SQL parametrizado y repositorios en `lib/repositories/`; no ORM ni Supabase como servicio.
- UI → `lib/api.js` → `app/api/` → validadores/políticas → repositorios → PostgreSQL.
- NextAuth Credentials/JWT en `auth.js`; protección de rutas en `proxy.js` y `lib/permissions.js`.
- Sistema visual compartido en `components/ui/`, estilos y tokens existentes; reutilizar antes de introducir patrones nuevos.
- Contactos comparte un solo modal de consulta entre filas, cards y Ver contacto; la página conserva selección y filtros. [Flujo y fuentes](docs/modulos/clientes-plantas-contactos-equipos.md#consulta-compartida-desde-tabla-y-cards).
- Pendientes comparte resultados paginados del servidor y modal de consulta/resolución entre tabla y cards; alternar conserva filtros, página y permisos. [Vistas de seguimiento](docs/modulos/pendientes.md#vistas-de-tabla-y-cards).
- `db/schema.sql` para instalaciones vacías; `db/migrations/` para evolución de bases existentes. No reaplicar el esquema consolidado sobre datos existentes.
- Documentos de cierre en disco privado más metadatos en PostgreSQL. PDF de reportes generado en servidor y conservado temporalmente en el navegador.

Detalle: [arquitectura](docs/arquitectura/arquitectura.md), [datos](docs/arquitectura/datos-relaciones.md), [operación](docs/operacion/despliegue-respaldo-migraciones.md).

## 5. Acceso y datos sensibles

Existen seis roles: Superadministrador, Administrador, Supervisor, Coordinador, Técnico y Usuario. Superadministrador accede a rutas registradas; sigue sujeto a reglas del negocio. Rutas desconocidas se deniegan. Aprobar PAR/O/S y cerrar O/S exige Superadministrador, Administrador o Supervisor. El Coordinador puede preparar el expediente.

La sesión incluye estado y rol, revalidados desde la base en callbacks posteriores. La agenda del rol Técnico se limita en servidor a su registro vinculado; **esa restricción no se aplica automáticamente a todo el módulo de órdenes**.

Identidad/contacto de personas, datos comerciales, credenciales y documentos de campo requieren tratarse como sensibles. No incluir valores reales, secretos, archivos privados o respaldos en documentación, ejemplos ni Git. La navegación visible no sustituye autorización de API. Véanse [permisos y límites observados](docs/arquitectura/seguridad-permisos.md).

## 6. Convenciones al cambiar el proyecto

- Leer `AGENTS.md` y la guía local de la versión de Next antes de escribir código de framework.
- Mantener contratos entre UI, `lib/api.js`, rutas, Zod, políticas, repositorios y SQL.
- No confiar en importes, horas agregadas, relaciones ni permisos enviados por el navegador.
- Preservar snapshots, claves y auditorías; no reemplazar datos ausentes por hechos inventados.
- Conservar el orden de bloqueos PAR → O/S en operaciones que afectan reservas y cierre.
- No editar migraciones ya aplicadas: diseñar una nueva cuando un cambio autorizado la requiera.
- Usar un documento principal por regla y enlaces desde los demás. Actualizar documentación y [mapa de dependencias](APP_DEPENDENCIES.md) junto al cambio correspondiente.
- Distinguir comportamiento vigente, observación pendiente e historial. [Mantenimiento documental](docs/mantenimiento-documentacion.md) define el procedimiento.

## 7. Límites conocidos

El perfil contiene guardado simulado y las notificaciones usan datos de demostración. Vendedores es un catálogo Saint de consulta; no asigna PAR ni calcula comisiones. Búsqueda global, filtros de estado PAR y algunas métricas tienen particularidades documentadas en [observaciones verificadas](docs/pendientes-documentados.md). No asumir que todas las pantallas están conectadas ni que todas las consultas aplican el mismo alcance.

Los resultados de pruebas de entregas anteriores pertenecen al histórico; no prueban el estado actual del proyecto.
