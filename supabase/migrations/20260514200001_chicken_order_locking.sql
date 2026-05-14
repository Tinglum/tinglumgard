-- Add locked_at to chicken_orders (item 10: order locking for chickens)
ALTER TABLE chicken_orders
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_chicken_orders_locked_at
  ON chicken_orders(locked_at)
  WHERE locked_at IS NOT NULL;
