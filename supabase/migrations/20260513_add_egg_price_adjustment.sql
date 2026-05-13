-- Add price_adjustment_ore to egg_orders
-- Used for manual discounts or surcharges applied at pickup
-- Stored in øre (1/100 NOK), can be negative (discount) or positive (surcharge)
ALTER TABLE egg_orders
  ADD COLUMN IF NOT EXISTS price_adjustment_ore INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN egg_orders.price_adjustment_ore IS
  'Manual price adjustment in øre (negative = discount, positive = surcharge). Applied at pickup for discount eggs etc.';
