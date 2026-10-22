-- 040: La descripcion del trabajo de la orden proviene de los equipos del PAR.
-- Corrige 039: par_header.observations vuelve a ser un dato general opcional.

WITH equipment_descriptions AS (
  SELECT pe.par_id,
         string_agg(trim(pe.observaciones), E'\n' ORDER BY pe.is_main DESC, pe.item_no, pe.id)
           AS work_description
  FROM par_equipment pe
  WHERE NULLIF(trim(pe.observaciones), '') IS NOT NULL
  GROUP BY pe.par_id
)
UPDATE service_order so
SET work_description = descriptions.work_description
FROM equipment_descriptions descriptions
WHERE descriptions.par_id = so.par_id;

ALTER TABLE par_header DROP CONSTRAINT IF EXISTS par_header_observations_not_blank;
ALTER TABLE par_header ALTER COLUMN observations DROP NOT NULL;

INSERT INTO schema_migrations(version, checksum)
VALUES ('040-use-equipment-description-for-orders', '040-use-equipment-description-for-orders-v1')
ON CONFLICT (version) DO NOTHING;
