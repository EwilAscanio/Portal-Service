-- 001 · Role & User (feature 002)
-- Applied: 2026-07-20. Kept as reproducible reference.

CREATE TABLE role (
  id          SMALLSERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "user" (
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

CREATE UNIQUE INDEX user_login_unique ON "user" (lower(login));
CREATE UNIQUE INDEX user_email_unique ON "user" (lower(email));
CREATE INDEX user_role_id_idx ON "user" (role_id);
CREATE INDEX user_status_idx ON "user" (status);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_set_updated_at
  BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed: roles
INSERT INTO role (name, description) VALUES
  ('Administrador', 'Acceso total al sistema, gestión de usuarios y configuración'),
  ('Supervisor',    'Supervisa órdenes de servicio, técnicos y clientes'),
  ('Coordinador',   'Coordina asignación de órdenes y agenda de técnicos'),
  ('Técnico',       'Ejecuta órdenes de servicio y registra trabajos en campo'),
  ('Usuario',       'Acceso básico de consulta');

-- Seed: initial user (bcryptjs, 10 rounds)
-- login: ewil / password: 123456
INSERT INTO "user" (login, name, email, password_hash, role_id, status, last_access_at)
VALUES (
  'ewil',
  'Ewil Ascanio',
  'ewil@maquitech.com',
  '$2b$10$0M3zgHYSwI8.piivMsas.epVDtIdNCEfEOp3hJmz9pj2kdNfGb3AC',
  (SELECT id FROM role WHERE name = 'Administrador'),
  'Activo',
  now()
);
