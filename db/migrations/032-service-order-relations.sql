-- 032: Normaliza ordenes de servicio y agrega plantas/contactos.
-- Los campos de texto de service_order se conservan como snapshot historico.

CREATE TABLE IF NOT EXISTS plant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  address VARCHAR(255),
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plant_client_name_unique UNIQUE (client_id, name)
);

CREATE TABLE IF NOT EXISTS contact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE RESTRICT,
  plant_id UUID NOT NULL REFERENCES plant(id) ON DELETE RESTRICT,
  phone VARCHAR(30),
  email VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plant_updated_at ON plant;
CREATE TRIGGER plant_updated_at
  BEFORE UPDATE ON plant
  FOR EACH ROW EXECUTE FUNCTION set_catalog_updated_at();

DROP TRIGGER IF EXISTS contact_updated_at ON contact;
CREATE TRIGGER contact_updated_at
  BEFORE UPDATE ON contact
  FOR EACH ROW EXECUTE FUNCTION set_catalog_updated_at();

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES plant(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS consortium VARCHAR(150),
  ADD COLUMN IF NOT EXISTS hp NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pressure NUMERIC(10,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'equipment_hp_nonnegative'
  ) THEN
    ALTER TABLE equipment ADD CONSTRAINT equipment_hp_nonnegative
      CHECK (hp IS NULL OR hp >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'equipment_pressure_nonnegative'
  ) THEN
    ALTER TABLE equipment ADD CONSTRAINT equipment_pressure_nonnegative
      CHECK (pressure IS NULL OR pressure >= 0);
  END IF;
END $$;

-- Convierte las ubicaciones actuales de equipos en plantas por cliente.
INSERT INTO plant (name, address, client_id)
SELECT DISTINCT trim(e.location), trim(e.location), e.client_id
FROM equipment e
WHERE e.client_id IS NOT NULL
  AND NULLIF(trim(e.location), '') IS NOT NULL
ON CONFLICT (client_id, name) DO NOTHING;

UPDATE equipment e
SET plant_id = p.id
FROM plant p
WHERE e.plant_id IS NULL
  AND p.client_id = e.client_id
  AND lower(p.name) = lower(trim(e.location));

ALTER TABLE par_header
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES plant(id) ON DELETE RESTRICT;

ALTER TABLE service_order
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES client(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES plant(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES equipment(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS technical_id UUID REFERENCES technical(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contact(id) ON DELETE RESTRICT;

-- Backfill conservador: solo relaciona textos que identifican un unico registro.
WITH unique_clients AS (
  SELECT lower(trim(description)) AS normalized_name, min(id::text)::uuid AS id
  FROM client
  WHERE NULLIF(trim(description), '') IS NOT NULL
  GROUP BY lower(trim(description))
  HAVING count(*) = 1
)
UPDATE service_order so
SET client_id = uc.id
FROM unique_clients uc
WHERE so.client_id IS NULL
  AND lower(trim(so.client_description)) = uc.normalized_name;

WITH unique_technical AS (
  SELECT lower(trim(name)) AS normalized_name, min(id::text)::uuid AS id
  FROM technical
  GROUP BY lower(trim(name))
  HAVING count(*) = 1
)
UPDATE service_order so
SET technical_id = ut.id
FROM unique_technical ut
WHERE so.technical_id IS NULL
  AND lower(trim(so.technician_name)) = ut.normalized_name;

WITH unique_equipment AS (
  SELECT lower(trim(name)) AS normalized_name, client_id, min(id::text)::uuid AS id
  FROM equipment
  GROUP BY lower(trim(name)), client_id
  HAVING count(*) = 1
)
UPDATE service_order so
SET equipment_id = ue.id
FROM unique_equipment ue
WHERE so.equipment_id IS NULL
  AND lower(trim(so.equipment_name)) = ue.normalized_name
  AND (so.client_id IS NULL OR ue.client_id = so.client_id);

UPDATE service_order so
SET plant_id = e.plant_id
FROM equipment e
WHERE so.equipment_id = e.id
  AND so.plant_id IS NULL;

CREATE INDEX IF NOT EXISTS plant_client_id_idx ON plant(client_id);
CREATE INDEX IF NOT EXISTS contact_client_id_idx ON contact(client_id);
CREATE INDEX IF NOT EXISTS contact_plant_id_idx ON contact(plant_id);
CREATE INDEX IF NOT EXISTS equipment_plant_id_idx ON equipment(plant_id);
CREATE INDEX IF NOT EXISTS par_header_plant_id_idx ON par_header(plant_id);
CREATE INDEX IF NOT EXISTS service_order_client_id_idx ON service_order(client_id);
CREATE INDEX IF NOT EXISTS service_order_plant_id_idx ON service_order(plant_id);
CREATE INDEX IF NOT EXISTS service_order_equipment_id_idx ON service_order(equipment_id);
CREATE INDEX IF NOT EXISTS service_order_technical_id_idx ON service_order(technical_id);
CREATE INDEX IF NOT EXISTS service_order_contact_id_idx ON service_order(contact_id);

INSERT INTO schema_migrations(version, checksum)
VALUES ('032-service-order-relations', '032-service-order-relations-v1')
ON CONFLICT (version) DO NOTHING;
