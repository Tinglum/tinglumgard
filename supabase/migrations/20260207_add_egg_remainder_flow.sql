-- =============================================================================
-- ADD EGG REMAINDER FLOW FIELDS + ORDER ADDITIONS
-- =============================================================================
-- Adds reminder tracking + forfeiture fields and support for egg order additions
-- =============================================================================

-- Expand status enum to include pending + forfeited
ALTER TABLE egg_orders
  DROP CONSTRAINT IF EXISTS egg_orders_status_check;

ALTER TABLE egg_orders
  ADD CONSTRAINT egg_orders_status_check
  CHECK (status IN (
    'pending',
    'deposit_paid',
    'fully_paid',
    'preparing',
    'shipped',
    'delivered',
    'cancelled',
    'forfeited'
  ));

ALTER TABLE egg_orders
  ALTER COLUMN status SET DEFAULT 'pending';

-- Reminder tracking + forfeiture metadata
ALTER TABLE egg_orders
  ADD COLUMN IF NOT EXISTS reminder_11_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_9_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_7_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_6_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forfeited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS forfeit_reason TEXT;

-- Egg order additions (upsell during remainder payment)
CREATE TABLE IF NOT EXISTS egg_order_additions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  egg_order_id UUID NOT NULL REFERENCES egg_orders(id) ON DELETE CASCADE,
  breed_id UUID NOT NULL REFERENCES egg_breeds(id) ON DELETE RESTRICT,
  inventory_id UUID NOT NULL REFERENCES egg_inventory(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_per_egg INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egg_order_additions_order ON egg_order_additions(egg_order_id);
CREATE INDEX IF NOT EXISTS idx_egg_order_additions_inventory ON egg_order_additions(inventory_id);

-- RLS (optional, for completeness)
ALTER TABLE egg_order_additions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own egg additions" ON egg_order_additions;
DROP POLICY IF EXISTS "Admins can manage egg additions" ON egg_order_additions;

CREATE POLICY "Users can view their own egg additions" ON egg_order_additions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM egg_orders
      WHERE egg_orders.id = egg_order_additions.egg_order_id
      AND egg_orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage egg additions" ON egg_order_additions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- =============================================================================
