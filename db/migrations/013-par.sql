-- 013-par.sql
-- Planilla de Atención de Requisiciones (PAR)
-- Cabecera + líneas de productos + líneas de mano de obra/servicios
-- Adaptado al schema real de db_service: client / product / "user"

-- ============================================================
-- CABECERA DEL PAR
-- ============================================================
CREATE TABLE IF NOT EXISTS par_headers (
  id SERIAL PRIMARY KEY,
  par_number VARCHAR(20) NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES client(id),
  main_product_id UUID NOT NULL REFERENCES product(id),
  status VARCHAR(20) NOT NULL DEFAULT 'Borrador'
    CHECK (status IN ('Borrador', 'Pendiente', 'Aprobado', 'Rechazado')),
  exchange_rate NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (exchange_rate >= 0),
  observations TEXT,
  total_products NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_labor NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_bs NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES "user"(id),
  approved_by UUID REFERENCES "user"(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS par_headers_status_idx ON par_headers(status);
CREATE INDEX IF NOT EXISTS par_headers_client_idx ON par_headers(client_id);
CREATE INDEX IF NOT EXISTS par_headers_created_by_idx ON par_headers(created_by);

-- ============================================================
-- LÍNEAS DE PRODUCTO (repuestos / materiales / equipos)
-- ============================================================
CREATE TABLE IF NOT EXISTS par_product_lines (
  id SERIAL PRIMARY KEY,
  par_id INTEGER NOT NULL REFERENCES par_headers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES product(id),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS par_product_lines_par_id_idx ON par_product_lines(par_id);

-- ============================================================
-- LÍNEAS DE MANO DE OBRA / SERVICIOS (catálogo tipo Servicio)
-- ============================================================
CREATE TABLE IF NOT EXISTS par_labor_lines (
  id SERIAL PRIMARY KEY,
  par_id INTEGER NOT NULL REFERENCES par_headers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES product(id),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS par_labor_lines_par_id_idx ON par_labor_lines(par_id);

-- ============================================================
-- TRIGGER updated_at para par_headers
-- ============================================================
CREATE OR REPLACE FUNCTION set_par_headers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_par_headers_updated_at ON par_headers;
CREATE TRIGGER trg_par_headers_updated_at
  BEFORE UPDATE ON par_headers
  FOR EACH ROW
  EXECUTE FUNCTION set_par_headers_updated_at();

-- ============================================================
-- SECUENCIA PARA CORRELATIVO (7 dígitos: 0000001)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS par_number_seq START 1;
