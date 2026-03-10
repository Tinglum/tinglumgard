-- =============================================================================
-- Ensure EggOps misc columns exist and force PostgREST schema cache reload
-- =============================================================================

ALTER TABLE egg_ops_day_states
  ADD COLUMN IF NOT EXISTS duck_eggs INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_eggs INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'egg_ops_day_states_duck_eggs_check'
  ) THEN
    ALTER TABLE egg_ops_day_states
      ADD CONSTRAINT egg_ops_day_states_duck_eggs_check CHECK (duck_eggs >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'egg_ops_day_states_other_eggs_check'
  ) THEN
    ALTER TABLE egg_ops_day_states
      ADD CONSTRAINT egg_ops_day_states_other_eggs_check CHECK (other_eggs >= 0);
  END IF;
END $$;

-- Required when PostgREST has stale schema cache after ALTER TABLE.
NOTIFY pgrst, 'reload schema';
