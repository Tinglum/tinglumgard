-- Fix: allow Mangalitsa orders with box_size = NULL.
-- Root cause: original schema created orders.box_size as NOT NULL,
-- while Mangalitsa flow stores box choice in mangalitsa_preset_id + is_mangalitsa=true.

ALTER TABLE orders
  ALTER COLUMN box_size DROP NOT NULL;

-- Ensure expected box type integrity constraint is present.
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS check_box_type;

ALTER TABLE orders
  ADD CONSTRAINT check_box_type CHECK (
    (box_size IS NOT NULL AND mangalitsa_preset_id IS NULL AND is_mangalitsa = false)
    OR
    (box_size IS NULL AND mangalitsa_preset_id IS NOT NULL AND is_mangalitsa = true)
  ) NOT VALID;

ALTER TABLE orders
  VALIDATE CONSTRAINT check_box_type;
