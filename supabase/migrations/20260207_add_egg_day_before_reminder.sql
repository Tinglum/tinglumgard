-- =============================================================================
-- ADD DAY-BEFORE REMINDER FLAG FOR EGG ORDERS
-- =============================================================================
-- Enables a one-day-before delivery email for fully paid egg orders.
-- =============================================================================

ALTER TABLE egg_orders
  ADD COLUMN IF NOT EXISTS reminder_day_before_sent BOOLEAN NOT NULL DEFAULT false;

-- =============================================================================
