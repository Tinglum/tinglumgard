-- ============================================================================
-- Force ham extras to a fixed 8 kg default quantity
-- Date: 2026-03-03
-- ============================================================================

UPDATE extras_catalog
SET
  pricing_type = 'per_kg',
  default_quantity = 8,
  updated_at = NOW()
WHERE slug IN ('spekeskinke', 'extra-skinke-speking');
