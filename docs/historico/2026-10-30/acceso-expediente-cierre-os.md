# Acceso al expediente y cierre final de O/S

> Entrega del 30 de octubre de 2026. Evidencia puntual; comportamiento vigente en la [guía de cierre](../../cierre-orden-servicio.md#acceso-y-acción-final).

## Resultado

El acceso superior decía Cerrar O/S aunque solo abría el expediente y conservaba En Proceso. Ahora se llama **Crear Expediente**, con estilo secundario, para los roles que pueden preparar documentos y horas, incluido Coordinador. Técnico y órdenes terminales mantienen el acceso de consulta **Expediente de cierre**; dentro del expediente se muestra **Vista previa**.

La acción definitiva **Cerrar O/S** queda después del historial, al final del expediente. Conserva los requisitos pendientes, el bloqueo por cambios sin guardar, los permisos y la confirmación existentes. Abrir Crear Expediente retoma el mismo expediente y no cambia el estado ni crea otro documento.

## Fuentes y alcance

- `app/(dashboard)/ordenes/[id]/page.jsx`: nombre y presentación del acceso, usando `canManageClosure` para distinguir preparación de consulta.
- `components/service-orders/ServiceOrderClosure.jsx`: ubicación final del cierre; validaciones y confirmación conservadas.
- Guía de cierre, guía de O/S, AI_CONTEXT y APP_DEPENDENCIES: acceso, etapas y fuentes de la interfaz.
- Se contrastaron las políticas de `lib/service-order-closure.js`, el repositorio y validador del cierre y el SQL de la migración 052. No se cambiaron API, reglas de horas, permisos, datos ni migraciones.

## Comprobaciones y límites

- `npm.cmd run lint`: salida 0, sin errores y con tres advertencias preexistentes en `app/layout.jsx`, `components/par/ParForm.jsx` y `lib/axios.js`.
- `npm.cmd run build`: salida 0, compilación correcta y 55/55 páginas generadas.
- Revisión del cambio: el acceso superior solo cambia la vista; la acción final conserva `missing`, `dirty`, `busy`, el permiso de cierre y el diálogo de confirmación.
- Documentación: 75 enlaces locales revisados en los seis Markdown de la entrega, sin destinos o anclas faltantes; ninguno está excluido por Git.

No se ejecutaron pruebas de navegador ni cierres sobre órdenes reales para este ajuste de interfaz. Se preservaron los cambios previos del espacio de trabajo; esta nota no certifica otras entregas ni una instalación desplegada.
