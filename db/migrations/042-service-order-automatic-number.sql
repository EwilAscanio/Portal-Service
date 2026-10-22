-- 042: Número correlativo de órdenes generado de forma atómica por PostgreSQL.

CREATE SEQUENCE IF NOT EXISTS service_order_number_seq START WITH 1 INCREMENT BY 1;

SELECT setval(
  'service_order_number_seq',
  GREATEST(
    1,
    COALESCE((SELECT MAX(id) FROM service_order), 0) + 1,
    COALESCE((
      SELECT MAX(substring(order_code FROM '^OS-([0-9]+)$')::bigint) + 1
      FROM service_order
      WHERE order_code ~ '^OS-[0-9]+$'
    ), 1)
  ),
  false
);

ALTER TABLE service_order
  ALTER COLUMN order_code SET DEFAULT
    ('OS-' || lpad(nextval('service_order_number_seq')::text, 6, '0'));

ALTER SEQUENCE service_order_number_seq OWNED BY service_order.order_code;

INSERT INTO schema_migrations(version, checksum)
VALUES ('042-service-order-automatic-number', '042-service-order-automatic-number-v1')
ON CONFLICT (version) DO NOTHING;
