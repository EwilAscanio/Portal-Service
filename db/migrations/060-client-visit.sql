-- Visitas de campo y posibles clientes creados desde la app móvil.
-- client sigue siendo el catálogo Saint: el prospecto no recibe codclie.
SET LOCAL lock_timeout = '10s';

CREATE TABLE client_prospect (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  description VARCHAR(255) NOT NULL,
  rif VARCHAR(30) NOT NULL,
  contact_name VARCHAR(150),
  phone VARCHAR(30),
  email VARCHAR(150),
  address1 VARCHAR(255),
  sync_status VARCHAR(20) NOT NULL DEFAULT 'Sincronizado'
    CHECK (sync_status IN ('Pendiente','Sincronizando','Sincronizado','Error')),
  source_system VARCHAR(30) NOT NULL DEFAULT 'Mobile',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT client_prospect_description_check CHECK (NULLIF(trim(description), '') IS NOT NULL),
  CONSTRAINT client_prospect_rif_check CHECK (NULLIF(trim(rif), '') IS NOT NULL),
  CONSTRAINT client_prospect_email_check CHECK (email IS NULL OR position('@' in email) > 1),
  UNIQUE (user_id, local_id)
);

CREATE INDEX client_prospect_updated_idx ON client_prospect(updated_at);
CREATE INDEX client_prospect_user_idx ON client_prospect(user_id);

DROP TRIGGER IF EXISTS client_prospect_set_updated_at ON client_prospect;
CREATE TRIGGER client_prospect_set_updated_at
  BEFORE UPDATE ON client_prospect
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE client_visit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  user_name VARCHAR(120) NOT NULL,
  client_id UUID REFERENCES client(id) ON DELETE RESTRICT,
  client_prospect_id UUID REFERENCES client_prospect(id) ON DELETE RESTRICT,
  plant_id UUID,
  plant_name VARCHAR(200),
  visited_at TIMESTAMPTZ NOT NULL,
  client_class VARCHAR(40) NOT NULL
    CHECK (client_class IN ('A','B','C','Recuperado','Gobierno','Potencial (Cliente Nuevo)')),
  visit_objective VARCHAR(30) NOT NULL
    CHECK (visit_objective IN ('Servicio','Seguimiento','Repuestos','Máquinas','Cliente Nuevo','Renta')),
  visit_type VARCHAR(20) NOT NULL
    CHECK (visit_type IN ('En Físico','Por Telf','Por Mail')),
  contact_name VARCHAR(150),
  contact_email VARCHAR(150),
  will_quote BOOLEAN NOT NULL,
  office_zone VARCHAR(20) NOT NULL
    CHECK (office_zone IN ('Valencia','Caracas','Otro')),
  observations TEXT,
  sync_status VARCHAR(20) NOT NULL DEFAULT 'Sincronizado'
    CHECK (sync_status IN ('Pendiente','Sincronizando','Sincronizado','Error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_id),
  CONSTRAINT client_visit_user_name_check CHECK (NULLIF(trim(user_name), '') IS NOT NULL),
  CONSTRAINT client_visit_subject_check CHECK (
    (client_id IS NOT NULL AND client_prospect_id IS NULL)
    OR (client_id IS NULL AND client_prospect_id IS NOT NULL)
  ),
  CONSTRAINT client_visit_plant_catalog_check CHECK (client_prospect_id IS NULL OR plant_id IS NULL),
  CONSTRAINT client_visit_plant_name_check CHECK (client_id IS NULL OR plant_name IS NULL),
  CONSTRAINT client_visit_contact_email_check CHECK (contact_email IS NULL OR position('@' in contact_email) > 1),
  CONSTRAINT client_visit_plant_client_fk FOREIGN KEY (plant_id, client_id) REFERENCES plant(id, client_id)
);

CREATE INDEX client_visit_user_idx ON client_visit(user_id);
CREATE INDEX client_visit_visited_idx ON client_visit(visited_at);
CREATE INDEX client_visit_client_idx ON client_visit(client_id);
CREATE INDEX client_visit_prospect_idx ON client_visit(client_prospect_id);
CREATE INDEX client_updated_at_idx ON client(updated_at);
CREATE INDEX plant_updated_at_idx ON plant(updated_at);

DROP TRIGGER IF EXISTS client_visit_set_updated_at ON client_visit;
CREATE TRIGGER client_visit_set_updated_at
  BEFORE UPDATE ON client_visit
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE client_prospect IS 'Posible cliente creado en campo. No entra en client ni recibe codclie.';
COMMENT ON COLUMN client_prospect.local_id IS 'UUID generado por el teléfono. Junto con user_id evita duplicar un reintento.';
COMMENT ON COLUMN client_prospect.sync_status IS 'En PostgreSQL la fila nace Sincronizado. Pendiente, Sincronizando y Error viven en el teléfono.';
COMMENT ON TABLE client_visit IS 'Visita registrada por un usuario del portal. La cotización es solo un indicador.';
COMMENT ON COLUMN client_visit.user_name IS 'Copia del nombre al guardar la visita.';
COMMENT ON COLUMN client_visit.will_quote IS 'Indica si la visita va a generar cotización. No crea un PAR.';
COMMENT ON COLUMN client_visit.plant_id IS 'Planta del catálogo cuando la visita es a un cliente Saint.';
COMMENT ON COLUMN client_visit.plant_name IS 'Planta en texto libre cuando la visita es a un posible cliente.';
