-- ============================================================
-- Chicken incubation batch tracking (multi-breed hatch support)
-- Date: 2026-02-20
-- ============================================================

-- Batch-level incubation tracking (one machine run can contain many breeds)
CREATE TABLE IF NOT EXISTS chicken_incubation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT UNIQUE NOT NULL,
  eggs_set_date DATE NOT NULL,
  lock_down_date DATE NOT NULL,
  hatch_due_date DATE NOT NULL,
  total_eggs_set INT NOT NULL DEFAULT 0 CHECK (total_eggs_set >= 0),
  notes TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chicken_batches_eggs_set_date ON chicken_incubation_batches(eggs_set_date);
CREATE INDEX IF NOT EXISTS idx_chicken_batches_hatch_due_date ON chicken_incubation_batches(hatch_due_date);
CREATE INDEX IF NOT EXISTS idx_chicken_batches_active ON chicken_incubation_batches(active);

-- Per-breed hatch rows now can optionally belong to a batch.
ALTER TABLE chicken_hatches
  ADD COLUMN IF NOT EXISTS incubation_batch_id UUID,
  ADD COLUMN IF NOT EXISTS eggs_set_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_hatch_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_hatched_count INT DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chicken_hatches_incubation_batch_id_fkey'
  ) THEN
    ALTER TABLE chicken_hatches
      ADD CONSTRAINT chicken_hatches_incubation_batch_id_fkey
      FOREIGN KEY (incubation_batch_id)
      REFERENCES chicken_incubation_batches(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chicken_hatches_eggs_set_count_check'
  ) THEN
    ALTER TABLE chicken_hatches
      ADD CONSTRAINT chicken_hatches_eggs_set_count_check
      CHECK (eggs_set_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chicken_hatches_expected_hatch_count_check'
  ) THEN
    ALTER TABLE chicken_hatches
      ADD CONSTRAINT chicken_hatches_expected_hatch_count_check
      CHECK (expected_hatch_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chicken_hatches_actual_hatched_count_check'
  ) THEN
    ALTER TABLE chicken_hatches
      ADD CONSTRAINT chicken_hatches_actual_hatched_count_check
      CHECK (actual_hatched_count IS NULL OR actual_hatched_count >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chicken_hatches_batch ON chicken_hatches(incubation_batch_id);
CREATE INDEX IF NOT EXISTS idx_chicken_hatches_expected_hatch ON chicken_hatches(expected_hatch_count);

-- Backfill legacy rows so existing data continues to work with new logic.
UPDATE chicken_hatches
SET eggs_set_count = CASE
  WHEN eggs_set_count = 0 THEN GREATEST(initial_count, 0)
  ELSE eggs_set_count
END,
expected_hatch_count = CASE
  WHEN expected_hatch_count = 0 THEN GREATEST(initial_count, 0)
  ELSE expected_hatch_count
END;

-- Updated-at trigger for the new batch table
CREATE OR REPLACE FUNCTION update_chicken_batch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'chicken_incubation_batches_updated_at'
  ) THEN
    CREATE TRIGGER chicken_incubation_batches_updated_at
      BEFORE UPDATE ON chicken_incubation_batches
      FOR EACH ROW EXECUTE FUNCTION update_chicken_batch_updated_at();
  END IF;
END $$;

ALTER TABLE chicken_incubation_batches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chicken_incubation_batches'
      AND policyname = 'Service role full access chicken_incubation_batches'
  ) THEN
    CREATE POLICY "Service role full access chicken_incubation_batches"
      ON chicken_incubation_batches
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;
