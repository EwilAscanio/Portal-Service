-- 003 · Client v1 (feature 001)
-- Migration for the client table synced from Saint ERP.
-- Stores all SACLIE fields in a flexible JSONB column.
-- Note: Superseded by migration 005. Kept for reproducible history.

CREATE TABLE client (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saint_id    VARCHAR(20) NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX client_saint_id_unique ON client (saint_id);

CREATE TRIGGER client_set_updated_at
  BEFORE UPDATE ON client
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
