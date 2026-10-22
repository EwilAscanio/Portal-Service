-- 033: Backfill de par_header.plant_id desde el equipo principal de cada PAR.
-- Asigna planta solo cuando el PAR tiene un unico equipo principal con planta
-- (el indice parcial par_equipment_one_main_idx garantiza uno por PAR).
-- Los PARs sin equipo principal o sin planta asignada quedan NULL (no inferible).
BEGIN;

UPDATE par_header ph
SET plant_id = pe.plant_id
FROM (
  SELECT pe.par_id, e.plant_id
  FROM par_equipment pe
  JOIN equipment e ON e.id = pe.equipment_id
  WHERE pe.is_main
    AND e.plant_id IS NOT NULL
) pe
WHERE ph.plant_id IS NULL
  AND ph.id = pe.par_id;

INSERT INTO schema_migrations(version, checksum)
VALUES ('033-par-header-plant-backfill', '033-par-header-plant-backfill-v1')
ON CONFLICT (version) DO NOTHING;

COMMIT;