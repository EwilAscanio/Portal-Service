-- Garantías independientes del presupuesto comercial; no reconstruye servicios históricos.
SET LOCAL lock_timeout = '10s';
ALTER TABLE par_header ADD COLUMN purpose VARCHAR(30) NOT NULL DEFAULT 'Comercial'
  CHECK (purpose IN ('Comercial','ReferenciaGarantia'));
ALTER TABLE par_header ADD CONSTRAINT par_reference_zero_check CHECK
  (purpose <> 'ReferenciaGarantia' OR (budgeted_hours=0 AND subtotal_usd=0 AND discount_percent=0
    AND discount_amount_usd=0 AND total_usd=0 AND total_bs=0));

CREATE FUNCTION preserve_par_purpose() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.purpose IS DISTINCT FROM OLD.purpose THEN RAISE EXCEPTION 'La finalidad del PAR no se puede convertir' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER preserve_par_purpose_trigger BEFORE UPDATE OF purpose ON par_header
  FOR EACH ROW EXECUTE FUNCTION preserve_par_purpose();

-- Los renglones de referencia identifican productos, no ventas ni presupuestos inventados.
CREATE FUNCTION normalize_reference_par_item() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM par_header WHERE id=NEW.par_id AND purpose='ReferenciaGarantia') THEN
    NEW.qty:=0; NEW.valor_unit_usd:=0; NEW.valor_percent:=0; NEW.line_total_usd:=0; NEW.multiplicador:=1;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER normalize_reference_par_item_trigger BEFORE INSERT OR UPDATE ON par_item
  FOR EACH ROW EXECUTE FUNCTION normalize_reference_par_item();

ALTER TABLE service_order
  ADD COLUMN order_kind VARCHAR(15) NOT NULL DEFAULT 'Normal' CHECK (order_kind IN ('Normal','Garantia')),
  ADD COLUMN warranty_origin VARCHAR(15) CHECK (warranty_origin IN ('Registered','External')),
  ADD COLUMN warranty_origin_order_id INTEGER REFERENCES service_order(id) ON DELETE RESTRICT,
  ADD COLUMN warranty_reference VARCHAR(500),
  ADD COLUMN warranty_service_date DATE,
  ADD COLUMN warranty_reason TEXT,
  ADD CONSTRAINT service_order_warranty_check CHECK (
    (order_kind='Normal' AND warranty_origin IS NULL AND warranty_origin_order_id IS NULL
      AND warranty_reference IS NULL AND warranty_service_date IS NULL AND warranty_reason IS NULL)
    OR (order_kind='Garantia' AND warranty_origin IS NOT NULL AND warranty_reason IS NOT NULL
      AND length(trim(warranty_reason)) BETWEEN 5 AND 2000
      AND ((warranty_origin='Registered' AND warranty_origin_order_id IS NOT NULL AND warranty_origin_order_id<>id
          AND warranty_reference IS NULL AND warranty_service_date IS NULL)
        OR (warranty_origin='External' AND warranty_origin_order_id IS NULL AND warranty_reference IS NOT NULL
          AND length(trim(warranty_reference)) BETWEEN 5 AND 500))));

CREATE FUNCTION validate_service_order_warranty() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND (NEW.order_kind,NEW.warranty_origin,NEW.warranty_origin_order_id,NEW.warranty_reference,NEW.warranty_service_date)
      IS DISTINCT FROM (OLD.order_kind,OLD.warranty_origin,OLD.warranty_origin_order_id,OLD.warranty_reference,OLD.warranty_service_date) THEN
    RAISE EXCEPTION 'El origen de la garantía no se puede cambiar' USING ERRCODE='23514';
  END IF;
  IF NEW.order_kind='Normal' AND EXISTS (SELECT 1 FROM par_header WHERE id=NEW.par_id AND purpose='ReferenciaGarantia') THEN
    RAISE EXCEPTION 'Un PAR de referencia solo admite garantías' USING ERRCODE='23514';
  END IF;
  IF NEW.warranty_origin='Registered' AND NOT EXISTS (
    SELECT 1 FROM service_order o WHERE o.id=NEW.warranty_origin_order_id AND o.status='Completada'
      AND o.par_id=NEW.par_id AND o.client_id=NEW.client_id AND o.plant_id=NEW.plant_id) THEN
    RAISE EXCEPTION 'La garantía requiere una O/S completada del mismo PAR y ámbito' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_service_order_warranty_trigger BEFORE INSERT OR UPDATE ON service_order
  FOR EACH ROW EXECUTE FUNCTION validate_service_order_warranty();
CREATE INDEX service_order_warranty_origin_idx ON service_order(warranty_origin_order_id) WHERE warranty_origin_order_id IS NOT NULL;
CREATE INDEX service_order_kind_par_idx ON service_order(par_id,order_kind,status);

CREATE FUNCTION validate_warranty_equipment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE origin_id INTEGER;
BEGIN
  SELECT warranty_origin_order_id INTO origin_id FROM service_order WHERE id=NEW.service_order_id;
  IF origin_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM service_order_equipment WHERE service_order_id=origin_id AND equipment_id=NEW.equipment_id) THEN
    RAISE EXCEPTION 'El equipo debe pertenecer a la O/S de origen' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_warranty_equipment_trigger BEFORE INSERT OR UPDATE ON service_order_equipment
  FOR EACH ROW EXECUTE FUNCTION validate_warranty_equipment();
