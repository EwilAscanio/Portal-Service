-- 028-par-scale-2.sql
-- Multiplicador y valor_percent pasan de numeric(8,4) a numeric(8,2).

ALTER TABLE par_item
  ALTER COLUMN multiplicador TYPE numeric(8,2),
  ALTER COLUMN valor_percent TYPE numeric(8,2);

ALTER TABLE par_template_item
  ALTER COLUMN multiplicador TYPE numeric(8,2),
  ALTER COLUMN valor_percent TYPE numeric(8,2);