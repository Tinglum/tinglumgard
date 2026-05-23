-- Add candling columns to chicken_hatches (per breed row)
ALTER TABLE chicken_hatches
  ADD COLUMN IF NOT EXISTS candling_date DATE,
  ADD COLUMN IF NOT EXISTS candling_fertile_count INTEGER,
  ADD COLUMN IF NOT EXISTS candling_removed_count INTEGER;

-- Add target climate settings to incubation batches
ALTER TABLE chicken_incubation_batches
  ADD COLUMN IF NOT EXISTS target_temperature NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS target_humidity NUMERIC(4,1);

-- Batch event log (timeline)
CREATE TABLE IF NOT EXISTS chicken_batch_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES chicken_incubation_batches(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batch_events_batch_id ON chicken_batch_events(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_events_created_at ON chicken_batch_events(created_at DESC);

-- Climate log (temp/humidity readings)
CREATE TABLE IF NOT EXISTS chicken_batch_climate_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES chicken_incubation_batches(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  temperature NUMERIC(4,1),
  humidity NUMERIC(4,1),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_climate_logs_batch_id ON chicken_batch_climate_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_climate_logs_logged_at ON chicken_batch_climate_logs(logged_at DESC);

-- RLS policies
ALTER TABLE chicken_batch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chicken_batch_climate_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to batch events"
  ON chicken_batch_events FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access to climate logs"
  ON chicken_batch_climate_logs FOR ALL
  USING (true) WITH CHECK (true);
