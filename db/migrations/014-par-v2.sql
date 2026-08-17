-- 014-par-v2.sql
-- Planilla de Atención de Requisiciones (PAR) — V2 conectado a PostgreSQL.
-- Sustituye al módulo V1 (par_headers / par_product_lines / par_labor_lines).
-- Modelo de 3 tablas: cabecera + equipos (incluye el equipo principal) + ítems (productos adicionales).
-- Adaptado al schema real de db_service: client / product / equipment / "user".

-- ============================================================
-- CABECERA DEL PAR V2
-- ============================================================
CREATE TABLE IF NOT EXISTS par_header (
  id SERIAL PRIMARY KEY,
  par_number VARCHAR(20) NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES client(id),
  status VARCHAR(20) NOT NULL DEFAULT 'Creado'
    CHECK (status IN ('Creado', 'Aprobado', 'En Servicio', 'Finalizado', 'Rechazado')),
  exchange_rate NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (exchange_rate >= 0),
  atencion VARCHAR(200),
  fecha_emision DATE,
  observations TEXT,
  elaborado_por VARCHAR(120),
  revisado_por VARCHAR(120),
  total_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_bs NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES "user"(id),
  approved_by UUID REFERENCES "user"(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS par_header_status_idx ON par_header(status);
CREATE INDEX IF NOT EXISTS par_header_client_idx ON par_header(client_id);
CREATE INDEX IF NOT EXISTS par_header_created_by_idx ON par_header(created_by);

-- ============================================================
-- EQUIPOS DEL PAR V2 (incluye el equipo principal con is_main)
-- ============================================================
CREATE TABLE IF NOT EXISTS par_equipment (
  id SERIAL PRIMARY KEY,
  par_id INTEGER NOT NULL REFERENCES par_header(id) ON DELETE CASCADE,
  item_no INTEGER NOT NULL DEFAULT 1,
  is_main BOOLEAN NOT NULL DEFAULT FALSE,
  equipment_id UUID REFERENCES equipment(id),
  tipo VARCHAR(120),
  marca VARCHAR(100),
  serial VARCHAR(50),
  modelo VARCHAR(100),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS par_equipment_par_id_idx ON par_equipment(par_id);

-- ============================================================
-- ÍTEMS / PRODUCTOS ADICIONALES DEL PAR V2
-- ============================================================
CREATE TABLE IF NOT EXISTS par_item (
  id SERIAL PRIMARY KEY,
  par_id INTEGER NOT NULL REFERENCES par_header(id) ON DELETE CASCADE,
  item_no INTEGER NOT NULL DEFAULT 1,
  product_id UUID REFERENCES product(id),
  descripcion VARCHAR(255),
  qty NUMERIC(10,2),
  categoria VARCHAR(50),
  ccn VARCHAR(30),
  us_list VARCHAR(30),
  multiplicador NUMERIC(8,4) NOT NULL DEFAULT 1 CHECK (multiplicador >= 0),
  valor_unit_usd NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_unit_usd >= 0),
  valor_percent NUMERIC(8,4),
  line_total_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS par_item_par_id_idx ON par_item(par_id);

-- ============================================================
-- TRIGGER updated_at para par_header
-- ============================================================
CREATE OR REPLACE FUNCTION set_par_header_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_par_header_updated_at ON par_header;
CREATE TRIGGER trg_par_header_updated_at
  BEFORE UPDATE ON par_header
  FOR EACH ROW
  EXECUTE FUNCTION set_par_header_updated_at();

-- ============================================================
-- SECUENCIA PARA CORRELATIVO (7 dígitos: 0000001, independiente del V1)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS par_number_seq START 1;

-- ============================================================
-- SEED: conceptos laborales y de gastos del PAR V2 (catálogo de servicios)
-- Valores tomados del documento PAR 0010 original.
-- ============================================================
INSERT INTO product (code, description, type, brand, cost, price, category, stock, status) VALUES
  ('SRV-CENTAC',     'Especialista CENTAC',                      'Servicio',   NULL, 43.00,   43.00,   'Servicio', 0, 'Activo'),
  ('SRV-TEC-123',    'Técnico No. 1, 2 Y 3',                     'Servicio',   NULL, 25.00,   25.00,   'Servicio', 0, 'Activo'),
  ('SRV-TEC-123-AD', 'Técnico No. 1, 2 Y 3 (Servicio Adicional)','Servicio',   NULL, 21.00,   21.00,   'Servicio', 0, 'Activo'),
  ('SRV-INSTRUM',    'Instrumentista',                           'Servicio',   NULL, 31.00,   31.00,   'Servicio', 0, 'Activo'),
  ('SRV-AYUDANTES',  'Ayudantes',                                'Servicio',   NULL, 17.50,   17.50,   'Servicio', 0, 'Activo'),
  ('SRV-VIAJE-URB',  'Horas de Viaje urbanos (Valencia Guacara)','Servicio',   NULL, 18.00,   18.00,   'Servicio', 0, 'Activo'),
  ('SRV-VIAJE-EXT',  'Horas de Viaje extra Urbanos (Baremos)',   'Servicio',   NULL, 20.00,   20.00,   'Servicio', 0, 'Activo'),
  ('SRV-DIA-LIBRE',  'Horas día libre compensatorio',            'Servicio',   NULL, 0,       0,       'Servicio', 0, 'Activo'),
  ('SRV-POLIZAS',    'Pólizas responsabilidad y acc. 60%',       'Servicio',   NULL, 6.00,    6.00,    'Servicio', 0, 'Activo'),
  ('SRV-TSU-SEG',    'T.S.U. Seguridad 60%',                     'Servicio',   NULL, 40.00,   40.00,   'Servicio', 0, 'Activo'),
  ('SRV-CERT-SEG',   'Certificados de Seguridad',                'Servicio',   NULL, 20.00,   20.00,   'Servicio', 0, 'Activo'),
  ('SRV-CONSUMIBLES','Consumibles',                              'Servicio',   NULL, 100.00,  100.00,  'Servicio', 0, 'Activo'),
  ('SRV-VIATICOS',   'Viáticos',                                 'Servicio',   NULL, 15.00,   15.00,   'Servicio', 0, 'Activo'),
  ('SRV-HOSPEDAJE',  'Hospedaje',                                'Servicio',   NULL, 0,       0,       'Servicio', 0, 'Activo'),
  ('SRV-TRANSPORTE', 'Transporte',                               'Servicio',   NULL, 0,       0,       'Servicio', 0, 'Activo'),
  ('SRV-GASOL-URB',  'Otros (Gasolina) Urbana',                  'Servicio',   NULL, 0.70,    0.70,    'Servicio', 0, 'Activo'),
  ('SRV-GASOL-EXT',  'Otros (Gasolina) Extra Urbana',            'Servicio',   NULL, 0,       0,       'Servicio', 0, 'Activo')
ON CONFLICT (code) DO NOTHING;
