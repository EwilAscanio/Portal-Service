-- 037: Trazabilidad y control transaccional de la replica local de clientes Saint.

ALTER TABLE client
  ADD COLUMN IF NOT EXISTS source_system VARCHAR(30) NOT NULL DEFAULT 'Saint',
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS integration_sync_run (
  id BIGSERIAL PRIMARY KEY,
  source_system VARCHAR(30) NOT NULL,
  entity_name VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('Running', 'Completed', 'Failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  received_count INTEGER NOT NULL DEFAULT 0 CHECK (received_count >= 0),
  inserted_count INTEGER NOT NULL DEFAULT 0 CHECK (inserted_count >= 0),
  updated_count INTEGER NOT NULL DEFAULT 0 CHECK (updated_count >= 0),
  activated_count INTEGER NOT NULL DEFAULT 0 CHECK (activated_count >= 0),
  deactivated_count INTEGER NOT NULL DEFAULT 0 CHECK (deactivated_count >= 0),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS integration_sync_run_source_entity_idx
  ON integration_sync_run(source_system, entity_name, started_at DESC);

INSERT INTO schema_migrations(version, checksum)
VALUES ('037-saint-client-sync-audit', '037-saint-client-sync-audit-v1')
ON CONFLICT (version) DO NOTHING;
