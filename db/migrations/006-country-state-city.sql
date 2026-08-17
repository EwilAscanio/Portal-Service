-- ============================================================
-- 006 – Location tables: country, state, city
-- ============================================================

-- Country
CREATE TABLE IF NOT EXISTS country (
  id         SERIAL PRIMARY KEY,
  cod_saint  INT UNIQUE NOT NULL,
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_country_name ON country (name);

-- State
CREATE TABLE IF NOT EXISTS state (
  id         SERIAL PRIMARY KEY,
  cod_saint  INT UNIQUE NOT NULL,
  name       VARCHAR(100) NOT NULL,
  country_id INT REFERENCES country(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_state_name ON state (name);
CREATE INDEX IF NOT EXISTS idx_state_country_id ON state (country_id);

-- City
CREATE TABLE IF NOT EXISTS city (
  id         SERIAL PRIMARY KEY,
  cod_saint  INT UNIQUE NOT NULL,
  name       VARCHAR(100) NOT NULL,
  state_id   INT REFERENCES state(id),
  country_id INT REFERENCES country(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_city_name ON city (name);
CREATE INDEX IF NOT EXISTS idx_city_state_id ON city (state_id);
CREATE INDEX IF NOT EXISTS idx_city_country_id ON city (country_id);

-- Triggers for auto-update updated_at
CREATE OR REPLACE FUNCTION set_location_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_country_updated
  BEFORE UPDATE ON country
  FOR EACH ROW EXECUTE FUNCTION set_location_updated_at();

CREATE TRIGGER trg_state_updated
  BEFORE UPDATE ON state
  FOR EACH ROW EXECUTE FUNCTION set_location_updated_at();

CREATE TRIGGER trg_city_updated
  BEFORE UPDATE ON city
  FOR EACH ROW EXECUTE FUNCTION set_location_updated_at();
