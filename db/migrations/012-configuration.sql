-- 012-configuration.sql
-- Configuración de la empresa (fila única, id = 1)

CREATE TABLE IF NOT EXISTS configuration (
  id           SMALLINT      PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name VARCHAR(200)  NOT NULL DEFAULT 'Maquitech S.A.S.',
  rif          VARCHAR(30),
  phone        VARCHAR(30),
  email        VARCHAR(150),
  address      VARCHAR(255),
  website      VARCHAR(150),
  city         VARCHAR(100),
  country      VARCHAR(100),
  logo         VARCHAR(255)  NOT NULL DEFAULT '/logo.webp',
  facebook     VARCHAR(150),
  instagram    VARCHAR(150),
  linkedin     VARCHAR(150),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Fila inicial única
INSERT INTO configuration (id, company_name, rif, phone, email, address, website)
VALUES (
  1,
  'Maquitech S.A.S.',
  '901.456.789-1',
  '+57 601 745 8890',
  'contacto@maquitech.com',
  'Cra 45 #128-30, Bogotá D.C.',
  'www.maquitech.com'
)
ON CONFLICT (id) DO NOTHING;

-- Trigger para auto updated_at
CREATE OR REPLACE FUNCTION set_configuration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS configuration_updated_at ON configuration;
CREATE TRIGGER configuration_updated_at
  BEFORE UPDATE ON configuration
  FOR EACH ROW
  EXECUTE FUNCTION set_configuration_updated_at();

-- Evita eliminar la única fila de configuración
CREATE OR REPLACE FUNCTION prevent_configuration_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'La configuración de la empresa no puede eliminarse.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS configuration_no_delete ON configuration;
CREATE TRIGGER configuration_no_delete
  BEFORE DELETE ON configuration
  FOR EACH ROW
  EXECUTE FUNCTION prevent_configuration_delete();
