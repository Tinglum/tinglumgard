-- Fix chicken orders that are incorrectly marked as 'fully_paid'
-- when total completed payments don't actually cover the full order amount.
--
-- Root cause: webhook used wrong column names (deposit_amount vs deposit_amount_nok)
-- and the admin status dropdown allowed manual status changes without payment validation.

-- 0. Ensure pickup_date and pickup_time columns exist
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS pickup_date DATE;
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS pickup_time TEXT;

-- 1. Fix specific order CHICK19072374: set pickup date/time for Sunday April 12 at 11:00
UPDATE chicken_orders
SET pickup_date = '2026-04-12',
    pickup_time = '11:00'
WHERE order_number = 'CHICK19072374';

-- 2. Fix all chicken orders where status = 'fully_paid' but actual completed payments
--    don't cover the total amount. Revert them to 'deposit_paid'.
UPDATE chicken_orders co
SET status = 'deposit_paid'
WHERE co.status = 'fully_paid'
  AND co.total_amount_nok > 0
  AND (
    SELECT COALESCE(SUM(cp.amount_nok), 0)
    FROM chicken_payments cp
    WHERE cp.chicken_order_id = co.id
      AND cp.status = 'completed'
  ) < co.total_amount_nok;
