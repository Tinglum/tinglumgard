-- =============================================================================
-- Egg waitlist queue for low-stock weeks
-- =============================================================================

CREATE TABLE IF NOT EXISTS egg_waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES egg_inventory(id) ON DELETE CASCADE,
  breed_id UUID NOT NULL REFERENCES egg_breeds(id) ON DELETE RESTRICT,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  delivery_monday DATE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  requested_quantity INTEGER,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'notified', 'paused', 'purchased', 'expired', 'cancelled')
  ),
  notify_attempts INTEGER NOT NULL DEFAULT 0,
  notified_at TIMESTAMPTZ,
  reservation_expires_at TIMESTAMPTZ,
  purchased_at TIMESTAMPTZ,
  purchase_order_id UUID REFERENCES egg_orders(id) ON DELETE SET NULL,
  last_email_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egg_waitlist_inventory_status_created
  ON egg_waitlist_entries(inventory_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_egg_waitlist_status_notified
  ON egg_waitlist_entries(status, notified_at);

CREATE INDEX IF NOT EXISTS idx_egg_waitlist_email_lower
  ON egg_waitlist_entries(LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_egg_waitlist_active_unique
  ON egg_waitlist_entries(inventory_id, LOWER(email))
  WHERE status IN ('queued', 'notified', 'paused');

DROP TRIGGER IF EXISTS update_egg_waitlist_entries_updated_at ON egg_waitlist_entries;
CREATE TRIGGER update_egg_waitlist_entries_updated_at
  BEFORE UPDATE ON egg_waitlist_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
