-- 043: Agenda de tecnicos derivada exclusivamente de ordenes aprobadas.
-- Los nombres nuevos de tablas, columnas e indices se mantienen en ingles.

ALTER TABLE technical
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Vincula automaticamente coincidencias inequívocas por correo para conservar
-- el acceso de tecnicos existentes. La relacion puede corregirse desde el catalogo.
UPDATE technical t
SET user_id = matched.user_id
FROM (
  SELECT lower(t2.email) AS email_key, min(u.id::text)::uuid AS user_id
  FROM technical t2
  JOIN users u ON lower(u.email) = lower(t2.email)
  JOIN role r ON r.id = u.role_id AND r.name = 'Técnico'
  WHERE t2.user_id IS NULL
    AND NULLIF(trim(t2.email), '') IS NOT NULL
  GROUP BY lower(t2.email)
  HAVING COUNT(DISTINCT u.id) = 1 AND COUNT(DISTINCT t2.id) = 1
) matched
WHERE t.user_id IS NULL AND lower(t.email) = matched.email_key;

CREATE UNIQUE INDEX IF NOT EXISTS technical_user_id_uidx
  ON technical(user_id) WHERE user_id IS NOT NULL;

-- Una aprobacion siempre debe conservar juntos el usuario y la fecha.
UPDATE service_order
SET approved_by = NULL, approved_at = NULL
WHERE (approved_by IS NULL) <> (approved_at IS NULL);

ALTER TABLE service_order
  DROP CONSTRAINT IF EXISTS service_order_approval_audit_check;
ALTER TABLE service_order
  ADD CONSTRAINT service_order_approval_audit_check
  CHECK ((approved_by IS NULL AND approved_at IS NULL)
      OR (approved_by IS NOT NULL AND approved_at IS NOT NULL));

CREATE INDEX IF NOT EXISTS service_order_calendar_range_idx
  ON service_order(scheduled_start, scheduled_end)
  WHERE approved_at IS NOT NULL AND status <> 'Cancelada';

CREATE INDEX IF NOT EXISTS service_order_calendar_status_idx
  ON service_order(status, service_type, priority)
  WHERE approved_at IS NOT NULL;

INSERT INTO schema_migrations(version, checksum)
VALUES ('043-technician-calendar', '043-technician-calendar-v1')
ON CONFLICT (version) DO NOTHING;
