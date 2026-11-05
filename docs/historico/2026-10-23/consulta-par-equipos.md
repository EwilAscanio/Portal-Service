# Consulta del PAR con trabajo por equipo

> Entrega del 23 de octubre de 2026. Referencia histórica; contrato vigente en [PAR](../../modulos/par.md).

## Alcance implementado

- El listado y las tarjetas abren `ParConsultationModal`, que solicita el PAR completo al consultar.
- Se reutiliza `ParPreview` en el modal y en la página de detalle.
- Cada equipo muestra identificación y trabajo propio, conservando saltos de línea y señalando ausencias en registros anteriores.
- Se elimina la presentación de observaciones generales del modal. No se eliminan campos ni datos de la base.
- Se incorporan carga, error, reintento y descarte de respuestas de consultas cerradas o sustituidas.
- El modal añade ancho y desplazamiento de contenido; se mantienen Cerrar y Abrir PAR.

## Fuentes y efectos

`components/par/ParConsultationModal.jsx`, `components/par/ParPreview.jsx`, `app/(dashboard)/par/page.jsx` y `components/ui/Modal.jsx`.

La consulta consume el endpoint y repositorio de detalle existentes. El cambio compartido de presentación también se refleja en `/par/[id]`. No hay migraciones, escrituras de datos, modificaciones de permisos ni cambios al presupuesto, descuento, asignaciones, cierre o impresión.

La guía PAR, AI_CONTEXT y APP_DEPENDENCIES documentan la fuente de los trabajos y los consumidores de la vista compartida.

## Límites de comprobación

Revisión estática del flujo de carga, presentación y conservación de contratos. ESLint sobre los cuatro archivos de interfaz de esta entrega terminó sin errores ni advertencias. No se ejecutaron pruebas funcionales, automatizadas ni operaciones sobre la base de datos en esta entrega. La comprobación visual en el navegador queda pendiente.

## Seguimiento aprobado: accesos de consulta consistentes

En un ajuste posterior del mismo día se unificaron los cuatro accesos del listado: tarjeta, Ver PAR de la tarjeta, fila y ojo de la tabla. Todos abren el mismo modal mediante la selección del PAR. Se retiró `onNavigate` de `ParCardGrid` y se sustituyó **Abrir PAR** por **Gestionar PAR** (`onManage`), que mantiene la navegación al detalle.

Los controles de consulta indican que abren un diálogo. La tarjeta deja que sus botones internos gestionen el teclado; el ojo de la tabla evita propagar esa activación a la fila. Se conserva `ParPreview` como contenido compartido.

Fuentes del ajuste: `components/par/ParCardGrid.jsx`, `components/par/ParConsultationModal.jsx` y `app/(dashboard)/par/page.jsx`. Se actualizaron la guía PAR y el mapa de dependencias. ESLint de esos tres archivos finalizó sin errores ni advertencias; `git diff --check` no encontró errores de formato. No se ejecutaron pruebas funcionales ni comprobación visual en el navegador para este ajuste.
