-- 021-configuration-exchange-rate.sql
-- Tasa BCV del día para la conversión USD → Bs.

ALTER TABLE configuration
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(14,4) NOT NULL DEFAULT 0;
