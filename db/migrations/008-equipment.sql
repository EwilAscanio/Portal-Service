-- 008-equipment.sql
-- Tabla de equipos

CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  serial VARCHAR(50) NOT NULL UNIQUE,
  client_description VARCHAR(200),
  location VARCHAR(200),
  status VARCHAR(30) NOT NULL DEFAULT 'Operativo' CHECK (status IN ('Operativo', 'En Mantenimiento', 'Fuera de Servicio')),
  last_maintenance TIMESTAMPTZ,
  next_maintenance TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS equipment_status_idx ON equipment(status);
CREATE INDEX IF NOT EXISTS equipment_serial_idx ON equipment(serial);

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION set_equipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_equipment_updated_at ON equipment;
CREATE TRIGGER trg_equipment_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW
  EXECUTE FUNCTION set_equipment_updated_at();
