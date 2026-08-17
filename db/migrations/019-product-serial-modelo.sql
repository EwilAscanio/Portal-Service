-- 019: Add serial and modelo to product
-- The main equipment (PAR) is sourced from the product catalog (type 'Equipo');
-- its data includes serial and modelo.

ALTER TABLE product ADD COLUMN IF NOT EXISTS serial VARCHAR(50);
ALTER TABLE product ADD COLUMN IF NOT EXISTS modelo VARCHAR(100);

CREATE INDEX IF NOT EXISTS product_serial_idx ON product (serial);
CREATE INDEX IF NOT EXISTS product_modelo_idx ON product (modelo);
