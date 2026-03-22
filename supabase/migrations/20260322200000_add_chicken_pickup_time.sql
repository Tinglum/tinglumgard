-- Allow customers to choose a pickup time slot
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS pickup_time TEXT;
