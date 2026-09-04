-- 001 · Roles y usuarios (feature 002)
-- Aplicada el 2026-07-20. Se conserva como referencia reproducible.

CREATE TABLE role (
  id          SMALLSERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login          VARCHAR(60) NOT NULL,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NOT NULL,
  password_hash  TEXT NOT NULL,
  role_id        SMALLINT NOT NULL REFERENCES role(id),
  status         VARCHAR(20) NOT NULL DEFAULT 'Activo'
                 CHECK (status IN ('Activo', 'Inactivo')),
  last_access_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX user_login_unique ON users (lower(login));
CREATE UNIQUE INDEX user_email_unique ON users (lower(email));
CREATE INDEX user_role_id_idx ON users (role_id);
CREATE INDEX user_status_idx ON users (status);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed: roles
INSERT INTO role (name, description) VALUES
  ('Administrador', 'Acceso total al sistema, gestión de usuarios y configuración'),
  ('Supervisor',    'Supervisa órdenes de servicio, técnicos y clientes'),
  ('Coordinador',   'Coordina asignación de órdenes y agenda de técnicos'),
  ('Técnico',       'Ejecuta órdenes de servicio y registra trabajos en campo'),
  ('Usuario',       'Acceso básico de consulta');

-- Seed: usuario inicial (password hasheado con bcryptjs, 10 rounds)
-- login: ewil / password: 123456
INSERT INTO users (login, name, email, password_hash, role_id, status, last_access_at)
VALUES (
  'ewil',
  'Ewil Ascanio',
  'ewil@maquitech.com',
  '$2b$10$0M3zgHYSwI8.piivMsas.epVDtIdNCEfEOp3hJmz9pj2kdNfGb3AC',
  (SELECT id FROM role WHERE name = 'Administrador'),
  'Activo',
  now()
);

-- 002: Tabla technicians
-- Cada técnico tiene un código único, cédula, nombre, costo/hora y teléfono.

CREATE TABLE IF NOT EXISTS technical (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula        VARCHAR(20) NOT NULL UNIQUE,
  name        VARCHAR(120) NOT NULL,
  phone       VARCHAR(30),
  email       VARCHAR(150),
  status      VARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo','Inactivo')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS technical_status_idx ON technical (status);
CREATE INDEX IF NOT EXISTS technical_cedula_idx   ON technical (cedula);

-- Trigger para updated_at automático
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

-- Datos semilla (5 técnicos de ejemplo)
INSERT INTO technical (cedula, name, phone, email, status) VALUES
  ('1020304050', 'Andrés Rodríguez', '+57 310 224 8890', 'andres.rodriguez@maquitech.com', 'Activo'),
  ('1020304051', 'Camila Herrera', '+57 315 448 2210', 'camila.herrera@maquitech.com', 'Activo'),
  ('1020304052', 'Diego Martínez', '+57 301 776 5543', 'diego.martinez@maquitech.com', 'Activo'),
  ('1020304053', 'Fernanda López', '+57 312 990 1178', 'fernanda.lopez@maquitech.com', 'Activo'),
  ('1020304054', 'Julián Ramírez', '+57 320 112 6634', 'julian.ramirez@maquitech.com', 'Inactivo')
ON CONFLICT (cedula) DO NOTHING;


-- 004: Tabla productos
-- Catálogo maestro de productos y servicios.

CREATE TABLE product (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(30)   NOT NULL UNIQUE,
  description VARCHAR(255)  NOT NULL,
  type        VARCHAR(100)  NOT NULL,
  marca       VARCHAR(100),
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

-- Trigger para updated_at automático
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

-- Datos semilla (5 productos de ejemplo)
INSERT INTO product (code, description, type, brand, cost, price, category, stock, status) VALUES
  ('EQP-001', 'Compresor Atlas Copco GA-37',       'Equipo',      'Atlas',    12000000.00, 18000000.00, 'Principal',  5,   'Activo'),
  ('RPT-001', 'Filtro de aire universal',           'Repuesto',    NULL,         120000.00,    180000.00, 'Repuestos', 120, 'Activo'),
  ('SRV-001', 'Mantenimiento preventivo',           'Servicio',    NULL,         250000.00,    350000.00, 'Servicio',    0, 'Activo'),
  ('MOB-001', 'Técnico especializado',              'Mano de Obra', NULL,         85000.00,     85000.00, 'Servicio',    0, 'Activo'),
  ('VIA-001', 'Viático nacional',                   'Viático',     NULL,         200000.00,    250000.00, 'Servicio',    0, 'Activo')
ON CONFLICT (code) DO NOTHING;

-- 005: Clientes — columnas dedicadas desde Saint ERP
-- Reemplaza la tabla 'clients' (JSONB) por 'clientes' con 11 columnas extraídas de Saint.

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

-- Trigger para updated_at automático
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

-- ============================================================
-- 006 – Tablas de ubicación: paises, estados, ciudades
-- ============================================================

-- Paises
CREATE TABLE IF NOT EXISTS country (
  id         SERIAL PRIMARY KEY,
  cod_saint  INT UNIQUE NOT NULL,
  nombre     VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_country_name ON country (nombre);

-- Estados
CREATE TABLE IF NOT EXISTS state (
  id         SERIAL PRIMARY KEY,
  cod_saint  INT UNIQUE NOT NULL,
  nombre     VARCHAR(100) NOT NULL,
  country_id    INT REFERENCES country(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_state_name ON state (nombre);
CREATE INDEX IF NOT EXISTS idx_state_country_id ON state (country_id);

-- Ciudades
CREATE TABLE IF NOT EXISTS city (
  id         SERIAL PRIMARY KEY,
  cod_saint  INT UNIQUE NOT NULL,
  nombre     VARCHAR(100) NOT NULL,
  state_id  INT REFERENCES state(id),
  country_id    INT REFERENCES country(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_city_name ON city (nombre);
CREATE INDEX IF NOT EXISTS idx_city_state_id ON city (state_id);
CREATE INDEX IF NOT EXISTS idx_city_country_id ON city (country_id);

-- Triggers para auto-update updated_at
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
