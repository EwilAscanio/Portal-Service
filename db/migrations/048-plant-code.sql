ALTER TABLE plant ADD COLUMN IF NOT EXISTS code VARCHAR(50);

UPDATE plant p SET code = generated.new_code
FROM (
  SELECT id, 'P-' || lpad((row_number() OVER (PARTITION BY client_id ORDER BY created_at, name))::text, 3, '0') AS new_code
  FROM plant
) generated
WHERE p.id = generated.id AND p.code IS NULL;

ALTER TABLE plant ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS plant_client_code_uidx ON plant(client_id, code);

INSERT INTO schema_migrations(version, checksum)
VALUES ('048-plant-code', '048-plant-code-v1')
ON CONFLICT (version) DO NOTHING;
