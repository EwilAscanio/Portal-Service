-- La programación permanece intacta; el cierre registra ejecución y expediente.
ALTER TABLE service_order
  ADD COLUMN equipment_scope_confirmed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN closure_legacy BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN closure_revision INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN actual_hours NUMERIC(8,2) CHECK (actual_hours >= 0),
  ADD COLUMN closure_notes TEXT,
  ADD COLUMN excess_reason TEXT,
  ADD COLUMN closed_by UUID REFERENCES "users"(id) ON DELETE RESTRICT,
  ADD COLUMN closed_at TIMESTAMPTZ,
  ADD CONSTRAINT service_order_closure_stamp_check CHECK ((closed_by IS NULL) = (closed_at IS NULL));
UPDATE service_order SET closure_legacy = true WHERE status = 'Completada';
UPDATE service_order SET equipment_scope_confirmed = true WHERE status IN ('Completada', 'Cancelada');
ALTER TABLE service_order ADD CONSTRAINT service_order_closure_state_check CHECK (
  (status <> 'Completada' OR closure_legacy OR closed_at IS NOT NULL)
  AND (closed_at IS NULL OR (status = 'Completada' AND actual_hours IS NOT NULL AND NOT closure_legacy AND equipment_scope_confirmed))
);

ALTER TABLE service_order_labor_allocation
  ADD COLUMN actual_hours NUMERIC(10,2) CHECK (actual_hours >= 0 AND actual_hours <= 999999.99),
  ADD COLUMN actual_note TEXT;

CREATE TABLE service_order_equipment (
  service_order_id INTEGER NOT NULL REFERENCES service_order(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT, brand TEXT, model TEXT, serial TEXT, description TEXT,
  is_main BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (service_order_id, equipment_id)
);
CREATE INDEX service_order_equipment_catalog_idx ON service_order_equipment(equipment_id);
-- Es la representación anterior, no una confirmación de los equipos atendidos.
INSERT INTO service_order_equipment
  (service_order_id, equipment_id, position, name, type, brand, model, serial, description, is_main)
SELECT so.id, pe.equipment_id, pe.item_no, COALESCE(e.name, pe.tipo, 'Equipo'),
       pe.tipo, pe.marca, pe.modelo, COALESCE(e.serial, pe.serial), pe.observaciones, pe.is_main
FROM service_order so JOIN par_equipment pe ON pe.par_id = so.par_id
JOIN equipment e ON e.id = pe.equipment_id;

CREATE TABLE service_order_closure_requirement (
  id BIGSERIAL PRIMARY KEY,
  service_order_id INTEGER NOT NULL,
  equipment_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('service_report','work_checklist','pre_verification','post_verification')),
  not_applicable BOOLEAN NOT NULL DEFAULT false,
  justification TEXT,
  updated_by UUID REFERENCES "users"(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (service_order_id, equipment_id) REFERENCES service_order_equipment(service_order_id, equipment_id) ON DELETE CASCADE,
  UNIQUE (service_order_id, equipment_id, category),
  CHECK (NOT not_applicable OR COALESCE(length(trim(justification)), 0) >= 5)
);
INSERT INTO service_order_closure_requirement(service_order_id, equipment_id, category)
SELECT e.service_order_id, e.equipment_id, c.category FROM service_order_equipment e
CROSS JOIN (VALUES ('service_report'),('work_checklist'),('pre_verification'),('post_verification')) AS c(category)
JOIN service_order so ON so.id = e.service_order_id AND NOT so.closure_legacy;

CREATE TABLE service_order_closure_file (
  id UUID PRIMARY KEY,
  requirement_id BIGINT NOT NULL REFERENCES service_order_closure_requirement(id) ON DELETE RESTRICT,
  storage_key TEXT NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('application/pdf','image/jpeg','image/png')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  sha256 CHAR(64) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES "users"(id) ON DELETE RESTRICT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_by UUID REFERENCES "users"(id) ON DELETE RESTRICT,
  retired_at TIMESTAMPTZ,
  retirement_reason TEXT,
  CHECK ((retired_by IS NULL) = (retired_at IS NULL))
);
CREATE INDEX service_order_closure_file_requirement_idx ON service_order_closure_file(requirement_id);

CREATE TABLE service_order_closure_event (
  id BIGSERIAL PRIMARY KEY,
  service_order_id INTEGER NOT NULL REFERENCES service_order(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES "users"(id) ON DELETE RESTRICT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX service_order_closure_event_order_idx ON service_order_closure_event(service_order_id, id);
CREATE INDEX service_order_closure_event_actor_idx ON service_order_closure_event(actor_id);
