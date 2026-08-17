-- ============================================================
-- MaquiTech · Database Schema
-- Migrations 001 – 006 (consolidated)
-- Generated: 2026-07-28
-- ============================================================


-- ============================================================
-- 001 · Roles & Users
-- Applied: 2026-07-20
-- ============================================================

-- Reusable trigger function (used by ALL tables)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- role
CREATE TABLE role (
  id          SMALLSERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "user"
CREATE TABLE "user" (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  login          VARCHAR(60) NOT NULL,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NOT NULL,
  password_hash  TEXT        NOT NULL,
  role_id        SMALLINT    NOT NULL REFERENCES role(id),
  status         VARCHAR(20) NOT NULL DEFAULT 'Active'
                 CHECK (status IN ('Active', 'Inactive')),
  last_access_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_user_login   ON "user" (lower(login));
CREATE UNIQUE INDEX uq_user_email   ON "user" (lower(email));
CREATE INDEX        idx_user_role_id ON "user" (role_id);
CREATE INDEX        idx_user_status ON "user" (status);

CREATE TRIGGER trg_user_set_updated_at
  BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed: role
INSERT INTO role (name, description) VALUES
  ('Administrator', 'Full system access, user management and configuration'),
  ('Supervisor',    'Oversees service orders, technicians and clients'),
  ('Coordinator',   'Coordinates order assignment and technician schedules'),
  ('Technician',    'Executes service orders and logs field work'),
  ('User',          'Basic read-only access');

-- Seed: initial user (bcryptjs, 10 rounds)
-- login: ewil / password: 123456
INSERT INTO "user" (login, name, email, password_hash, role_id, status, last_access_at)
VALUES (
  'ewil',
  'Ewil Ascanio',
  'ewil@maquitech.com',
  '$2b$10$0M3zgHYSwI8.piivMsas.epVDtIdNCEfEOp3hJmz9pj2kdNfGb3AC',
  (SELECT id FROM role WHERE name = 'Administrator'),
  'Active',
  now()
);


-- ============================================================
-- 002 · Technicians
-- Each technician has a unique national ID, name, hourly rate
-- and phone.
-- ============================================================

CREATE TABLE technical (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  national_id VARCHAR(20)   NOT NULL UNIQUE,
  name        VARCHAR(120)  NOT NULL,
  phone       VARCHAR(30),
  email       VARCHAR(150),
  hourly_rate NUMERIC(12,2) CHECK (hourly_rate >= 0),
  status      VARCHAR(20)   NOT NULL DEFAULT 'Active'
              CHECK (status IN ('Active', 'Inactive')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_technical_status ON technical (status);

CREATE TRIGGER trg_technical_set_updated_at
  BEFORE UPDATE ON technical
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed: 5 sample technicians
INSERT INTO technical (national_id, name, phone, email, hourly_rate, status) VALUES
  ('1020304050', 'Andrés Rodríguez', '+57 310 224 8890', 'andres.rodriguez@maquitech.com', 85000.00, 'Active'),
  ('1020304051', 'Camila Herrera',   '+57 315 448 2210', 'camila.herrera@maquitech.com',   90000.00, 'Active'),
  ('1020304052', 'Diego Martínez',   '+57 301 776 5543', 'diego.martinez@maquitech.com',   85000.00, 'Active'),
  ('1020304053', 'Fernanda López',   '+57 312 990 1178', 'fernanda.lopez@maquitech.com',   95000.00, 'Active'),
  ('1020304054', 'Julián Ramírez',   '+57 320 112 6634', 'julian.ramirez@maquitech.com',   80000.00, 'Inactive')
ON CONFLICT (national_id) DO NOTHING;


-- ============================================================
-- 003 · Clients (JSONB sync from Saint ERP)
-- NOTE: Superseded by migration 005.
-- Kept for reproducible history.
-- ============================================================

CREATE TABLE client (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  saint_id    VARCHAR(20) NOT NULL,
  data        JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_client_saint_id ON client (saint_id);

CREATE TRIGGER trg_client_set_updated_at
  BEFORE UPDATE ON client
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 004 · Products
-- Master catalog of products and services.
-- ============================================================

CREATE TABLE product (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(30)   NOT NULL UNIQUE,
  description VARCHAR(255)  NOT NULL,
  type        VARCHAR(100)  NOT NULL,
  brand       VARCHAR(100),
  cost        NUMERIC(14,2) NOT NULL CHECK (cost >= 0),
  price       NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  category    VARCHAR(50)   NOT NULL
              CHECK (category IN ('Main', 'Service', 'Parts')),
  stock       INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status      VARCHAR(20)   NOT NULL DEFAULT 'Active'
              CHECK (status IN ('Active', 'Inactive')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_status   ON product (status);
CREATE INDEX idx_product_category ON product (category);

CREATE TRIGGER trg_product_set_updated_at
  BEFORE UPDATE ON product
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed: 5 sample products
INSERT INTO product (code, description, type, brand, cost, price, category, stock, status) VALUES
  ('EQP-001', 'Atlas Copco GA-37 Compressor', 'Equipment', 'Atlas', 12000000.00, 18000000.00, 'Main',    5,   'Active'),
  ('RPT-001', 'Universal air filter',          'Part',      NULL,      120000.00,    180000.00, 'Parts',   120, 'Active'),
  ('SRV-001', 'Preventive maintenance',        'Service',   NULL,      250000.00,    350000.00, 'Service', 0,   'Active'),
  ('MOB-001', 'Specialized technician',        'Labor',     NULL,       85000.00,     85000.00, 'Service', 0,   'Active'),
  ('VIA-001', 'Domestic travel expense',       'Travel',    NULL,      200000.00,    250000.00, 'Service', 0,   'Active')
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- 005 · Clients — dedicated columns from Saint ERP
-- Replaces the JSONB 'client' table (migration 003).
-- ============================================================

DROP TABLE IF EXISTS client;

CREATE TABLE client (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code VARCHAR(20)   NOT NULL UNIQUE,
  description VARCHAR(255),
  tax_id      VARCHAR(30),
  address_1   VARCHAR(255),
  address_2   VARCHAR(255),
  status      VARCHAR(20)   NOT NULL DEFAULT 'Active'
              CHECK (status IN ('Active', 'Inactive')),
  country     VARCHAR(100),
  state       VARCHAR(100),
  phone       VARCHAR(30),
  email       VARCHAR(150),
  mobile      VARCHAR(30),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_description ON client (description);
CREATE INDEX idx_client_state       ON client (state);
CREATE INDEX idx_client_country     ON client (country);
CREATE INDEX idx_client_status      ON client (status);

CREATE TRIGGER trg_client_set_updated_at
  BEFORE UPDATE ON client
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 006 · Location tables: country, state, city
-- ============================================================

-- country
CREATE TABLE country (
  id         SERIAL       PRIMARY KEY,
  saint_code INT          NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_country_name ON country (name);

CREATE TRIGGER trg_country_set_updated_at
  BEFORE UPDATE ON country
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- state
CREATE TABLE state (
  id         SERIAL       PRIMARY KEY,
  saint_code INT          NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  country_id INT          NOT NULL REFERENCES country(id),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_state_name       ON state (name);
CREATE INDEX idx_state_country_id ON state (country_id);

CREATE TRIGGER trg_state_set_updated_at
  BEFORE UPDATE ON state
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- city
CREATE TABLE city (
  id         SERIAL       PRIMARY KEY,
  saint_code INT          NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  state_id   INT          NOT NULL REFERENCES state(id),
  country_id INT          NOT NULL REFERENCES country(id),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_city_name       ON city (name);
CREATE INDEX idx_city_state_id   ON city (state_id);
CREATE INDEX idx_city_country_id ON city (country_id);

CREATE TRIGGER trg_city_set_updated_at
  BEFORE UPDATE ON city
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
