-- =============================================================================
-- Egg hatch follow-up support: shipment timestamp + pig deposit promo code
-- =============================================================================

ALTER TABLE egg_orders
  ADD COLUMN IF NOT EXISTS marked_shipped_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_egg_orders_marked_shipped_at
  ON egg_orders(marked_shipped_at)
  WHERE marked_shipped_at IS NOT NULL;

UPDATE egg_orders
SET marked_shipped_at = COALESCE(marked_shipped_at, updated_at, NOW())
WHERE status IN ('shipped', 'delivered')
  AND marked_shipped_at IS NULL;

INSERT INTO rebate_codes (
  code,
  discount_type,
  discount_value,
  max_uses,
  current_uses,
  max_uses_per_customer,
  valid_from,
  valid_until,
  min_order_amount,
  applicable_to,
  is_active,
  description,
  created_by
)
VALUES (
  'HATCH10',
  'percentage',
  10.00,
  NULL,
  0,
  1,
  NOW(),
  NULL,
  NULL,
  ARRAY['8kg', '12kg'],
  TRUE,
  '10% innskuddsrabatt for rugeegg-kunder (Mangalitsa-kasser)',
  'system.egg_hatch_followup'
)
ON CONFLICT (code) DO UPDATE
SET
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  max_uses_per_customer = EXCLUDED.max_uses_per_customer,
  applicable_to = EXCLUDED.applicable_to,
  is_active = EXCLUDED.is_active,
  description = EXCLUDED.description,
  updated_at = NOW();
