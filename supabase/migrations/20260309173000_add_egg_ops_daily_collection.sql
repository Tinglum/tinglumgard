-- =============================================================================
-- EggOps daily collection, forecasting and alerting
-- =============================================================================

CREATE TABLE IF NOT EXISTS egg_daily_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_date DATE NOT NULL,
  breed_id UUID NOT NULL REFERENCES egg_breeds(id) ON DELETE RESTRICT,
  total_collected INTEGER NOT NULL DEFAULT 0 CHECK (total_collected >= 0),
  sellable_standard INTEGER NOT NULL DEFAULT 0 CHECK (sellable_standard >= 0),
  too_small INTEGER NOT NULL DEFAULT 0 CHECK (too_small >= 0),
  dirty INTEGER NOT NULL DEFAULT 0 CHECK (dirty >= 0),
  cracked INTEGER NOT NULL DEFAULT 0 CHECK (cracked >= 0),
  shell_defect INTEGER NOT NULL DEFAULT 0 CHECK (shell_defect >= 0),
  other_unsellable INTEGER NOT NULL DEFAULT 0 CHECK (other_unsellable >= 0),
  notes TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT egg_daily_collections_total_breakdown_check CHECK (
    total_collected = (
      sellable_standard +
      too_small +
      dirty +
      cracked +
      shell_defect +
      other_unsellable
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_egg_daily_collections_unique_day_breed
  ON egg_daily_collections(collection_date, breed_id);

CREATE INDEX IF NOT EXISTS idx_egg_daily_collections_by_date
  ON egg_daily_collections(collection_date DESC);

CREATE INDEX IF NOT EXISTS idx_egg_daily_collections_by_breed_date
  ON egg_daily_collections(breed_id, collection_date DESC);

DROP TRIGGER IF EXISTS update_egg_daily_collections_updated_at ON egg_daily_collections;
CREATE TRIGGER update_egg_daily_collections_updated_at
  BEFORE UPDATE ON egg_daily_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS egg_daily_collection_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES egg_daily_collections(id) ON DELETE CASCADE,
  before_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  changed_by TEXT,
  change_reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egg_daily_collection_audit_collection
  ON egg_daily_collection_audit(collection_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS egg_weekly_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breed_id UUID NOT NULL REFERENCES egg_breeds(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  delivery_monday DATE NOT NULL,
  avg_14d_sellable NUMERIC(10,2) NOT NULL DEFAULT 0,
  forecast_eggs INTEGER NOT NULL DEFAULT 0 CHECK (forecast_eggs >= 0),
  low_stock BOOLEAN NOT NULL DEFAULT FALSE,
  deficit BOOLEAN NOT NULL DEFAULT FALSE,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT egg_weekly_forecasts_week_check CHECK (week_number BETWEEN 1 AND 53)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_egg_weekly_forecasts_unique
  ON egg_weekly_forecasts(breed_id, year, week_number);

CREATE INDEX IF NOT EXISTS idx_egg_weekly_forecasts_delivery_monday
  ON egg_weekly_forecasts(delivery_monday);

DROP TRIGGER IF EXISTS update_egg_weekly_forecasts_updated_at ON egg_weekly_forecasts;
CREATE TRIGGER update_egg_weekly_forecasts_updated_at
  BEFORE UPDATE ON egg_weekly_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS egg_ops_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'deficit', 'data_gap', 'missing_email')),
  breed_id UUID REFERENCES egg_breeds(id) ON DELETE SET NULL,
  year INTEGER,
  week_number INTEGER,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egg_ops_alerts_open
  ON egg_ops_alerts(alert_type, created_at DESC)
  WHERE resolved_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_egg_ops_alerts_unique_open
  ON egg_ops_alerts(
    alert_type,
    COALESCE(breed_id::text, ''),
    COALESCE(year::text, ''),
    COALESCE(week_number::text, '')
  )
  WHERE resolved_at IS NULL;

ALTER TABLE egg_inventory
  ADD COLUMN IF NOT EXISTS manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS forecast_source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS auto_forecast_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deficit_alert BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'egg_inventory_forecast_source_check'
  ) THEN
    ALTER TABLE egg_inventory
      ADD CONSTRAINT egg_inventory_forecast_source_check
      CHECK (forecast_source IN ('manual', 'auto'));
  END IF;
END $$;

INSERT INTO app_config (key, value)
VALUES
  ('egg_forecast_window_days', '14'::jsonb),
  ('egg_forecast_horizon_weeks', '4'::jsonb),
  ('egg_forecast_sync_enabled', 'true'::jsonb),
  ('egg_forecast_timezone', '"Europe/Oslo"'::jsonb),
  ('egg_low_stock_thresholds', '{}'::jsonb),
  ('egg_ops_default_language', '"no"'::jsonb)
ON CONFLICT (key) DO NOTHING;
