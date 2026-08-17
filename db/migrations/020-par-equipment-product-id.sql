-- 020: Link the PAR main equipment to the product catalog (type 'Equipo')
-- The "producto principal" is chosen from product; keep a reference in par_equipment.

ALTER TABLE par_equipment ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES product(id);

CREATE INDEX IF NOT EXISTS par_equipment_product_id_idx ON par_equipment (product_id);
