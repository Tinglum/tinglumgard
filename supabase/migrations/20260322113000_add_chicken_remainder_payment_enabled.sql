ALTER TABLE chicken_orders
  ADD COLUMN IF NOT EXISTS remainder_payment_enabled BOOLEAN NOT NULL DEFAULT FALSE;
