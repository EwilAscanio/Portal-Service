-- 009-notification.sql
-- Notification table

CREATE TABLE IF NOT EXISTS notification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('order', 'equipment', 'billing', 'system', 'client')),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_user_id_idx ON notification(user_id);
CREATE INDEX IF NOT EXISTS notification_read_idx ON notification(read);
CREATE INDEX IF NOT EXISTS notification_created_at_idx ON notification(created_at DESC);
