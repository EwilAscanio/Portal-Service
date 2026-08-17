-- 011: Rename product.marca → product.brand to match codebase
ALTER TABLE product RENAME COLUMN marca TO brand;
