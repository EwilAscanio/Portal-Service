-- 023-drop-par-revisado-por.sql
-- El documento usa `approved_by`/`approved_at` (FK al usuario) como fuente de
-- "Aprobado por". La columna libre `revisado_por` queda sin uso y se elimina.

ALTER TABLE par_header DROP COLUMN IF EXISTS revisado_por;
