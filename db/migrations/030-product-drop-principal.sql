-- 030-product-drop-principal.sql
-- Elimina la categoría 'Principal' del catálogo de productos.
-- Los 2 productos existentes (ACC-400, EQP-001, tipo 'Equipo') se reclasifican
-- a 'Servicio' y el CHECK de la columna category se limita a Servicio/Repuestos.

UPDATE product SET category = 'Servicio' WHERE category = 'Principal';

ALTER TABLE product DROP CONSTRAINT product_category_check;
ALTER TABLE product ADD CONSTRAINT product_category_check
  CHECK (category IN ('Servicio', 'Repuestos'));