-- Descuento general sobre el subtotal comercial del PAR, independiente de las horas.
-- Ejecutar con el runner transaccional. Un bloqueo prolongado aborta la migración.
SET LOCAL lock_timeout = '10s';

ALTER TABLE par_header
  ADD COLUMN discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0
    CONSTRAINT par_header_discount_percent_check CHECK (discount_percent BETWEEN 0 AND 100),
  ADD COLUMN subtotal_usd NUMERIC(14,2) NOT NULL DEFAULT 0
    CONSTRAINT par_header_subtotal_check CHECK (subtotal_usd >= 0),
  ADD COLUMN discount_amount_usd NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Preservar importes y fecha de edición históricos: no recalcular renglones.
-- Solo se suspende el trigger de fecha bajo el bloqueo DDL y la misma transacción.
ALTER TABLE par_header DISABLE TRIGGER trg_par_header_updated_at;
UPDATE par_header SET subtotal_usd = total_usd;
ALTER TABLE par_header ENABLE TRIGGER trg_par_header_updated_at;

ALTER TABLE par_header
  ADD CONSTRAINT par_header_discount_amount_check
    CHECK (discount_amount_usd >= 0 AND discount_amount_usd <= subtotal_usd),
  ADD CONSTRAINT par_header_discount_total_check
    CHECK (total_usd = subtotal_usd - discount_amount_usd);

COMMENT ON COLUMN par_header.discount_percent IS 'Porcentaje de descuento general, 0 a 100; editable con los permisos del PAR.';
COMMENT ON COLUMN par_header.subtotal_usd IS 'Suma de importes de renglones antes del descuento general.';
COMMENT ON COLUMN par_header.discount_amount_usd IS 'Monto USD calculado: subtotal por porcentaje, redondeado a dos decimales.';
