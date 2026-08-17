-- 022-par-item-adjust.sql
-- Ajustes al módulo PAR v2:
--   - Elimina la columna `observations` de par_item (sin uso y sin datos).
--   - `valor_percent`, `ccn` y `us_list` ya existen, no requieren DDL.

ALTER TABLE par_item DROP COLUMN IF EXISTS observations;
