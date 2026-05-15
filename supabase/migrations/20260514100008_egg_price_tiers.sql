ALTER TABLE egg_inventory
  ADD COLUMN IF NOT EXISTS early_bird_discount_pct integer DEFAULT 0 CHECK (early_bird_discount_pct >= 0 AND early_bird_discount_pct <= 50),
  ADD COLUMN IF NOT EXISTS early_bird_cutoff_days integer DEFAULT 0 CHECK (early_bird_cutoff_days >= 0);
