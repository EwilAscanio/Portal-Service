-- 035: Rol con acceso funcional completo.

INSERT INTO role (name, description)
VALUES ('Superadministrador', 'Acceso funcional completo al sistema')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO schema_migrations(version, checksum)
VALUES ('035-add-super-administrator-role', '035-add-super-administrator-role-v1')
ON CONFLICT (version) DO NOTHING;
