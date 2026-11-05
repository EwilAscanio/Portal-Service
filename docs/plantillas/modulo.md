# Plantilla: nombre del módulo

> Estado: propuesta / vigente. Fecha de revisión: AAAA-MM-DD. [Índice](../README.md)
> Esta plantilla es una guía de redacción, no describe una función implementada.

## Propósito y relación con PAR/O/S

Qué problema resuelve; qué documento central alimenta o consume; límites de alcance.

## Fuentes revisadas

Páginas/componentes, contrato API, validadores, políticas, repositorios, SQL y migraciones concretas. Solo rutas existentes.

## Entradas y relaciones

| Entrada | Productor | Validación | Copiada o consultada |
|---|---|---|---|
| Completar | Completar | Completar | Completar |

## Etapas

| Etapa / estado | Actor y precondición | Acción | Persistencia / resultado | Próxima etapa e impacto |
|---|---|---|---|---|
| Completar | Completar | Completar | Completar | Completar |

Distinguir estado guardado, etiqueta visible y valores derivados. Si es un catálogo, describir su CRUD real.

## Reglas y permisos

Enlazar a la regla compartida principal; describir excepciones específicas. Separar permiso de ruta de autorización por acción/registro.

## Fallos y concurrencia

Validación, falta de datos, conflictos, rollback, bloqueos y comportamiento entre sesiones. No afirmar atomicidad si no existe.

## Historial y datos sensibles

Qué se conserva; snapshots y lecturas actuales; actor/fecha; baja física/lógica; qué no debe publicarse.

## Salidas y consumidores

Efectos directos e indirectos sobre PAR, órdenes, presupuesto, agenda, cierre y reportes.

## Ejemplos y límites

Ejemplos ficticios; casos normales y excepciones. Propuestas separadas del comportamiento vigente.

## Mantenimiento

Qué guías y contratos revisar cuando cambie el módulo. Fecha y alcance de comprobaciones realizadas.
