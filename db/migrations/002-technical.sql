-- 002: Table technical
-- Technicians registry with basic contact info.

CREATE TABLE IF NOT EXISTS technical (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula      VARCHAR(20) NOT NULL UNIQUE,
  name        VARCHAR(120) NOT NULL,
  phone       VARCHAR(30),
  email       VARCHAR(150),
  status      VARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo','Inactivo')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS technical_status_idx ON technical (status);
CREATE INDEX IF NOT EXISTS technical_cedula_idx ON technical (cedula);

-- Trigger for auto updated_at
CREATE OR REPLACE FUNCTION set_technical_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS technical_updated_at ON technical;
CREATE TRIGGER technical_updated_at
  BEFORE UPDATE ON technical
  FOR EACH ROW
  EXECUTE FUNCTION set_technical_updated_at();

-- Seed data
INSERT INTO technical (cedula, name, phone, email, status) VALUES
  ('1020304050', 'Andrés Rodríguez', '+57 310 224 8890', 'andres.rodriguez@maquitech.com', 'Activo'),
  ('1020304051', 'Camila Herrera', '+57 315 448 2210', 'camila.herrera@maquitech.com', 'Activo'),
  ('1020304052', 'Diego Martínez', '+57 301 776 5543', 'diego.martinez@maquitech.com', 'Activo'),
  ('1020304053', 'Fernanda López', '+57 312 990 1178', 'fernanda.lopez@maquitech.com', 'Activo'),
  ('1020304054', 'Julián Ramírez', '+57 320 112 6634', 'julian.ramirez@maquitech.com', 'Inactivo')
ON CONFLICT (cedula) DO NOTHING;
