# Creación de garantía desde una O/S completada

> Entrega del 31 de octubre de 2026. Registro histórico, no normativo. Contrato vigente en [garantías](../../modulos/garantias.md).

## Alcance realizado

- La acción **Crear O/S de garantía** abre un formulario con clasificación Garantía, O/S original y PAR fijos. Muestra el código de la original como enlace y omite el selector de origen. El motivo permanece obligatorio y editable.
- Título y botón de guardado identifican la garantía. Una fuente inválida o no disponible, o un fallo de carga de catálogos, bloquea la creación; no transforma el formulario en una orden Normal.
- Las garantías registradas y externas omiten OC/cotización en creación, edición, vista previa e impresión. El repositorio rechaza agregar o cambiar esas referencias y conserva los valores históricos cuando se editan otros campos.
- La entrada general conserva Normal/Garantía y ambos orígenes. Se mantienen validaciones de permisos, O/S Completada, mismo PAR, equipos permitidos, programación y horas separadas.

No requiere nuevas dependencias, tablas ni migración SQL. No se modificaron registros operativos ni se ejecutó una limpieza de referencias antiguas.

## Fuentes modificadas

`app/(dashboard)/ordenes/nueva/page.jsx`, `ServiceOrderForm.jsx`, `ServiceOrderPreview.jsx`, `ServiceOrderPrintSheet.jsx`, los repositorios de O/S y garantías, las pruebas de garantía y su comando en `package.json`.

Se actualizaron `AI_CONTEXT.md`, `APP_DEPENDENCIES.md`, las guías de garantías y O/S, datos y relaciones y el índice histórico. La guía de garantías es la fuente principal de esta regla; los documentos de entrada solo resumen su efecto transversal.

## Evidencia de comprobación

- `npm run test:service-order-warranty`: presentación del formulario y de consulta/impresión; integración con esquema aislado para garantías registradas/externas, permisos, equipos, identidad, conservación de referencias antiguas, presupuesto, reprogramación, cierre y reportes. Correcto.
- `npm test`: suite general correcta.
- `npm run lint`: sin errores; tres advertencias preexistentes en `app/layout.jsx`, `components/par/ParForm.jsx` y `lib/axios.js`.
- `npm run build`: compilación de producción correcta.
- Navegador sobre servidor temporal y datos ficticios: desde el botón de una O/S Completada se verificaron los campos fijos, se seleccionó equipo, trabajo, técnico y horas, y se creó una garantía Pendiente vinculada a la original. Consulta y edición no mostraron OC/cotización. Un origen inválido mostró error y deshabilitó el guardado. La entrada general conservó la selección de garantía externa.

La sesión de prueba se cerró, el servidor temporal se detuvo y la integración eliminó su esquema aislado. Las capturas locales de verificación contienen datos ficticios y permanecen fuera del seguimiento Git. No se comprobó manualmente la impresión física; su presentación condicional se verificó con renderizado automatizado. Estos resultados corresponden a esta ejecución, no sustituyen validaciones de un despliegue posterior.
