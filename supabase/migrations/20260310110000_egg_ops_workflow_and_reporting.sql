-- =============================================================================
-- EggOps v2 workflow, alerts lifecycle, security flags and reporting config
-- =============================================================================

CREATE TABLE IF NOT EXISTS egg_ops_day_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_date DATE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  closed_at TIMESTAMPTZ,
  closed_by TEXT,
  reopened_at TIMESTAMPTZ,
  reopened_by TEXT,
  reopen_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egg_ops_day_states_status_date
  ON egg_ops_day_states(status, collection_date DESC);

DROP TRIGGER IF EXISTS update_egg_ops_day_states_updated_at ON egg_ops_day_states;
CREATE TRIGGER update_egg_ops_day_states_updated_at
  BEFORE UPDATE ON egg_ops_day_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE egg_ops_alerts
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'warning',
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by TEXT,
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'egg_ops_alerts_severity_check'
  ) THEN
    ALTER TABLE egg_ops_alerts
      ADD CONSTRAINT egg_ops_alerts_severity_check
      CHECK (severity IN ('critical', 'warning', 'info'));
  END IF;
END $$;

UPDATE egg_ops_alerts
SET severity = CASE
  WHEN alert_type = 'deficit' THEN 'critical'
  WHEN alert_type = 'low_stock' THEN 'warning'
  ELSE 'info'
END
WHERE severity IS NULL OR severity NOT IN ('critical', 'warning', 'info');

CREATE INDEX IF NOT EXISTS idx_egg_ops_alerts_open_visibility
  ON egg_ops_alerts(severity, created_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_egg_ops_alerts_snoozed_until
  ON egg_ops_alerts(snoozed_until)
  WHERE resolved_at IS NULL;

INSERT INTO app_config (key, value)
VALUES
  ('egg_ops_require_auth', 'false'::jsonb),
  ('egg_ops_ip_allowlist', '[]'::jsonb),
  ('egg_ops_summary_enabled', 'false'::jsonb),
  ('egg_ops_summary_recipients', '[]'::jsonb),
  ('egg_ops_anomaly_drop_threshold_percent', '25'::jsonb),
  ('egg_ops_anomaly_spike_threshold_percent', '25'::jsonb)
ON CONFLICT (key) DO NOTHING;
