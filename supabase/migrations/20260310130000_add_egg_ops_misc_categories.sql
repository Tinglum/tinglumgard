-- =============================================================================
-- EggOps misc daily categories (duck + other eggs)
-- These are daily counts and do not affect hatch inventory forecasting.
-- =============================================================================

CREATE TABLE IF NOT EXISTS egg_ops_day_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_date DATE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  duck_eggs INTEGER NOT NULL DEFAULT 0 CHECK (duck_eggs >= 0),
  other_eggs INTEGER NOT NULL DEFAULT 0 CHECK (other_eggs >= 0),
  closed_at TIMESTAMPTZ,
  closed_by TEXT,
  reopened_at TIMESTAMPTZ,
  reopened_by TEXT,
  reopen_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
