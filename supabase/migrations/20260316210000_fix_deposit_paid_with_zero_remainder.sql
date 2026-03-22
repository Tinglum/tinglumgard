-- Fix egg orders stuck as 'deposit_paid' when remainder is already zero
UPDATE egg_orders
SET status = 'fully_paid'
WHERE status = 'deposit_paid'
  AND remainder_amount = 0;
