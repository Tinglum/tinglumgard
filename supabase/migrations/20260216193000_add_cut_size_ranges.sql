-- Add size range (from/to in kg) to canonical cuts catalog.
-- This becomes the single source for "ca. X-Y kg" across admin, boxes, extras and oppdelingsplan.
-- Idempotent and safe to run multiple times.

ALTER TABLE cuts_catalog
  ADD COLUMN IF NOT EXISTS size_from_kg NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS size_to_kg NUMERIC(5,2);

ALTER TABLE cuts_catalog
  DROP CONSTRAINT IF EXISTS cuts_catalog_size_range_check;

ALTER TABLE cuts_catalog
  ADD CONSTRAINT cuts_catalog_size_range_check
  CHECK (
    (size_from_kg IS NULL AND size_to_kg IS NULL)
    OR (
      size_from_kg IS NOT NULL
      AND size_to_kg IS NOT NULL
      AND size_from_kg > 0
      AND size_to_kg >= size_from_kg
    )
  );

COMMENT ON COLUMN cuts_catalog.size_from_kg IS 'Lower bound of typical cut size in kg.';
COMMENT ON COLUMN cuts_catalog.size_to_kg IS 'Upper bound of typical cut size in kg.';

-- Backfill ranges for existing cuts (can be adjusted later in admin).
UPDATE cuts_catalog SET size_from_kg = 0.40, size_to_kg = 0.70 WHERE slug = 'guanciale';
UPDATE cuts_catalog SET size_from_kg = 1.20, size_to_kg = 1.80 WHERE slug = 'nakkekam-coppa';
UPDATE cuts_catalog SET size_from_kg = 0.90, size_to_kg = 1.30 WHERE slug = 'secreto-presa-pluma';
UPDATE cuts_catalog SET size_from_kg = 0.40, size_to_kg = 0.60 WHERE slug = 'indrefilet';
UPDATE cuts_catalog SET size_from_kg = 0.80, size_to_kg = 1.20 WHERE slug = 'tomahawk-kotelett';
UPDATE cuts_catalog SET size_from_kg = 0.50, size_to_kg = 0.90 WHERE slug = 'svine-entrecote';
UPDATE cuts_catalog SET size_from_kg = 1.60, size_to_kg = 2.40 WHERE slug = 'koteletter-fettkappe';
UPDATE cuts_catalog SET size_from_kg = 1.00, size_to_kg = 1.60 WHERE slug = 'ryggspekk-lardo';
UPDATE cuts_catalog SET size_from_kg = 1.30, size_to_kg = 1.80 WHERE slug = 'ribbevalg';
UPDATE cuts_catalog SET size_from_kg = 0.80, size_to_kg = 1.20 WHERE slug = 'bacon';
UPDATE cuts_catalog SET size_from_kg = 0.30, size_to_kg = 0.70 WHERE slug = 'kokkefett-smult';
UPDATE cuts_catalog SET size_from_kg = 2.50, size_to_kg = 3.50 WHERE slug = 'bogstek';
UPDATE cuts_catalog SET size_from_kg = 1.50, size_to_kg = 2.50 WHERE slug = 'gryte-stekekjott';
UPDATE cuts_catalog SET size_from_kg = 0.80, size_to_kg = 1.50 WHERE slug = 'kjottdeig-grov';
UPDATE cuts_catalog SET size_from_kg = 1.00, size_to_kg = 1.50 WHERE slug = 'premium-polse';
UPDATE cuts_catalog SET size_from_kg = 1.00, size_to_kg = 1.40 WHERE slug = 'bbq-polse';
UPDATE cuts_catalog SET size_from_kg = 1.20, size_to_kg = 1.80 WHERE slug = 'medisterpolser';
UPDATE cuts_catalog SET size_from_kg = 1.20, size_to_kg = 1.80 WHERE slug = 'medisterfarse';
UPDATE cuts_catalog SET size_from_kg = 1.20, size_to_kg = 1.80 WHERE slug = 'julepolse';
UPDATE cuts_catalog SET size_from_kg = 0.80, size_to_kg = 1.30 WHERE slug = 'knoke';
UPDATE cuts_catalog SET size_from_kg = 3.00, size_to_kg = 4.50 WHERE slug = 'skinke-speking';
UPDATE cuts_catalog SET size_from_kg = 0.80, size_to_kg = 1.40 WHERE slug = 'ytrefilet-ryggfilet';
UPDATE cuts_catalog SET size_from_kg = 2.50, size_to_kg = 3.80 WHERE slug = 'svinekam';
UPDATE cuts_catalog SET size_from_kg = 1.50, size_to_kg = 2.50 WHERE slug = 'svinekoteletter';
UPDATE cuts_catalog SET size_from_kg = 1.00, size_to_kg = 2.50 WHERE slug = 'ekstra-ribbe';
UPDATE cuts_catalog SET size_from_kg = 1.00, size_to_kg = 2.00 WHERE slug = 'pinnekjott';
UPDATE cuts_catalog SET size_from_kg = 1.00, size_to_kg = 2.00 WHERE slug = 'bacon-sideflesk';
UPDATE cuts_catalog SET size_from_kg = 2.00, size_to_kg = 3.00 WHERE slug = 'kamsteik';
UPDATE cuts_catalog SET size_from_kg = 0.20, size_to_kg = 0.40 WHERE slug = 'labb';
