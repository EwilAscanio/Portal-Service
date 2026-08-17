-- 018-drop-par-v1-function.sql
-- Elimina la función de la V1 (set_par_headers_updated_at) que quedó huérfana
-- tras el drop de las tablas par_headers/par_product_lines/par_labor_lines (016).
-- La V2 usa set_par_header_updated_at(); no debe eliminarse esta.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_par_headers_updated_at'
  ) THEN
    DROP FUNCTION public.set_par_headers_updated_at();
  END IF;
END $$;
