CREATE TABLE data_import_batch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_file_name VARCHAR(255) NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Validado'
    CHECK (status IN ('Validado', 'Importando', 'Completado', 'Fallido')),
  total_count INTEGER NOT NULL DEFAULT 0 CHECK (total_count >= 0),
  create_count INTEGER NOT NULL DEFAULT 0 CHECK (create_count >= 0),
  update_count INTEGER NOT NULL DEFAULT 0 CHECK (update_count >= 0),
  error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  warning_count INTEGER NOT NULL DEFAULT 0 CHECK (warning_count >= 0),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  failure_message TEXT
);

CREATE TABLE data_import_row (
  id BIGSERIAL PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES data_import_batch(id) ON DELETE CASCADE,
  sheet_name VARCHAR(50) NOT NULL,
  row_number INTEGER NOT NULL CHECK (row_number >= 2),
  entity_name VARCHAR(30) NOT NULL,
  operation VARCHAR(20) NOT NULL CHECK (operation IN ('Crear', 'Actualizar', 'Error')),
  status VARCHAR(20) NOT NULL DEFAULT 'Pendiente'
    CHECK (status IN ('Pendiente', 'Error', 'Completado')),
  payload JSONB NOT NULL,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, sheet_name, row_number)
);

CREATE INDEX data_import_batch_created_at_idx ON data_import_batch(created_at DESC);
CREATE INDEX data_import_row_batch_id_idx ON data_import_row(batch_id);

INSERT INTO schema_migrations(version, checksum)
VALUES ('044-data-import', '044-data-import-v1')
ON CONFLICT (version) DO NOTHING;
