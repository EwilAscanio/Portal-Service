# Cómo mantener la documentación

> Vigente · 22 de octubre de 2026. [Índice](README.md)

## Organización y responsabilidad

| Ubicación | Contenido | Evitar |
|---|---|---|
| AI_CONTEXT.md | Propósito, invariantes compartidas y ruta de lectura IA | Changelog extenso o duplicar manuales |
| APP_DEPENDENCIES.md | Entradas, salidas, consumidores e impacto entre módulos | Listas de funciones sin explicar relaciones |
| AGENTS.md | Instrucciones de trabajo y lectura | Repetir todas las reglas del dominio |
| docs/negocio/ | Flujo transversal y vocabulario | Detalles internos de cada endpoint |
| docs/modulos/ | Comportamiento de cada módulo y sus etapas | Funciones deseadas presentadas como implementadas |
| docs/arquitectura/ | Capas, datos, contratos y permisos | Credenciales o datos reales |
| docs/operacion/ | Instalación, evolución y recuperación | Resultados de una ejecución presentados como garantía permanente |
| docs/historico/ | Entregas y copias fechadas | Usarlo como autoridad vigente |
| docs/plantillas/ | Estructuras para documentos futuros | Copiar secciones vacías sin resolver |

Las guías de cierre y reportes conservan su ubicación actual para mantener enlaces existentes. Son las referencias principales de esas funciones; no crear copias paralelas dentro de módulos.

## Un lugar principal por regla

- Estados y edición PAR: [PAR](modulos/par.md).
- Estados, creación y programación O/S: [O/S](modulos/ordenes-servicio.md).
- Clasificación, origen y PAR de referencia para garantías: [garantías](modulos/garantias.md).
- Presupuesto, reserva y consumo: [horas](modulos/horas-tecnicos.md).
- Requisitos/archivos y confirmación: [cierre](cierre-orden-servicio.md).
- Filtros, criterios y PDF: [reportes](reportes.md).
- Autorización: [seguridad](arquitectura/seguridad-permisos.md).
- Relaciones/snapshots: [datos](arquitectura/datos-relaciones.md).
- Migraciones/respaldo: [operación](operacion/despliegue-respaldo-migraciones.md).

Otros documentos pueden resumir y enlazar. Si una explicación requiere duplicar una tabla completa, enlazar la tabla dueña.

## Procedimiento para cada cambio

1. Leer contexto y mapa de dependencias.
2. Identificar regla afectada, fuentes y consumidores indirectos.
3. Confirmar comportamiento en código/SQL; no deducir persistencia por apariencia de pantalla.
4. Actualizar la guía principal junto con el cambio autorizado.
5. Ajustar mapa, contexto, datos o permisos si cambia una relación transversal.
6. Registrar fecha, fuentes revisadas y límites de comprobación.
7. Comprobar enlaces, rutas, formato y que los archivos destinados a compartir no estén ignorados por Git.
8. Archivar notas puntuales de entrega; no acumularlas en los documentos de entrada.

La documentación no concede autorización para modificar aplicación, ejecutar migraciones o publicar cambios. Seguir el alcance acordado en cada trabajo.

## Cómo describir un módulo

Usar [plantilla](plantillas/modulo.md). Toda etapa debe explicar actor, precondición, entrada, acción, salida persistida o calculada, siguiente etapa, fallo y consumidor. Para CRUD sin aprobación describir alta, edición, consulta y baja reales.

Incluir estado guardado frente a visible, datos copiados frente a JOIN actual, transacciones/concurrencia y auditoría existente. Especificar cuando algo no está implementado.

## Vigente, pendiente e histórico

- **Vigente:** contrastado con fuentes concretas y fecha; no implica revisión funcional en producción.
- **Observación pendiente:** diferencia comprobada o límite del código. Registrar fuente e impacto sin presentarlo como arreglo aprobado.
- **Propuesta:** diseño todavía no implementado, explícitamente rotulado y separado.
- **Histórico:** hechos de una entrega y sus comprobaciones, conservados sin reescribir retrospectivamente.

Una nota de lint/build debe indicar fecha y alcance. Nunca sustituye una verificación nueva. Si no se ejecutaron comprobaciones de aplicación, decirlo.

## Tamaño y revisión

No usar un número de líneas como único criterio. Las entradas deben permitir decidir qué leer; el detalle se divide cuando mezcla dominios distintos o dificulta encontrar una regla. Evitar tanto un único archivo enorme como docenas de archivos de una frase.

Antes de dar por actualizada la documentación revisar:

- ¿Explica por qué PAR/O/S necesitan este módulo?
- ¿Permite seguir el dato desde su origen hasta su consumidor?
- ¿Distingue roles de ruta y permisos de acción?
- ¿Conserva excepciones históricas y efectos de cancelar/cerrar?
- ¿Las afirmaciones tienen fuentes reales y los enlaces resuelven?
- ¿No incluye secretos, datos personales reales ni garantías no comprobadas?

## Registro de esta reorganización

Se conservaron originales íntegros en [histórico](historico/README.md); se reemplazaron entradas extensas por contexto y mapa; se añadieron guías de flujo, módulos, datos, permisos y operación. Se documentaron inconsistencias sin corregir aplicación.

Alcance de archivos: Markdown y excepciones de seguimiento documental en .gitignore. No se modifican TAREAS.MD, código, dependencias, esquema ni migraciones.
