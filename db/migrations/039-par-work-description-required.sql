-- 039: La descripcion que alimenta la orden es obligatoria desde el PAR.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM par_header WHERE NULLIF(trim(observations), '') IS NULL) THEN
    RAISE EXCEPTION '039 abortada: existen PAR sin descripcion del trabajo';
  END IF;
END $$;

ALTER TABLE par_header ALTER COLUMN observations SET NOT NULL;
ALTER TABLE par_header ADD CONSTRAINT par_header_observations_not_blank
  CHECK (NULLIF(trim(observations), '') IS NOT NULL);

INSERT INTO schema_migrations(version, checksum)
VALUES ('039-par-work-description-required', '039-par-work-description-required-v1')
ON CONFLICT (version) DO NOTHING;
