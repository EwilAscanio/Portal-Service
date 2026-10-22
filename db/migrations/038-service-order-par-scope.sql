-- 038: Garantiza en base de datos que la orden herede el alcance de su PAR.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM service_order so
    JOIN par_header ph ON ph.id = so.par_id
    WHERE so.client_id <> ph.client_id OR so.plant_id <> ph.plant_id
       OR so.contact_id <> ph.contact_id
       OR NOT EXISTS (
         SELECT 1 FROM par_equipment pe
         WHERE pe.par_id = so.par_id AND pe.equipment_id = so.equipment_id
       )
  ) THEN
    RAISE EXCEPTION '038 abortada: existen ordenes cuyo alcance no coincide con el PAR';
  END IF;
END $$;

ALTER TABLE par_header
  ADD CONSTRAINT par_header_order_scope_unique
  UNIQUE (id, client_id, plant_id, contact_id);

ALTER TABLE par_equipment
  ADD CONSTRAINT par_equipment_order_scope_unique
  UNIQUE (par_id, equipment_id);

ALTER TABLE service_order
  ADD CONSTRAINT service_order_par_scope_fk
    FOREIGN KEY (par_id, client_id, plant_id, contact_id)
    REFERENCES par_header(id, client_id, plant_id, contact_id) ON DELETE RESTRICT,
  ADD CONSTRAINT service_order_par_equipment_fk
    FOREIGN KEY (par_id, equipment_id)
    REFERENCES par_equipment(par_id, equipment_id) ON DELETE RESTRICT;

INSERT INTO schema_migrations(version, checksum)
VALUES ('038-service-order-par-scope', '038-service-order-par-scope-v1')
ON CONFLICT (version) DO NOTHING;
