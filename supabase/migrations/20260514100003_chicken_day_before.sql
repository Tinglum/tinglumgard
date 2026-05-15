-- =============================================================================
-- ADD DAY-BEFORE REMINDER FLAG FOR CHICKEN ORDERS
-- =============================================================================
-- Enables a one-day-before pickup email for fully paid / ready-for-pickup
-- chicken orders offering extra birds if hatches have available stock.
-- =============================================================================

ALTER TABLE chicken_orders
  ADD COLUMN IF NOT EXISTS reminder_day_before_sent BOOLEAN NOT NULL DEFAULT false;

-- =============================================================================
