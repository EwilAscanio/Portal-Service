-- Hasta cuatro personas distintas por O/S, incluido el responsable.
-- Sustituye solo la función del trigger creado en 036; conserva asignaciones e historial.
-- El runner ejecuta esta migración y su registro dentro de una transacción.
SET LOCAL lock_timeout = '10s';

CREATE OR REPLACE FUNCTION enforce_service_order_technician_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM service_order_technician
      WHERE service_order_id = NEW.service_order_id) >= 4 THEN
    RAISE EXCEPTION 'Una orden de servicio admite un maximo de 4 tecnicos'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
