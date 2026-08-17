-- 016-drop-par-v1.sql
-- Elimina las tablas del módulo PAR V1, reemplazado por el V2 (014-par-v2.sql).
-- Orden: primero las tablas hijas, luego la cabecera y la secuencia.

DROP TABLE IF EXISTS par_product_lines;
DROP TABLE IF EXISTS par_labor_lines;
DROP TABLE IF EXISTS par_headers;
DROP SEQUENCE IF EXISTS par_number_seq;
