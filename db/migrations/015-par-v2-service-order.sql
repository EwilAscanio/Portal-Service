-- 015-par-v2-service-order.sql
-- Vincula las órdenes de servicio con el PAR V2 para derivar
-- automáticamente los estados 'En Servicio' y 'Finalizado'.
--
-- Regla (se calcula al leer el PAR):
--   - Aprobado + ≥1 orden vinculada no cancelada → En Servicio
--   - En Servicio + todas las vinculadas en 'Completada' → Finalizado

ALTER TABLE service_order
  ADD COLUMN IF NOT EXISTS par_id INTEGER REFERENCES par_header(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS service_order_par_id_idx ON service_order(par_id);
