-- Centraliza la clasificación operativa en product.category.
-- Los registros que antes usaban product.type = 'Equipo' se conservan inactivos
-- para evitar que aparezcan como productos seleccionables en nuevos PAR.
UPDATE product
SET status = 'Inactivo'
WHERE lower(trim(type)) = 'equipo';

UPDATE product
SET category = CASE
  WHEN lower(trim(category)) = 'repuestos' OR lower(trim(type)) LIKE 'repuest%' THEN 'Repuestos'
  ELSE 'Servicio'
END
WHERE category IS NULL OR category NOT IN ('Servicio', 'Repuestos');

UPDATE par_item item
SET categoria = product.category
FROM product
WHERE item.product_id = product.id;

UPDATE par_template_item item
SET categoria = product.category
FROM product
WHERE item.product_id = product.id;

UPDATE par_item
SET categoria = CASE
  WHEN categoria = 'Repuestos y Consumibles' THEN 'Repuestos'
  ELSE 'Servicio'
END
WHERE categoria IS NULL OR categoria NOT IN ('Servicio', 'Repuestos');

UPDATE par_template_item
SET categoria = CASE
  WHEN categoria = 'Repuestos y Consumibles' THEN 'Repuestos'
  ELSE 'Servicio'
END
WHERE categoria IS NULL OR categoria NOT IN ('Servicio', 'Repuestos');

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'product'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%category%'
  LOOP
    EXECUTE format('ALTER TABLE product DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE product
  ADD CONSTRAINT product_category_check CHECK (category IN ('Servicio', 'Repuestos'));

ALTER TABLE par_item
  ALTER COLUMN categoria SET DEFAULT 'Servicio',
  ALTER COLUMN categoria SET NOT NULL,
  ADD CONSTRAINT par_item_category_check CHECK (categoria IN ('Servicio', 'Repuestos'));

ALTER TABLE par_template_item
  ALTER COLUMN categoria SET DEFAULT 'Servicio',
  ALTER COLUMN categoria SET NOT NULL,
  ADD CONSTRAINT par_template_item_category_check CHECK (categoria IN ('Servicio', 'Repuestos'));

ALTER TABLE product ALTER COLUMN type DROP NOT NULL;

INSERT INTO schema_migrations(version, checksum)
VALUES ('045-normalize-product-category', '045-normalize-product-category-v1')
ON CONFLICT (version) DO NOTHING;
