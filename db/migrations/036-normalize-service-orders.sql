-- 036: Ordenes de servicio obligatoriamente originadas desde un PAR aprobado.
-- Los nombres nuevos de tablas y columnas se mantienen en ingles.

ALTER TABLE service_order
  ADD COLUMN IF NOT EXISTS purchase_order_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS quotation_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS work_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS service_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS call_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS worked_hours NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS work_description TEXT,
  ADD COLUMN IF NOT EXISTS prepared_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

UPDATE service_order so
SET work_type = COALESCE(so.work_type, 'External'),
    service_type = COALESCE(
      so.service_type,
      CASE lower(trim(so.type))
        WHEN 'mantenimiento' THEN 'Maintenance'
        WHEN 'revision' THEN 'Inspection'
        WHEN 'revisión' THEN 'Inspection'
        WHEN 'emergencia' THEN 'Emergency'
        ELSE 'Other'
      END
    ),
    call_date = COALESCE(so.call_date, so.created_at),
    scheduled_start = COALESCE(so.scheduled_start, so.scheduled_date, so.created_at),
    scheduled_end = COALESCE(so.scheduled_end, so.scheduled_date, so.created_at),
    worked_hours = COALESCE(so.worked_hours, 0),
    work_description = COALESCE(so.work_description, NULLIF(trim(ph.observations), '')),
    prepared_by = COALESCE(so.prepared_by, ph.created_by)
FROM par_header ph
WHERE ph.id = so.par_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM service_order
    WHERE par_id IS NULL OR work_description IS NULL OR prepared_by IS NULL
  ) THEN
    RAISE EXCEPTION '036 abortada: toda orden debe tener PAR, descripcion del PAR y usuario elaborador';
  END IF;
END $$;

ALTER TABLE service_order DROP CONSTRAINT IF EXISTS service_order_par_id_fkey;
ALTER TABLE service_order DROP CONSTRAINT IF EXISTS service_order_status_check;
ALTER TABLE service_order
  ALTER COLUMN par_id SET NOT NULL,
  ALTER COLUMN work_type SET NOT NULL,
  ALTER COLUMN service_type SET NOT NULL,
  ALTER COLUMN call_date SET NOT NULL,
  ALTER COLUMN scheduled_start SET NOT NULL,
  ALTER COLUMN scheduled_end SET NOT NULL,
  ALTER COLUMN worked_hours SET DEFAULT 0,
  ALTER COLUMN worked_hours SET NOT NULL,
  ALTER COLUMN work_description SET NOT NULL,
  ALTER COLUMN prepared_by SET NOT NULL,
  ADD CONSTRAINT service_order_par_id_fkey
    FOREIGN KEY (par_id) REFERENCES par_header(id) ON DELETE RESTRICT,
  ADD CONSTRAINT service_order_work_type_check
    CHECK (work_type IN ('Internal', 'External')),
  ADD CONSTRAINT service_order_service_type_check
    CHECK (service_type IN ('Inspection', 'Maintenance', 'Emergency', 'Other')),
  ADD CONSTRAINT service_order_schedule_check
    CHECK (scheduled_end >= scheduled_start),
  ADD CONSTRAINT service_order_worked_hours_check
    CHECK (worked_hours >= 0),
  ADD CONSTRAINT service_order_status_check
    CHECK (status IN ('Pendiente', 'Aprobada', 'En Proceso', 'Completada', 'Cancelada'));

CREATE TABLE IF NOT EXISTS service_order_technician (
  service_order_id INTEGER NOT NULL REFERENCES service_order(id) ON DELETE CASCADE,
  technical_id UUID NOT NULL REFERENCES technical(id) ON DELETE RESTRICT,
  is_lead BOOLEAN NOT NULL DEFAULT false,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (service_order_id, technical_id)
);

INSERT INTO service_order_technician (service_order_id, technical_id, is_lead)
SELECT id, technical_id, true
FROM service_order
WHERE technical_id IS NOT NULL
ON CONFLICT (service_order_id, technical_id) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS service_order_one_lead_technician_idx
  ON service_order_technician(service_order_id) WHERE is_lead;
CREATE INDEX IF NOT EXISTS service_order_technician_technical_id_idx
  ON service_order_technician(technical_id);
CREATE INDEX IF NOT EXISTS service_order_prepared_by_idx ON service_order(prepared_by);
CREATE INDEX IF NOT EXISTS service_order_approved_by_idx ON service_order(approved_by);

CREATE OR REPLACE FUNCTION enforce_service_order_technician_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM service_order_technician
      WHERE service_order_id = NEW.service_order_id) >= 3 THEN
    RAISE EXCEPTION 'Una orden de servicio admite un maximo de 3 tecnicos'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_order_technician_limit ON service_order_technician;
CREATE TRIGGER service_order_technician_limit
BEFORE INSERT ON service_order_technician
FOR EACH ROW EXECUTE FUNCTION enforce_service_order_technician_limit();

INSERT INTO schema_migrations(version, checksum)
VALUES ('036-normalize-service-orders', '036-normalize-service-orders-v1')
ON CONFLICT (version) DO NOTHING;
