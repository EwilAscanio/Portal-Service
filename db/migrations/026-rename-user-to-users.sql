-- 026-rename-user-to-users.sql
-- Renombra la tabla "user" → users para eliminar la dependencia de comillas dobles.
-- "user" es una palabra reservada en PostgreSQL; usarla como nombre de tabla es mala práctica.
--
-- PostgreSQL actualiza automáticamente las FKs que apuntan a la tabla renombrada
-- (notification.user_id, par_header.created_by, par_header.approved_by).
-- Los nombres de las constraints, índices y triggers NO se actualizan solos,
-- así que los renombramos explícitamente para mantener consistencia.
-- Ejecutar statement por statement (no en transacción, el MCP puede tener issues con RENAME en transactional).
--
-- Solo forward (no reaplicar).

-- 1) Renombrar tabla
ALTER TABLE "user" RENAME TO users;

-- 2) Renombrar constraints
ALTER TABLE users RENAME CONSTRAINT user_pkey TO users_pkey;
ALTER TABLE users RENAME CONSTRAINT user_role_id_fkey TO users_role_id_fkey;
ALTER TABLE users RENAME CONSTRAINT user_status_check TO users_status_check;

-- 3) Renombrar constraints NOT NULL
ALTER TABLE users RENAME CONSTRAINT user_id_not_null TO users_id_not_null;
ALTER TABLE users RENAME CONSTRAINT user_login_not_null TO users_login_not_null;
ALTER TABLE users RENAME CONSTRAINT user_name_not_null TO users_name_not_null;
ALTER TABLE users RENAME CONSTRAINT user_email_not_null TO users_email_not_null;
ALTER TABLE users RENAME CONSTRAINT user_password_hash_not_null TO users_password_hash_not_null;
ALTER TABLE users RENAME CONSTRAINT user_role_id_not_null TO users_role_id_not_null;
ALTER TABLE users RENAME CONSTRAINT user_status_not_null TO users_status_not_null;
ALTER TABLE users RENAME CONSTRAINT user_created_at_not_null TO users_created_at_not_null;
ALTER TABLE users RENAME CONSTRAINT user_updated_at_not_null TO users_updated_at_not_null;

-- 4) Renombrar índices
ALTER INDEX user_pkey RENAME TO users_pkey;
ALTER INDEX user_login_unique RENAME TO users_login_unique;
ALTER INDEX user_email_unique RENAME TO users_email_unique;
ALTER INDEX user_role_id_idx RENAME TO users_role_id_idx;
ALTER INDEX user_status_idx RENAME TO users_status_idx;

-- 5) Renombrar trigger
ALTER TRIGGER user_set_updated_at ON users RENAME TO users_set_updated_at;
