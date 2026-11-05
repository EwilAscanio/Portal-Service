# Productos y plantillas de PAR

> Vigente · revisión estática: 22 de octubre de 2026. [Índice](../README.md)

## Productos

Fuentes: `lib/repositories/product.repository.js`, `app/api/product/`, `lib/validators/operational.schema.js`, `lib/import/executor.js`, `db/schema.sql`.

| Etapa | Datos / validación | Resultado e impacto |
|---|---|---|
| Alta | Código único, descripción, categoría, costo/precio y datos opcionales | Catálogo disponible para captura |
| Clasificar | Servicio o Repuestos; requires_technician solo para Servicio | Define si una selección nueva puede presupuestar horas |
| Editar | Validadores y restricciones SQL | Cambia catálogo actual; revisar formularios e importador |
| Inactivar/reactivar | Activo / Inactivo | No elimina el historial ni reescribe PAR existentes |
| Seleccionar en plantilla/PAR | Producto activo para nuevas incorporaciones | Copia datos del renglón; conserva referencia al producto |

El campo vigente es `category`; no existe `product.type` como contrato actual. Servicio no implica siempre mano de obra: la marca explícita `requires_technician` distingue los productos que requieren asignar personas.

Un producto inactivo ya seleccionado puede mantenerse al editar su documento histórico según el repositorio; no se admite como una nueva incorporación arbitraria. Cambiar precio, descripción o marca de técnico no recalcula automáticamente los documentos guardados.

Costo y precio son datos comerciales. No inferir protección de campos por una columna oculta en UI: revisar respuesta de API y permiso de familia.

## Plantillas

Fuentes: `lib/repositories/par-template.repository.js`, `lib/validators/par-template.schema.js`, `app/api/par-template/`, `app/(dashboard)/par/plantillas/`.

| Etapa | Operación | Persistencia / consumidor |
|---|---|---|
| Crear | Definir tipo, nombre, descripción y renglones | par_template + par_template_item en transacción |
| Editar | Reemplazar detalles validados | Mantiene cabecera y reconstruye ítems |
| Consultar | Lista y detalle ordenados | Permite elegir plantilla desde PAR |
| Aplicar al PAR | Copiar ítems como punto de partida | El usuario ajusta su documento; no queda enlace permanente |
| Eliminar | DELETE de plantilla | Elimina sus ítems por cascada; no elimina PAR creados a partir de ella |

La categoría del ítem vinculado se resuelve desde el producto. Los productos inactivos que ya estaban en la plantilla pueden conservarse al editarla; esta excepción no autoriza seleccionar cualquier producto inactivo.

No hay aprobación, versionado formal ni actualización automática de PAR cuando cambia una plantilla. El PAR conserva sus cantidades, importes y marca de mano de obra según la captura y persistencia del documento.

## Flujo hacia los documentos centrales

Producto → plantilla opcional → renglón PAR → presupuesto si requiere técnico → asignación en O/S → horas reales y reporte.

La identidad del producto no sustituye a la del ítem PAR ni a la persona técnica. Las futuras comisiones por tipo de servicio no están calculadas aquí. Ver [horas](horas-tecnicos.md).

## Validación, permisos e impactos

Acceso de Superadministrador, Administrador, Supervisor y Coordinador a productos y plantillas. Esquemas Zod, consultas parametrizadas y restricciones de categoría/unicidad preservan los contratos.

Cambios de nombres de campo, categorías o selección de inactivos afectan catálogo, importador, plantilla, formulario PAR y repositorio. Los cambios de marca de técnico además afectan presupuesto y asignaciones nuevas; revisar copias históricas antes de cualquier migración.

Fechas de creación/actualización no constituyen un registro completo de quién cambió cada precio.
