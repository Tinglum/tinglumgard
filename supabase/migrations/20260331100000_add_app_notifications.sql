-- Admin notifications table for system alerts (deferred payments, etc.)
CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_unread ON app_notifications (read, created_at DESC) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_app_notifications_type ON app_notifications (type, created_at DESC);
