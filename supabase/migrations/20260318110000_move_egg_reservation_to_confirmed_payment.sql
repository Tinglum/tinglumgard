-- =============================================================================
-- Move egg inventory reservation to confirmed payment
-- =============================================================================

ALTER TABLE egg_orders
  ADD COLUMN IF NOT EXISTS inventory_reserved_at TIMESTAMPTZ;

UPDATE egg_orders
SET inventory_reserved_at = COALESCE(inventory_reserved_at, created_at, NOW())
WHERE inventory_reserved_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM egg_payments
    WHERE egg_payments.egg_order_id = egg_orders.id
      AND egg_payments.payment_type = 'deposit'
      AND egg_payments.status = 'completed'
  );

WITH confirmed_base_lines AS (
  SELECT
    inventory_id,
    SUM(quantity)::INTEGER AS qty
  FROM egg_orders
  WHERE inventory_id IS NOT NULL
    AND inventory_reserved_at IS NOT NULL
  GROUP BY inventory_id
),
confirmed_addition_lines AS (
  SELECT
    egg_order_additions.inventory_id,
    SUM(egg_order_additions.quantity)::INTEGER AS qty
  FROM egg_order_additions
  INNER JOIN egg_orders ON egg_orders.id = egg_order_additions.egg_order_id
  WHERE egg_order_additions.inventory_id IS NOT NULL
    AND egg_orders.inventory_reserved_at IS NOT NULL
  GROUP BY egg_order_additions.inventory_id
),
confirmed_allocations AS (
  SELECT
    inventory_id,
    SUM(qty)::INTEGER AS qty
  FROM (
    SELECT inventory_id, qty FROM confirmed_base_lines
    UNION ALL
    SELECT inventory_id, qty FROM confirmed_addition_lines
  ) lines
  GROUP BY inventory_id
)
UPDATE egg_inventory
SET
  eggs_allocated = COALESCE(confirmed_allocations.qty, 0),
  status = CASE
    WHEN egg_inventory.status = 'locked' THEN 'locked'
    WHEN COALESCE(confirmed_allocations.qty, 0) >= egg_inventory.eggs_available THEN 'sold_out'
    ELSE 'open'
  END
FROM (
  SELECT id
  FROM egg_inventory
) inventory_rows
LEFT JOIN confirmed_allocations ON confirmed_allocations.inventory_id = inventory_rows.id
WHERE egg_inventory.id = inventory_rows.id;
