-- Add pickup_date and pickup_time columns to pig orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pickup_date DATE,
  ADD COLUMN IF NOT EXISTS pickup_time TEXT;

ALTER TABLE orders
  ADD CONSTRAINT orders_pickup_time_check
  CHECK (pickup_time IS NULL OR pickup_time IN ('11:00', '17:00'));

CREATE INDEX IF NOT EXISTS idx_orders_pickup_date ON orders(pickup_date);
