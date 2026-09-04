-- 027-par-equipment-drop-product-id.sql
-- El PAR deja de ligar equipos al catálogo product (type 'Equipo').
-- La FK viva es equipment_id → equipment(id). El snapshot tipo/marca/serial/modelo se conserva.
-- Solo forward (no reaplicar).

ALTER TABLE par_equipment DROP COLUMN IF EXISTS product_id;
