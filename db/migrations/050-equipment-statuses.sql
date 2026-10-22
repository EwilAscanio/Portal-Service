-- Amplía los estados de equipo a Operativo, En Mantenimiento, Fuera de Servicio,
-- Mudado, Desechado y Validar.
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'equipment'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE equipment DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE equipment
  ADD CONSTRAINT equipment_status_check
  CHECK (status IN ('Operativo', 'En Mantenimiento', 'Fuera de Servicio', 'Mudado', 'Desechado', 'Validar'));

INSERT INTO schema_migrations(version, checksum)
VALUES ('050-equipment-statuses', '050-equipment-statuses-v1')
ON CONFLICT (version) DO NOTHING;
