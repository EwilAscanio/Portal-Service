-- 017-rename-par-v2-tables.sql
-- Renombra las tablas del módulo PAR de nombres V2 a nombres definitivos:
--   par_v2_headers   -> par_header
--   par_v2_equipment -> par_equipment
--   par_v2_items     -> par_item
-- También renombra la secuencia, el trigger/función de updated_at y los índices.
-- Es idempotente: no-op en bases que ya usen los nombres nuevos (014 edita las
-- tablas directamente); aplica solo donde las tablas par_v2_* aún existen.

-- ============================================================
-- TABLAS
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.par_v2_headers') IS NOT NULL THEN
    ALTER TABLE public.par_v2_headers RENAME TO par_header;
  END IF;
  IF to_regclass('public.par_v2_equipment') IS NOT NULL THEN
    ALTER TABLE public.par_v2_equipment RENAME TO par_equipment;
  END IF;
  IF to_regclass('public.par_v2_items') IS NOT NULL THEN
    ALTER TABLE public.par_v2_items RENAME TO par_item;
  END IF;
END $$;

-- Nota: las FK dependientes (p.ej. service_order.par_id) se actualizan solas en
-- el catálogo al renombrar la tabla padre. Los nombres de las restricciones
-- conservan la mención par_v2_* (cosmético) y no se modifican.

-- ============================================================
-- TRIGGER / FUNCIÓN updated_at
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_par_v2_headers_updated_at') THEN
    ALTER TRIGGER trg_par_v2_headers_updated_at ON par_header
      RENAME TO trg_par_header_updated_at;
  END IF;
END $$;

-- Nota: el formulario RENAME TO de ALTER FUNCTION no acepta IF EXISTS,
-- por lo que se protege con un DO block.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_par_v2_headers_updated_at'
  ) THEN
    ALTER FUNCTION public.set_par_v2_headers_updated_at()
      RENAME TO set_par_header_updated_at;
  END IF;
END $$;-- ============================================================
-- ÍNDICES
-- ============================================================
ALTER INDEX IF EXISTS par_v2_headers_status_idx     RENAME TO par_header_status_idx;
ALTER INDEX IF EXISTS par_v2_headers_client_idx     RENAME TO par_header_client_idx;
ALTER INDEX IF EXISTS par_v2_headers_created_by_idx RENAME TO par_header_created_by_idx;
ALTER INDEX IF EXISTS par_v2_equipment_par_id_idx   RENAME TO par_equipment_par_id_idx;
ALTER INDEX IF EXISTS par_v2_items_par_id_idx       RENAME TO par_item_par_id_idx;

-- ============================================================
-- SECUENCIA (la V1 par_number_seq ya fue eliminada en 016)
-- ============================================================
ALTER SEQUENCE IF EXISTS par_v2_number_seq RENAME TO par_number_seq;
