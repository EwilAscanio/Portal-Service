ALTER TABLE contact ADD COLUMN IF NOT EXISTS department VARCHAR(150);

INSERT INTO schema_migrations(version, checksum)
VALUES ('047-contact-department', '047-contact-department-v1')
ON CONFLICT (version) DO NOTHING;
