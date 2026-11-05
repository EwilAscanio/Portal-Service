-- Generaliza vacaciones sin reemplazar filas ni reescribir snapshots de auditoría.
SET LOCAL lock_timeout = '10s';

ALTER TABLE technical_vacation RENAME TO technical_unavailability;
ALTER TABLE technical_vacation_event RENAME TO technical_unavailability_event;
ALTER TABLE technical_unavailability_event RENAME COLUMN vacation_id TO unavailability_id;

-- El valor inicial clasifica todos los períodos existentes, incluidos los cancelados.
-- Las nuevas escrituras deben indicar explícitamente el motivo.
ALTER TABLE technical_unavailability ADD COLUMN reason_type VARCHAR(24) NOT NULL DEFAULT 'Vacaciones';
ALTER TABLE technical_unavailability ALTER COLUMN reason_type DROP DEFAULT;
ALTER TABLE technical_unavailability ADD CONSTRAINT technical_unavailability_reason_type_check
  CHECK (reason_type IN ('Vacaciones','DiasCompensatorios','Enfermedad','Permisos','Otros'));
ALTER TABLE technical_unavailability ADD CONSTRAINT technical_unavailability_other_note_check
  CHECK (reason_type <> 'Otros' OR (note IS NOT NULL AND length(trim(note)) >= 5));

-- Renombrar también las restricciones mantiene legible el catálogo físico.
-- PostgreSQL conserva las referencias por OID y renombra los índices de las PK.
DO $$
DECLARE item RECORD;
BEGIN
  FOR item IN
    SELECT conrelid::regclass AS relation, conname FROM pg_constraint
    WHERE conrelid IN ('technical_unavailability'::regclass,'technical_unavailability_event'::regclass)
      AND conname LIKE '%vacation%'
  LOOP
    EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I', item.relation,
      item.conname, replace(item.conname,'vacation','unavailability'));
  END LOOP;
END $$;
ALTER INDEX technical_vacation_period_idx RENAME TO technical_unavailability_period_idx;
ALTER INDEX technical_vacation_event_vacation_idx RENAME TO technical_unavailability_event_unavailability_idx;
ALTER SEQUENCE technical_vacation_event_id_seq RENAME TO technical_unavailability_event_id_seq;

COMMENT ON TABLE technical_unavailability IS 'Períodos de no disponibilidad por días completos inclusivos, interpretados en America/Caracas; independiente del estado Activo/Inactivo.';
COMMENT ON COLUMN technical_unavailability.reason_type IS 'Categoría administrativa restringida; calendarios y selectores públicos exponen solo fechas y bloqueo.';
COMMENT ON TABLE technical_unavailability_event IS 'Historial conservado. Snapshots anteriores a 058 no incluyen reason_type y representan Vacaciones; no reescribirlos.';
