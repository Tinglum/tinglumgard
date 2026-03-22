-- Mark shipped Posten orders as delivered (shipped = done from admin side)
UPDATE egg_orders
SET marked_delivered_at = COALESCE(marked_shipped_at, NOW())
WHERE status = 'shipped'
  AND delivery_method = 'posten'
  AND marked_delivered_at IS NULL;
