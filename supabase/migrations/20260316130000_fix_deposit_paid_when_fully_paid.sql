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
