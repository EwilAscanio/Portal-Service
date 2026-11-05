# Entrega: disponibilidad de técnicos por motivo

> Evidencia del 31 de octubre de 2026. No sustituye la [guía vigente](../../modulos/tecnicos-calendario.md).

## Alcance realizado

- Vacaciones se generalizó a Disponibilidad del técnico, con Vacaciones, Días compensatorios, Enfermedad, Permisos y Otros; todos por días completos inclusivos. Otros exige detalle.
- Se conservaron revisión de coincidencias, edición/cancelación justificadas, historial y bloqueos transaccionales con O/S. Normal y Garantía se validan con la misma disponibilidad; el cuarto técnico también queda protegido.
- Tabla, tarjetas, modal, selectores y calendario utilizan el contrato nuevo. Coordinador solo consulta fechas/bloqueo; categoría, notas e historial se reservan a los tres roles superiores. Ninguna agenda publica categorías administrativas.
- La migración 058 renombra tablas y FK, restricciones, índices y secuencia; conserva filas y JSON de eventos, y clasifica períodos anteriores como Vacaciones. No modifica 055 ni datos de PAR/O/S/horas.
- Se actualizaron contexto, dependencias, guía principal, relaciones, permisos, O/S, garantías, operación e índice. No se añadieron tareas a TAREAS.MD.

## Comprobaciones realizadas

| Comprobación | Resultado en esta entrega |
|---|---|
| `npm run test:technician-unavailability` | Correcto: cinco categorías, Otros, días inclusivos/Caracas, roles, privacidad en API/catálogos/agenda, migración con filas activas/canceladas y JSON intacto, revisión, O/S abiertas, cuarto técnico, reprogramación, horas/cierre/reportes y concurrencia ausencia/O/S y ausencia/ausencia |
| `npm test` | Correcto: suite general, permisos, PAR, O/S, calendario, validadores, SQL, catálogos e importaciones |
| `npm run test:service-order-warranty` | Correcto: garantías registradas/externas, presupuesto separado, permisos, cierre y reportes |
| `npm run test:service-pending` | Correcto: fotos, pendientes y cierre atómico |
| `npm run test:service-order-technicians` | Correcto: hasta cuatro participantes, asignación, agenda, cierre y reportes |
| `npm run lint` | Sin errores; tres advertencias previas en layout, React Hook Form de PAR y navegación Axios |
| `npm run build` | Compilación de producción correcta; rutas nuevas de no disponibilidad incluidas |
| Navegador con usuarios/datos ficticios y esquema aislado | Registro de Otros bloqueado sin detalle; guardado, revisión de coincidencias, cambio a Días compensatorios con justificación e historial; Coordinador sin categoría/notas/acciones/historial; tabla y cards con el mismo resumen; calendario genérico por días completos |

El servidor de prueba se detuvo y su esquema ficticio fue retirado al terminar. La evidencia visual se conservó privadamente, fuera de Git. La prueba visual no usó identidades ni información operativa reales.

## Migración de la base local

Se comprobó el prerrequisito 057 y que 058 estuviera pendiente. Se creó un respaldo PostgreSQL en formato custom, se comprobó que su catálogo fuera legible con pg_restore y se compararon inventarios antes/después. La carpeta privada configurada no contenía archivos en ese momento.

`058-technician-unavailability.sql` quedó registrada con SHA-256:

`d79d6563564eb6c42ccc9645a80add5c40ba1ca34d90ab591022d38833db7acb`

La comparación de conteos y hashes de las 34 tablas operativas públicas confirmó conservación de filas, normalizando únicamente el nombre de la FK y excluyendo la nueva categoría del hash comparativo. Los períodos anteriores quedaron como Vacaciones, incluidos cancelados; los JSON de eventos permanecieron intactos. Se verificaron los nombres nuevos, restricciones y secuencia. Los respaldos/manifiestos están en el directorio privado ignorado por Git; no se incorporó su contenido a documentación.

Esta evidencia corresponde exclusivamente a la base local conectada. Comprobar que un dump es legible no equivale a restaurarlo: no se realizó una restauración completa del respaldo operativo. Otras instalaciones requieren su propio inventario/respaldo y despliegue coordinado de API, UI y migración; las rutas antiguas no son compatibles con este contrato.
