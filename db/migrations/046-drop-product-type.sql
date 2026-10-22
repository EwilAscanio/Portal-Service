ALTER TABLE product DROP COLUMN IF EXISTS type;

INSERT INTO schema_migrations(version, checksum)
VALUES ('046-drop-product-type', '046-drop-product-type-v1')
ON CONFLICT (version) DO NOTHING;
