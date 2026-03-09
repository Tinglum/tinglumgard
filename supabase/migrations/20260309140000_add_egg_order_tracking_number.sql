-- Add tracking number column for Posten shipment tracking
ALTER TABLE egg_orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT;
