-- 041: Cada equipo del PAR debe describir el alcance que alimenta la orden.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM par_equipment WHERE NULLIF(trim(observaciones), '') IS NULL) THEN
    RAISE EXCEPTION '041 abortada: existen equipos de PAR sin descripcion';
  END IF;
END $$;

ALTER TABLE par_equipment ALTER COLUMN observaciones SET NOT NULL;
ALTER TABLE par_equipment ADD CONSTRAINT par_equipment_observaciones_not_blank
  CHECK (NULLIF(trim(observaciones), '') IS NOT NULL);

INSERT INTO schema_migrations(version, checksum)
VALUES ('041-par-equipment-description-required', '041-par-equipment-description-required-v1')
ON CONFLICT (version) DO NOTHING;
