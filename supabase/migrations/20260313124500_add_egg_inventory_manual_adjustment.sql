-- =============================================================================
-- Egg inventory: automation baseline + manual +/- adjustment
-- =============================================================================

ALTER TABLE egg_inventory
  ADD COLUMN IF NOT EXISTS auto_forecast_eggs INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manual_adjustment INTEGER NOT NULL DEFAULT 0;

-- Backfill automation baseline from weekly forecast when available.
UPDATE egg_inventory i
SET auto_forecast_eggs = COALESCE(f.forecast_eggs, i.eggs_available)
FROM egg_weekly_forecasts f
WHERE f.breed_id = i.breed_id
  AND f.year = i.year
  AND f.week_number = i.week_number;

-- Fallback baseline for rows with no forecast match.
UPDATE egg_inventory i
SET auto_forecast_eggs = i.eggs_available
WHERE NOT EXISTS (
  SELECT 1
  FROM egg_weekly_forecasts f
  WHERE f.breed_id = i.breed_id
    AND f.year = i.year
    AND f.week_number = i.week_number
);

-- Preserve existing manual overrides as deltas from current baseline.
UPDATE egg_inventory
SET manual_adjustment = GREATEST(-999999, LEAST(999999, eggs_available - auto_forecast_eggs))
WHERE manual_override = TRUE;

CREATE INDEX IF NOT EXISTS idx_egg_inventory_manual_adjustment
  ON egg_inventory(manual_override, manual_adjustment);
