-- 005: Client — dedicated columns from Saint ERP
-- Replaces the 'client' table (JSONB, migration 003) with dedicated columns extracted from Saint.

DROP TABLE IF EXISTS client;

CREATE TABLE client (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  codclie     VARCHAR(20)   NOT NULL UNIQUE,
  description VARCHAR(255),
  rif         VARCHAR(30),
  address1    VARCHAR(255),
  address2    VARCHAR(255),
  status      VARCHAR(5)    NOT NULL DEFAULT '1',
  country     VARCHAR(100),
  state       VARCHAR(100),
  phone       VARCHAR(30),
  email       VARCHAR(150),
  mobile      VARCHAR(30),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX client_description_idx ON client (description);
CREATE INDEX client_state_idx       ON client (state);
CREATE INDEX client_country_idx     ON client (country);
CREATE INDEX client_status_idx      ON client (status);

-- Trigger for auto updated_at
CREATE OR REPLACE FUNCTION set_client_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_updated_at ON client;
CREATE TRIGGER client_updated_at
  BEFORE UPDATE ON client
  FOR EACH ROW
  EXECUTE FUNCTION set_client_updated_at();
