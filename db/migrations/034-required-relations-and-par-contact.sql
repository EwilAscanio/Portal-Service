-- 034: Relaciones obligatorias y consistencia cliente/planta/contacto/equipo.
-- Requiere resolver o eliminar previamente PAR y ordenes historicas incompletas.

-- Contactos de desarrollo: uno por planta existente, sin duplicar al reaplicar.
INSERT INTO contact (name, client_id, plant_id, phone, email)
SELECT
  left('Contacto de ' || p.name, 150),
  p.client_id,
  p.id,
  c.phone,
  lower(
    'contacto+' || regexp_replace(c.codclie, '[^a-zA-Z0-9]+', '', 'g') ||
    '+' || substr(p.id::text, 1, 8) || '@maquitech.test'
  )
FROM plant p
JOIN client c ON c.id = p.client_id
WHERE NOT EXISTS (
  SELECT 1 FROM contact ct
  WHERE ct.client_id = p.client_id AND ct.plant_id = p.id
);

ALTER TABLE par_header
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contact(id) ON DELETE RESTRICT;

ALTER TABLE par_header DROP COLUMN IF EXISTS atencion;

UPDATE service_order SET amount = 0 WHERE amount IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM equipment WHERE plant_id IS NULL) THEN
    RAISE EXCEPTION '034 abortada: existen equipos sin planta';
  END IF;
  IF EXISTS (
    SELECT 1 FROM service_order
    WHERE client_id IS NULL OR plant_id IS NULL OR equipment_id IS NULL
       OR technical_id IS NULL OR contact_id IS NULL
  ) THEN
    RAISE EXCEPTION '034 abortada: existen ordenes con relaciones incompletas';
  END IF;
  IF EXISTS (
    SELECT 1 FROM par_header
    WHERE client_id IS NULL OR plant_id IS NULL OR contact_id IS NULL
  ) THEN
    RAISE EXCEPTION '034 abortada: existen PAR con relaciones incompletas';
  END IF;
END $$;

ALTER TABLE equipment ALTER COLUMN plant_id SET NOT NULL;
ALTER TABLE service_order ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE service_order ALTER COLUMN plant_id SET NOT NULL;
ALTER TABLE service_order ALTER COLUMN equipment_id SET NOT NULL;
ALTER TABLE service_order ALTER COLUMN technical_id SET NOT NULL;
ALTER TABLE service_order ALTER COLUMN contact_id SET NOT NULL;
ALTER TABLE service_order ALTER COLUMN amount SET NOT NULL;
ALTER TABLE par_header ALTER COLUMN plant_id SET NOT NULL;
ALTER TABLE par_header ALTER COLUMN contact_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plant_id_client_unique') THEN
    ALTER TABLE plant ADD CONSTRAINT plant_id_client_unique UNIQUE (id, client_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_id_client_plant_unique') THEN
    ALTER TABLE equipment ADD CONSTRAINT equipment_id_client_plant_unique
      UNIQUE (id, client_id, plant_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_id_client_plant_unique') THEN
    ALTER TABLE contact ADD CONSTRAINT contact_id_client_plant_unique
      UNIQUE (id, client_id, plant_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_plant_client_fk') THEN
    ALTER TABLE contact ADD CONSTRAINT contact_plant_client_fk
      FOREIGN KEY (plant_id, client_id) REFERENCES plant(id, client_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_plant_client_fk') THEN
    ALTER TABLE equipment ADD CONSTRAINT equipment_plant_client_fk
      FOREIGN KEY (plant_id, client_id) REFERENCES plant(id, client_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_order_plant_client_fk') THEN
    ALTER TABLE service_order ADD CONSTRAINT service_order_plant_client_fk
      FOREIGN KEY (plant_id, client_id) REFERENCES plant(id, client_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_order_equipment_scope_fk') THEN
    ALTER TABLE service_order ADD CONSTRAINT service_order_equipment_scope_fk
      FOREIGN KEY (equipment_id, client_id, plant_id)
      REFERENCES equipment(id, client_id, plant_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_order_contact_scope_fk') THEN
    ALTER TABLE service_order ADD CONSTRAINT service_order_contact_scope_fk
      FOREIGN KEY (contact_id, client_id, plant_id)
      REFERENCES contact(id, client_id, plant_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'par_header_plant_client_fk') THEN
    ALTER TABLE par_header ADD CONSTRAINT par_header_plant_client_fk
      FOREIGN KEY (plant_id, client_id) REFERENCES plant(id, client_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'par_header_contact_scope_fk') THEN
    ALTER TABLE par_header ADD CONSTRAINT par_header_contact_scope_fk
      FOREIGN KEY (contact_id, client_id, plant_id)
      REFERENCES contact(id, client_id, plant_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_email_format_check') THEN
    ALTER TABLE contact ADD CONSTRAINT contact_email_format_check
      CHECK (email IS NULL OR position('@' in email) > 1);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS par_header_contact_id_idx ON par_header(contact_id);

INSERT INTO schema_migrations(version, checksum)
VALUES ('034-required-relations-and-par-contact', '034-required-relations-and-par-contact-v1')
ON CONFLICT (version) DO NOTHING;
