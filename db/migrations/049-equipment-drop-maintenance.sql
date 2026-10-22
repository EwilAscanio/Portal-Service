ALTER TABLE equipment DROP COLUMN IF EXISTS last_maintenance;
ALTER TABLE equipment DROP COLUMN IF EXISTS next_maintenance;

INSERT INTO schema_migrations(version, checksum)
VALUES ('049-equipment-drop-maintenance', '049-equipment-drop-maintenance-v1')
ON CONFLICT (version) DO NOTHING;
