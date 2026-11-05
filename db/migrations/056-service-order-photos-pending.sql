SET LOCAL lock_timeout = '10s';

CREATE TABLE service_order_photo (
  id UUID PRIMARY KEY,
  service_order_id INTEGER NOT NULL REFERENCES service_order(id) ON DELETE RESTRICT,
  slot SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 5),
  storage_key TEXT NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  sha256 TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  retired_at TIMESTAMPTZ,
  retirement_reason TEXT,
  CHECK ((retired_at IS NULL AND retired_by IS NULL AND retirement_reason IS NULL)
    OR (retired_at IS NOT NULL AND retired_by IS NOT NULL AND length(trim(retirement_reason)) >= 5))
);
-- Cinco posiciones vigentes: el límite también se cumple ante escrituras concurrentes.
CREATE UNIQUE INDEX service_order_photo_slot_idx ON service_order_photo(service_order_id,slot) WHERE retired_at IS NULL;
CREATE INDEX service_order_photo_order_idx ON service_order_photo(service_order_id);

ALTER TABLE service_order ADD CONSTRAINT service_order_pending_scope_unique UNIQUE(id,par_id,client_id,plant_id);
CREATE TABLE service_pending_item (
  id UUID PRIMARY KEY,
  service_order_id INTEGER NOT NULL,
  par_id INTEGER NOT NULL,
  client_id UUID NOT NULL,
  plant_id UUID NOT NULL,
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 2000),
  position INTEGER NOT NULL CHECK (position >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'Borrador' CHECK (status IN ('Borrador','Pendiente','Completado')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_at TIMESTAMPTZ,
  retired_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  client_code VARCHAR(20), client_name TEXT, plant_code VARCHAR(50), plant_name TEXT,
  order_code VARCHAR(20), par_number VARCHAR(20),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  resolution TEXT,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  FOREIGN KEY(service_order_id,par_id,client_id,plant_id) REFERENCES service_order(id,par_id,client_id,plant_id) ON DELETE RESTRICT,
  CHECK ((retired_at IS NULL) = (retired_by IS NULL)),
  CHECK ((status='Borrador' AND published_at IS NULL AND published_by IS NULL)
    OR (status IN ('Pendiente','Completado') AND published_at IS NOT NULL AND published_by IS NOT NULL
      AND retired_at IS NULL AND client_code IS NOT NULL AND plant_name IS NOT NULL AND order_code IS NOT NULL)),
  CHECK ((status='Completado' AND completed_at IS NOT NULL AND completed_by IS NOT NULL AND resolution IS NOT NULL AND length(trim(resolution)) BETWEEN 5 AND 2000)
    OR (status<>'Completado' AND completed_at IS NULL AND completed_by IS NULL AND resolution IS NULL))
);
CREATE INDEX service_pending_order_idx ON service_pending_item(service_order_id);
CREATE INDEX service_pending_open_idx ON service_pending_item(published_at,id) WHERE status='Pendiente';
CREATE INDEX service_pending_scope_idx ON service_pending_item(client_id,plant_id,status) WHERE published_at IS NOT NULL;

CREATE TABLE service_pending_event (
  id BIGSERIAL PRIMARY KEY,
  pending_id UUID NOT NULL REFERENCES service_pending_item(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('Publicado','Completado')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX service_pending_event_item_idx ON service_pending_event(pending_id,id);

-- Resolver el seguimiento no reescribe lo que se reportó en el expediente cerrado.
CREATE FUNCTION preserve_published_pending() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.published_at IS NOT NULL THEN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Un pendiente publicado conserva su historial' USING ERRCODE='23514'; END IF;
    IF (to_jsonb(NEW) - ARRAY['status','completed_at','completed_by','resolution','revision','updated_at','updated_by'])
       IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','completed_at','completed_by','resolution','revision','updated_at','updated_by'])
       OR OLD.status='Completado' OR NEW.status<>'Completado' THEN
      RAISE EXCEPTION 'El origen publicado es inmutable y solo admite completar el seguimiento' USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER preserve_published_pending_trigger BEFORE UPDATE OR DELETE ON service_pending_item
FOR EACH ROW EXECUTE FUNCTION preserve_published_pending();
