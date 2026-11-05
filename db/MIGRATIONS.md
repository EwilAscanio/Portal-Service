# Evolución de la base de datos

La guía vigente está en [Operación: despliegue, migraciones y recuperación](../docs/operacion/despliegue-respaldo-migraciones.md).

- Instalaciones vacías: db/schema.sql.
- Bases existentes: inventario, respaldo y una migración pendiente por llamada al runner.
- Sin argumento, npm run db:migrate ejecuta el archivo 031; no descubre automáticamente todas las pendientes.
- No editar ni forzar rutinariamente migraciones aplicadas.
- Preservar PostgreSQL y carpeta privada como conjunto de recuperación.

Este archivo se conserva como punto de entrada; el procedimiento se mantiene en una sola ubicación. Revisión: 22 de octubre de 2026.
