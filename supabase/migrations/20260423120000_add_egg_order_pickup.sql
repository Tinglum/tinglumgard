-- Add pickup date and time columns to egg_orders
ALTER TABLE egg_orders
  ADD COLUMN IF NOT EXISTS pickup_date DATE,
  ADD COLUMN IF NOT EXISTS pickup_time TEXT;

-- Optional: constrain to valid time slots
ALTER TABLE egg_orders
  DROP CONSTRAINT IF EXISTS egg_orders_pickup_time_check;

ALTER TABLE egg_orders
  ADD CONSTRAINT egg_orders_pickup_time_check
  CHECK (pickup_time IS NULL OR pickup_time IN ('11:00', '17:00'));
