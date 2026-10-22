-- 031: integridad estructural e historial de migraciones.
-- No reescribe 001-030. Ejecutar dentro de una transacción en una base ya validada.
BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checksum TEXT
);

DO $$
DECLARE
  max_par BIGINT;
BEGIN
  IF to_regclass('public.par_number_seq') IS NULL THEN
    CREATE SEQUENCE public.par_number_seq START WITH 1;
  END IF;
  IF to_regclass('public.par_header') IS NOT NULL THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(par_number, '[^0-9]', '', 'g'), '')::BIGINT), 0)
      INTO max_par FROM public.par_header;
    PERFORM setval('public.par_number_seq', GREATEST(max_par, 1), max_par > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.par_item') IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.par_item WHERE descripcion IS NULL) THEN
    RAISE EXCEPTION '031 abortada: par_item.descripcion contiene NULL';
  END IF;
  IF to_regclass('public.par_item') IS NOT NULL THEN
    ALTER TABLE public.par_item ALTER COLUMN descripcion SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS par_equipment_one_main_idx
  ON public.par_equipment (par_id) WHERE is_main;
CREATE UNIQUE INDEX IF NOT EXISTS par_item_par_item_no_uidx
  ON public.par_item (par_id, item_no);

CREATE INDEX IF NOT EXISTS par_header_approved_by_idx ON public.par_header(approved_by);
CREATE INDEX IF NOT EXISTS par_item_product_id_idx ON public.par_item(product_id);
CREATE INDEX IF NOT EXISTS par_equipment_equipment_id_idx ON public.par_equipment(equipment_id);
CREATE INDEX IF NOT EXISTS par_template_item_product_id_idx ON public.par_template_item(product_id);
CREATE INDEX IF NOT EXISTS service_order_par_id_idx ON public.service_order(par_id);
CREATE INDEX IF NOT EXISTS equipment_client_id_idx ON public.equipment(client_id);

DO $$
BEGIN
  IF to_regclass('public.par_header') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'par_header_status_check'
  ) THEN
    ALTER TABLE public.par_header ADD CONSTRAINT par_header_status_check
      CHECK (status IN ('Creado', 'Aprobado', 'En Servicio', 'Finalizado', 'Rechazado'));
  END IF;
  IF to_regclass('public.par_header') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'par_header_exchange_rate_nonnegative'
  ) THEN
    ALTER TABLE public.par_header ADD CONSTRAINT par_header_exchange_rate_nonnegative CHECK (exchange_rate >= 0);
  END IF;
  IF to_regclass('public.par_item') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'par_item_values_nonnegative'
  ) THEN
    ALTER TABLE public.par_item ADD CONSTRAINT par_item_values_nonnegative
      CHECK (COALESCE(qty, 0) >= 0 AND multiplicador >= 0 AND valor_unit_usd >= 0 AND COALESCE(valor_percent, 0) >= 0);
  END IF;
END $$;

INSERT INTO schema_migrations(version, checksum)
VALUES ('031-integrity-and-history', '031-integrity-and-history-v1')
ON CONFLICT (version) DO NOTHING;

COMMIT;
