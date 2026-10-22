-- Horas cotizadas: qty es el presupuesto compartido, sin multiplicador comercial.
ALTER TABLE product ADD COLUMN requires_technician BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE product ADD CONSTRAINT product_labor_category_check CHECK (NOT requires_technician OR category = 'Servicio');

-- Clasificación inicial por códigos conocidos del catálogo, nunca por coincidencias de texto.
UPDATE product SET requires_technician = true
WHERE category = 'Servicio' AND code IN (
  'ESP001','MOB-001','SRV-AYUDANTES','SRV-CENTAC','SRV-INSTRUM',
  'SRV-TEC-123','SRV-TEC-123-AD','SRV-TSU-SEG',
  'TEC010','TEC011','TEC012','TEC013','TSU001'
);

ALTER TABLE par_item ADD COLUMN requires_technician BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE par_item ADD CONSTRAINT par_item_labor_category_check CHECK (NOT requires_technician OR categoria = 'Servicio');
UPDATE par_item i SET requires_technician = p.requires_technician
FROM product p WHERE p.id = i.product_id AND i.categoria = 'Servicio';
ALTER TABLE par_header ADD COLUMN budgeted_hours NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (budgeted_hours >= 0);
UPDATE par_header h SET budgeted_hours = COALESCE((
  SELECT SUM(i.qty) FROM par_item i WHERE i.par_id = h.id AND i.requires_technician
), 0);

-- No se inventan distribuciones a partir de worked_hours de órdenes anteriores.
ALTER TABLE service_order
  ADD COLUMN labor_review_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN legacy_worked_hours NUMERIC(8,2),
  ADD COLUMN labor_review_note TEXT,
  ADD COLUMN labor_reviewed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN labor_reviewed_at TIMESTAMPTZ;
UPDATE service_order SET legacy_worked_hours = worked_hours;

CREATE TABLE service_order_labor_allocation (
  id BIGSERIAL PRIMARY KEY,
  service_order_id INTEGER NOT NULL REFERENCES service_order(id) ON DELETE CASCADE,
  par_item_id INTEGER REFERENCES par_item(id) ON DELETE SET NULL,
  source_item_id INTEGER NOT NULL,
  source_item_no INTEGER NOT NULL,
  product_id UUID REFERENCES product(id) ON DELETE RESTRICT,
  product_code VARCHAR(30),
  description VARCHAR(255) NOT NULL,
  technical_id UUID NOT NULL REFERENCES technical(id) ON DELETE RESTRICT,
  technician_name VARCHAR(120) NOT NULL,
  hours NUMERIC(10,2) NOT NULL CHECK (hours > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_order_id, source_item_id, technical_id)
);
-- Las copias de código, descripción, técnico e ID original sobreviven a la edición
-- del PAR cuando todas sus órdenes están canceladas. El FK vivo puede quedar nulo.
CREATE INDEX service_order_labor_item_idx ON service_order_labor_allocation(par_item_id) WHERE par_item_id IS NOT NULL;
CREATE INDEX service_order_labor_technical_idx ON service_order_labor_allocation(technical_id);
CREATE INDEX service_order_labor_review_idx ON service_order(par_id) WHERE labor_review_required AND status <> 'Cancelada';
