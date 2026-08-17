-- 007-service-order.sql
-- Service order table

CREATE TABLE IF NOT EXISTS service_order (
  id SERIAL PRIMARY KEY,
  order_code VARCHAR(20) NOT NULL UNIQUE,
  client_description VARCHAR(200) NOT NULL,
  equipment_name VARCHAR(200) NOT NULL,
  type VARCHAR(60) NOT NULL,
  technician_name VARCHAR(120) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'Media' CHECK (priority IN ('Alta', 'Media', 'Baja')),
  status VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'En Proceso', 'Completada', 'Cancelada')),
  scheduled_date TIMESTAMPTZ,
  amount NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_order_status_idx ON service_order(status);
CREATE INDEX IF NOT EXISTS service_order_priority_idx ON service_order(priority);
CREATE INDEX IF NOT EXISTS service_order_scheduled_idx ON service_order(scheduled_date);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION set_service_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_order_updated_at ON service_order;
CREATE TRIGGER trg_service_order_updated_at
  BEFORE UPDATE ON service_order
  FOR EACH ROW
  EXECUTE FUNCTION set_service_order_updated_at();
