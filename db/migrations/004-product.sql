-- 004: Table product
-- Master catalog of products and services.

CREATE TABLE IF NOT EXISTS product (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(30)   NOT NULL UNIQUE,
  description VARCHAR(255)  NOT NULL,
  type        VARCHAR(100)  NOT NULL,
  brand       VARCHAR(100),
  cost        NUMERIC(14,2) NOT NULL CHECK (cost >= 0),
  price       NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  category    VARCHAR(50)   NOT NULL CHECK (category IN ('Principal','Servicio','Repuestos')),
  stock       INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status      VARCHAR(20)   NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo','Inactivo')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_status_idx  ON product (status);
CREATE INDEX IF NOT EXISTS product_category_idx ON product (category);
CREATE INDEX IF NOT EXISTS product_code_idx     ON product (code);

-- Trigger for auto updated_at
CREATE OR REPLACE FUNCTION set_product_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_updated_at ON product;
CREATE TRIGGER product_updated_at
  BEFORE UPDATE ON product
  FOR EACH ROW
  EXECUTE FUNCTION set_product_updated_at();

-- Seed data (5 sample products)
INSERT INTO product (code, description, type, brand, cost, price, category, stock, status) VALUES
  ('EQP-001', 'Compresor Atlas Copco GA-37',       'Equipo',      'Atlas',    12000000.00, 18000000.00, 'Principal',  5,   'Activo'),
  ('RPT-001', 'Filtro de aire universal',           'Repuesto',    NULL,         120000.00,    180000.00, 'Repuestos', 120, 'Activo'),
  ('SRV-001', 'Mantenimiento preventivo',           'Servicio',    NULL,         250000.00,    350000.00, 'Servicio',    0,  'Activo'),
  ('MOB-001', 'Técnico especializado',              'Mano de Obra', NULL,         85000.00,     85000.00, 'Servicio',    0,  'Activo'),
  ('VIA-001', 'Viático nacional',                   'Viático',     NULL,         200000.00,    250000.00, 'Servicio',    0,  'Activo')
ON CONFLICT (code) DO NOTHING;
