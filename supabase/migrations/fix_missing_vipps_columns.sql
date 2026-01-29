-- Add missing Vipps-related columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS vipps_deposit_order_id TEXT,
ADD COLUMN IF NOT EXISTS vipps_remainder_order_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_vipps_deposit ON orders(vipps_deposit_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_vipps_remainder ON orders(vipps_remainder_order_id);
