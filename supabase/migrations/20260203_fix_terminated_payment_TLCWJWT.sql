-- Fix incorrectly marked order TLCWJWT
-- This order was marked as deposit_paid but payment was TERMINATED, not completed

-- Find the order
SELECT 
  id,
  order_number,
  customer_email,
  status,
  total_amount,
  deposit_amount
FROM orders 
WHERE order_number = 'TLCWJWT';

-- Find the payment
SELECT 
  p.id,
  p.status,
  p.payment_type,
  p.amount,
  p.vipps_session_id
FROM payments p
JOIN orders o ON p.order_id = o.id
WHERE o.order_number = 'TLCWJWT';

-- Fix the payment status (mark as failed)
UPDATE payments
SET status = 'failed'
FROM orders
WHERE payments.order_id = orders.id
  AND orders.order_number = 'TLCWJWT';

-- Fix the order status (revert to pending_payment)
UPDATE orders
SET status = 'pending_payment'
WHERE order_number = 'TLCWJWT';

-- Verify the fix
SELECT 
  o.order_number,
  o.status as order_status,
  p.status as payment_status,
  p.payment_type,
  p.amount
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id
WHERE o.order_number = 'TLCWJWT';
