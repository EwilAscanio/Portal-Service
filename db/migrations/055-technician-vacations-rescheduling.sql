-- Vacaciones por días completos y reprogramación auditada de O/S antes de iniciar.
-- No modifica estados, técnicos, horas ni aprobaciones de documentos existentes.
SET LOCAL lock_timeout = '10s';

CREATE TABLE technical_vacation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technical_id UUID NOT NULL REFERENCES technical(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  note TEXT,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  CHECK (start_date >= DATE '1900-01-01' AND end_date <= DATE '9998-12-31' AND end_date >= start_date),
  CHECK ((cancelled_at IS NULL AND cancelled_by IS NULL AND cancellation_reason IS NULL)
    OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancellation_reason IS NOT NULL AND length(trim(cancellation_reason)) >= 5))
);
CREATE INDEX technical_vacation_period_idx ON technical_vacation(technical_id,start_date,end_date) WHERE cancelled_at IS NULL;
CREATE TABLE technical_vacation_event (
  id BIGSERIAL PRIMARY KEY,
  vacation_id UUID NOT NULL REFERENCES technical_vacation(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(20) NOT NULL CHECK (action IN ('Registradas','Modificadas','Canceladas')),
  reason TEXT,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX technical_vacation_event_vacation_idx ON technical_vacation_event(vacation_id,id);

ALTER TABLE service_order ADD COLUMN schedule_revision INTEGER NOT NULL DEFAULT 0 CHECK (schedule_revision >= 0);
CREATE TABLE service_order_schedule_event (
  id BIGSERIAL PRIMARY KEY,
  service_order_id INTEGER NOT NULL REFERENCES service_order(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(20) NOT NULL CHECK (action IN ('Reprogramada','Aprobada')),
  reason TEXT,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX service_order_schedule_event_order_idx ON service_order_schedule_event(service_order_id,id);
