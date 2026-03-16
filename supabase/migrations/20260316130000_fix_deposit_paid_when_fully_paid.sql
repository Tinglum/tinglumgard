-- Fix egg orders where deposit covers the full amount but status is still deposit_paid
UPDATE egg_orders
SET status = 'fully_paid'
WHERE status = 'deposit_paid'
  AND deposit_amount > 0
  AND total_amount > 0
  AND deposit_amount >= total_amount;

-- Same fix for pig orders
UPDATE orders
SET status = 'fully_paid'
WHERE status = 'deposit_paid'
  AND deposit_amount > 0
  AND total_amount > 0
  AND deposit_amount >= total_amount;

-- Same fix for chicken orders
UPDATE chicken_orders
SET status = 'fully_paid'
WHERE status = 'deposit_paid'
  AND deposit_amount > 0
  AND total_amount > 0
  AND deposit_amount >= total_amount;

-- Fix egg orders incorrectly marked fully_paid when remainder is still outstanding
-- Check: if deposit_amount < total_amount AND no remainder payments exist, revert to deposit_paid
UPDATE egg_orders
SET status = 'deposit_paid'
WHERE status = 'fully_paid'
  AND deposit_amount > 0
  AND total_amount > 0
  AND deposit_amount < total_amount
  AND id NOT IN (
    SELECT DISTINCT egg_order_id FROM egg_payments
    WHERE payment_type = 'remainder' AND status = 'completed'
  );
