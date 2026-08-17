-- 024-par-templates.sql
-- Plantillas de PAR: modelos reutilizables de ítems (repuestos / mano de obra)
-- que se cargan al armar un PAR. El campo `type` solo clasifica la plantilla
-- (no se refleja en los ítems del PAR).

CREATE TABLE IF NOT EXISTS par_template (
  id          SERIAL PRIMARY KEY,
  type        VARCHAR(50) NOT NULL DEFAULT 'General',
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS par_template_item (
  id             SERIAL PRIMARY KEY,
  template_id    INTEGER NOT NULL REFERENCES par_template(id) ON DELETE CASCADE,
  item_no        INTEGER NOT NULL DEFAULT 1,
  product_id     UUID REFERENCES product(id) ON DELETE SET NULL,
  descripcion    VARCHAR(255) NOT NULL,
  qty            NUMERIC(10,2),
  categoria      VARCHAR(50),
  ccn            VARCHAR(30),
  us_list        VARCHAR(30),
  multiplicador  NUMERIC(8,4) NOT NULL DEFAULT 1 CHECK (multiplicador >= 0),
  valor_unit_usd NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_unit_usd >= 0),
  valor_percent  NUMERIC(8,4),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS par_template_item_template_id_idx
  ON par_template_item(template_id);
