# Autenticación, permisos y datos sensibles

> Vigente · actualizado el 31 de octubre de 2026: garantías y privacidad de la disponibilidad. [Índice](../README.md)
> Fuentes: auth.js, proxy.js, lib/permissions.js, políticas PAR/O/S/cierre y rutas correspondientes.

## Autenticación y autorización

Credentials valida login, contraseña con bcrypt y estado Activo. El JWT contiene identidad, rol y estado; callbacks posteriores consultan usuario actual. Si falta, está inactivo o falla la lectura, se marca inactivo y se elimina el rol.

`proxy.js` protege familias de rutas con `lib/permissions.js`. La coincidencia es ruta exacta o descendiente con “/”; `/api/par` no captura `/api/par-template`. Una ruta desconocida tiene lista vacía y se deniega, incluso para Superadministrador.

Ocultar controles o navegación no sustituye validación del servidor. Las acciones sensibles añaden reglas a la autorización general; Superadministrador no omite estado, relaciones, documentos ni presupuesto.

## Acceso a páginas

SA = Superadministrador; A = Administrador; S = Supervisor; C = Coordinador; T = Técnico; U = Usuario.

| Página / familia | SA | A | S | C | T | U |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard, clientes, perfil | Sí | Sí | Sí | Sí | Sí | Sí |
| PAR y plantillas, productos, plantas, contactos, técnicos, reportes, vendedores | Sí | Sí | Sí | Sí | — | — |
| Órdenes, equipos, calendario | Sí | Sí | Sí | Sí | Sí | — |
| Lista de pendientes | Sí | Sí | Sí | Sí | Solo de sus O/S | — |
| Usuarios | Sí | Sí | — | — | — | — |
| Configuración | Sí | — | Sí | — | — | — |
| Importaciones | Sí | — | — | — | — | — |

Las APIs correspondientes tienen mapas propios. Excepciones relevantes:

- Sincronizar clientes, sincronizar vendedores y consultar ubicación: SA/A/S. Consultar `/api/vendor`: SA/A/S/C.
- Leer tasa en `/api/configuration/exchange-rate`: SA/A/S/C; configuración general: SA/S.
- Dashboard, búsqueda global, notificaciones y consulta clientes: todos los roles.
- Gestión de roles: SA/A.
- Las familias `/api/service-order` y `/api/equipment` admiten también T.

## Permisos por acción del núcleo

| Acción | Roles / condiciones adicionales |
|---|---|
| Aprobar/rechazar PAR | SA/A/S; transición permitida |
| Editar PAR Creado | Acceso PAR y sin O/S no canceladas |
| Editar PAR Aprobado | SA/A/S y sin O/S no canceladas |
| Crear/editar pendiente/iniciar/cancelar O/S Normal | Permiso de familia más estado y validaciones; no hay restricción general a “solo propias” |
| Crear/editar pendiente/iniciar/cancelar Garantía | SA/A/S/C activos, comprobados en base por el repositorio, más estado y origen válidos |
| Aprobar O/S | SA/A/S; horario, técnicos y confirmación de conflicto si procede |
| Revisar reparto histórico | SA/A/S; flujo específico, motivo y roster original |
| Consultar expediente y archivos | SA/A/S/C/T |
| Preparar horas, archivos y No aplica | SA/A/S/C; En Proceso |
| Preparar fotos y borradores de pendientes | SA/A/S/C; T vinculado y programado en esa O/S; En Proceso |
| Consultar nuevas fotos, pendientes y resumen | SA/A/S/C; T solo de sus O/S; U sin acceso |
| Completar pendientes publicados | SA/A/S/C; Pendiente, solución y revisión actual |
| Cerrar O/S | SA/A/S; requisitos completos y revisión actual |
| Registrar/modificar/cancelar no disponibilidad y consultar categorías/notas/historial | SA/A/S; motivo, fechas, revisión y conflictos en servidor |
| Consultar períodos como Coordinador | Fechas y bloqueo; respuesta sin categoría/notas/justificaciones/eventos |
| Reprogramar O/S Aprobada antes de iniciar | SA/A/S; motivo, revisión actual, nueva aprobación; mantiene ámbito y total por renglón |
| Agenda de T | Solo técnico vinculado a su usuario, forzado por servidor |
| Importar | SA; confirmación del lote propio |

## Límites actuales que afectan interpretación

El alcance “solo agenda propia” no está implementado como filtro universal de O/S. La búsqueda global tampoco filtra cada grupo de resultados según el permiso de su módulo. Esto debe considerarse al evaluar exposición de datos; está registrado como [observación pendiente](../pendientes-documentados.md), sin cambiar permisos en esta reorganización.

No hay un sistema de acceso de clientes externos ni un modelo documentado de aislamiento por empresa. Reportes los generan usuarios del sistema, que pueden entregar los PDFs al cliente.

## Tratamiento de datos

| Información | Regla documental y operativa |
|---|---|
| Credenciales, claves API, AUTH_SECRET y cadena de conexión | Mantener fuera de Git/documentación; usar variables de entorno sin publicar valores |
| Teléfonos, correos, cédulas, RIF y direcciones | Ejemplos ficticios; revisar exposición en consultas, exports y logs |
| Precios, costos y presupuestos | Datos comerciales; un filtro visual no prueba restricción de API |
| Archivos de campo y PDF entregable | Acceso autenticado en portal; el archivo descargado contiene datos que salen del sistema |
| Motivo de no disponibilidad y detalle administrativo | Solo SA/A/S en gestión; calendario y catálogos/selectores de cualquier rol exponen únicamente fechas/bloqueo. Historial conserva snapshots privados |
| Respaldos | Proteger base y contenido privado, incluida su configuración de recuperación |

La documentación no debe copiar filas reales, dumps, tokens, contraseñas ni archivos privados. Describir estructura y finalidad es suficiente.

## Archivos de cierre

La carpeta privada no se publica como recurso estático. Extensión, MIME, firma, tamaño y hash se validan; el nombre interno UUID evita construir rutas con el nombre proporcionado. Apertura/descarga pasa por API autenticada con política de no caché.

Retirar conserva contenido y motivo. No aplica exige justificación. Reemplazar conserva trazabilidad. La validación de formato no constituye un antivirus ni una política de retención automática.

Las fotos admiten solo JPG/JPEG y PNG, cinco vigentes por O/S. El acceso del técnico, incluidas versiones retiradas, exige vínculo por `technical.user_id` y participación en `service_order_technician`. Este permiso específico no habilita horas, documentos por equipo, No aplica ni cierre. El servidor aplica el mismo alcance a `/api/pending`, resumen del dashboard y nuevos eventos del expediente. [Reglas y permisos de seguimiento](../modulos/pendientes.md).

Detalle técnico y recuperación: [cierre](../cierre-orden-servicio.md), [operación](../operacion/despliegue-respaldo-migraciones.md).

## Mantenimiento

Un cambio de rol requiere revisar rutas registradas, autorización por acción, sesión, navegación, consultas auxiliares y agenda. La creación de un nuevo endpoint protegido debe añadirse explícitamente al mapa aplicable. No documentar permisos deseados como si ya existieran.
