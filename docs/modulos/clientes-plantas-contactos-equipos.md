# Clientes, plantas, contactos y equipos

> Vigente · revisión base: 22 de octubre de 2026; consulta de contactos actualizada el 25 de octubre. [Índice](../README.md)

## Relaciones que alimentan al PAR

Cliente → plantas; cada contacto y equipo pertenece a un cliente y una planta compatibles. El PAR selecciona ese ámbito. La O/S lo hereda del PAR y selecciona equipos ya incluidos en él.

Las FK compuestas impiden mezclar ámbitos aunque existan por separado los UUID. Cambiar el propietario o ubicación de un catálogo requiere revisar referencias históricas; no equivale a cambiar un texto descriptivo.

## Clientes y sincronización Saint

Fuentes: `app/api/client/route.js`, `app/api/client/sync/route.js`, `lib/saint-api.js`, `lib/saint-status.js`, `lib/repositories/client.repository.js`.

| Etapa | Entrada / actor | Operación | Resultado e impacto |
|---|---|---|---|
| Consultar | Sesión con acceso a clientes | GET del catálogo local | No llama a Saint por cada lectura |
| Solicitar sincronización | Superadministrador, Administrador o Supervisor | API Saint mediante configuración de servidor | Recibe datos externos |
| Normalizar y validar | Payload externo | Código, identidad, estado y estructura válidos | Un payload inválido no se acepta como actualización parcial |
| Sincronizar | Datos válidos | Upsert por codclie dentro de transacción y bloqueo asesor | Preserva UUID existentes y actualiza datos comerciales |
| Finalizar | Resultado de operación | integration_sync_run, conteos y fechas | Completed o Failed; trazabilidad de integración |

Los estados persistidos son `'1'` (activo) y `'0'` (inactivo). No se desactiva a un cliente por estar ausente en una respuesta: se usa su estado explícito. Las relaciones históricas no se eliminan al inactivarlo. Nuevas selecciones operativas comprueban actividad.

La URL Saint es el origen del servicio; la integración construye las rutas y envía la clave en `x-api-key`. No publicar valores de `SAINT_API_KEY` ni respuestas reales en documentación. El cliente se administra desde Saint; no hay CRUD comercial libre en la ventana del portal.

## Plantas

Fuentes: `lib/repositories/plant.repository.js`, `app/api/plant/`, `lib/validators/catalog.schema.js`.

| Etapa | Regla | Salida / fallo |
|---|---|---|
| Crear | Cliente activo, nombre y código requeridos por el contrato | Nueva planta; unicidad según esquema |
| Editar | Validar cliente si cambia y conservar relaciones compatibles | Actualiza plant; FK pueden impedir reasignación referenciada |
| Consultar/filtrar | Por cliente o búsqueda | Alimenta formularios de contactos, equipos y PAR |
| Eliminar | DELETE físico | Solo procede si las FK no conservan referencias bloqueantes |

Código de planta se identifica dentro del cliente. No existe estado Activa/Inactiva ni aprobación de plantas en el modelo actual. Nombres y dirección se leen como datos actuales en varias consultas.

## Contactos

Fuentes: `lib/repositories/contact.repository.js`, `app/api/contact/`, `lib/validators/catalog.schema.js`.

Alta → selección cliente/planta → validación de pertenencia y cliente activo → persistencia → consulta/edición → eliminación si no está referenciado.

Campos principales: nombre, departamento, teléfono y correo. El campo vigente es `department`, no `position`. Actualizar vuelve a validar la combinación de cliente y planta. Eliminar es físico y las FK protegen referencias PAR/O/S. No hay estado de aprobación ni baja lógica de contacto.

Los nombres/contactos consultados por JOIN pueden reflejar ediciones posteriores; no prometer congelación de toda la identidad comercial.

### Consulta compartida desde tabla y cards

Fuentes de interfaz: `app/(dashboard)/contactos/page.jsx`, `components/catalog/ContactCardGrid.jsx`, `components/catalog/ContactConsultationModal.jsx`; componentes compartidos `DataTable`, `RowActions`, `Modal` y `ReadonlyField`.

Los usuarios con acceso a Contactos (Superadministrador, Administrador, Supervisor y Coordinador) consultan el mismo detalle desde el clic en una fila, el clic en una card o **Ver contacto** en el menú de la tabla. La página conserva el contacto seleccionado y presenta una sola instancia de `ContactConsultationModal`; las cards delegan la apertura mediante `onView`.

| Etapa | Acción | Resultado / siguiente paso |
|---|---|---|
| Cargar | Leer contactos, clientes y plantas con las APIs existentes | Listado común a ambas vistas; fallo de carga se informa en pantalla |
| Filtrar | Buscar por nombre, departamento, cliente, planta, teléfono o email; seleccionar cliente | Ambas vistas reciben la misma lista filtrada; los criterios se conservan al cambiar de vista |
| Consultar | Activar fila/card o Ver contacto | Modal de solo lectura con nombre, cliente, planta, departamento, teléfono y email; no escribe datos |
| Pasar a edición | Editar desde el detalle o desde las acciones del listado | Se cierra la consulta y se abre el formulario existente con el mismo contacto |
| Guardar | Validar y enviar mediante la API existente | Al guardar correctamente se cierra el formulario y se recarga el listado; una nueva consulta refleja esos datos. Si falla, el formulario muestra el error |
| Solicitar eliminación | Eliminar desde tabla/card | Solo abre la confirmación existente; cancelar no escribe. Confirmar sigue sujeto a las restricciones referenciales del servidor |
| Cerrar consulta | Cerrar, X, Escape o fondo del modal | Regresa al listado sin cambiar el contacto ni sus filtros |

El detalle usa los seis campos ya incluidos por `GET /api/contact`, con nombres de cliente/planta procedentes de JOIN. Abrirlo no realiza otra consulta al servidor ni garantiza actualización en tiempo real frente a cambios de otros usuarios. Guardar desde esta página vuelve a cargar los datos.

Los campos opcionales vacíos muestran `—`. Los textos largos se ajustan a varias líneas y el cuerpo del modal admite desplazamiento vertical; los botones permanecen accesibles. Así se pueden consultar teléfono, departamento y email incluso cuando la tabla oculta esas columnas por el ancho de pantalla. El formulario de edición también permite desplazamiento y los filtros se distribuyen en varias líneas en pantallas pequeñas.

Enter o espacio sobre una fila/card abre la consulta; sus botones internos conservan su propia acción. La página aísla clic y teclas de activación del menú de fila, y la card comprueba el origen del evento de teclado. Esto evita abrir el detalle al editar o eliminar, sin cambiar los componentes compartidos de otros módulos. El detalle enfoca Cerrar al abrir y conserva el cierre con Escape del modal común.

La tabla pagina **8 registros** y permite ordenar por columnas; las cards paginan **12** y conservan el orden recibido (el repositorio ordena por nombre). El orden elegido en la tabla no se transfiere a cards. Cada vista administra su página y al cambiar de vista comienza en la primera; búsqueda y filtro por cliente sí permanecen. Estas diferencias son de presentación y no cambian los contactos disponibles ni sus acciones.

Esta consulta mantiene los contratos, permisos y relaciones cliente/planta/contacto/PAR/O/S existentes. No incorpora endpoints, tablas, migraciones ni una auditoría nueva. Comprobaciones puntuales: [entrega del 25 de octubre de 2026](../historico/2026-10-25/consulta-contactos.md).

## Equipos

Fuentes: `lib/repositories/equipment.repository.js`, `app/api/equipment/`, `lib/validators/operational.schema.js`, `db/schema.sql`.

| Etapa | Regla | Consecuencia |
|---|---|---|
| Crear | Cliente/planta compatibles; serial único y datos requeridos | Disponible para selección PAR |
| Editar datos técnicos | Validación de formulario/API | Catálogo actualizado; copias de PAR/O/S permanecen según su snapshot |
| Cambiar cliente/planta | Revisar referencias y pertenencia | API comprueba referencias al cambiar cliente; FK compuestas también protegen ámbito |
| Cambiar estado | Valor permitido | Describe situación física; no transiciona PAR/O/S |
| Dar de baja | DELETE del endpoint | Cambia a Fuera de Servicio; conserva registro |

Estados: Operativo, En Mantenimiento, Fuera de Servicio, Mudado, Desechado y Validar. Son valores de catálogo; no hay una máquina de transiciones por etapas entre ellos.

La UI usa “Tipo de Equipo” para `name`; conserva marca, modelo, serial, ubicación, consorcio, HP y presión. No documentar campos de próximas/últimas fechas de mantenimiento como contrato vigente: fueron retirados.

PAR guarda selección y trabajo por equipo; O/S guarda su propio subconjunto y snapshot para el expediente. Un cambio de estado del equipo no cierra órdenes ni carga documentación automáticamente.

## Permisos, fallos y trazabilidad

Consultar clientes está disponible a todos los roles; sincronizar tiene restricción adicional. Plantas/contactos se gestionan con acceso administrativo/operativo; equipos también admiten Técnico en el mapa de rutas. Matriz completa en [seguridad](../arquitectura/seguridad-permisos.md).

Unicidad, referencias incompatibles y datos inválidos pueden impedir guardar o eliminar. No todos los endpoints traducen las mismas restricciones SQL al mismo mensaje público. No afirmar que un botón deshabilitado sea la única defensa.

Estos catálogos conservan fechas y Saint tiene registro de sincronización; no existe un historial universal por campo de todas sus ediciones. Importaciones también pueden alterarlos: consultar [su flujo](importaciones.md) antes de cambiar contratos.
