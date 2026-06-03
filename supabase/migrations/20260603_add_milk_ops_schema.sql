-- =============================================================================
-- Milk Operations: daily milking, pipeline, dairy production, recipes, inventory
-- =============================================================================

-- ─── Goat registry ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS milk_goats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tag_number TEXT UNIQUE,
  breed TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','dry','pregnant','retired','sold')),
  accent_color TEXT DEFAULT '#8B7355',
  display_order INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milk_goats_status ON milk_goats(status);

DROP TRIGGER IF EXISTS update_milk_goats_updated_at ON milk_goats;
CREATE TRIGGER update_milk_goats_updated_at
  BEFORE UPDATE ON milk_goats FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Daily milking sessions ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS milk_daily_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milking_date DATE NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'morning'
    CHECK (session_type IN ('morning','evening','extra')),
  total_liters NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (total_liters >= 0),
  temperature_celsius NUMERIC(4,1),
  notes TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_milk_daily_sessions_unique
  ON milk_daily_sessions(milking_date, session_type);

CREATE INDEX IF NOT EXISTS idx_milk_daily_sessions_by_date
  ON milk_daily_sessions(milking_date DESC);

DROP TRIGGER IF EXISTS update_milk_daily_sessions_updated_at ON milk_daily_sessions;
CREATE TRIGGER update_milk_daily_sessions_updated_at
  BEFORE UPDATE ON milk_daily_sessions FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Per-goat entries within a session ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS milk_session_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES milk_daily_sessions(id) ON DELETE CASCADE,
  goat_id UUID NOT NULL REFERENCES milk_goats(id) ON DELETE RESTRICT,
  liters NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (liters >= 0),
  health_flag TEXT NOT NULL DEFAULT 'normal'
    CHECK (health_flag IN ('normal','mastitis_suspect','colostrum','blood_traces','off_smell','other')),
  health_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_milk_session_entries_unique
  ON milk_session_entries(session_id, goat_id);

CREATE INDEX IF NOT EXISTS idx_milk_session_entries_by_session
  ON milk_session_entries(session_id);

DROP TRIGGER IF EXISTS update_milk_session_entries_updated_at ON milk_session_entries;
CREATE TRIGGER update_milk_session_entries_updated_at
  BEFORE UPDATE ON milk_session_entries FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Milk batches (pipeline) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS milk_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT NOT NULL UNIQUE,
  source_date DATE NOT NULL,
  source_session_ids UUID[] NOT NULL DEFAULT '{}',
  liters_raw NUMERIC(8,2) NOT NULL CHECK (liters_raw > 0),
  liters_remaining NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (liters_remaining >= 0),
  pipeline_status TEXT NOT NULL DEFAULT 'raw'
    CHECK (pipeline_status IN ('raw','pasteurizing','pasteurized','bottling','bottled','fridged','allocated','discarded')),
  pasteurized_at TIMESTAMPTZ,
  pasteurize_temp NUMERIC(4,1),
  pasteurize_minutes INT,
  bottled_at TIMESTAMPTZ,
  bottle_count INT,
  bottle_size_ml INT DEFAULT 1000,
  fridged_at TIMESTAMPTZ,
  discarded_at TIMESTAMPTZ,
  discard_reason TEXT,
  notes TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milk_batches_status ON milk_batches(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_milk_batches_date ON milk_batches(source_date DESC);

DROP TRIGGER IF EXISTS update_milk_batches_updated_at ON milk_batches;
CREATE TRIGGER update_milk_batches_updated_at
  BEFORE UPDATE ON milk_batches FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Milk batch audit ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS milk_batch_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES milk_batches(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT,
  changed_by TEXT,
  metadata JSONB DEFAULT '{}',
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milk_batch_audit_batch
  ON milk_batch_audit(batch_id, changed_at DESC);

-- ─── Dairy recipes ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dairy_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  product_type TEXT NOT NULL DEFAULT 'cheese'
    CHECK (product_type IN ('cheese','yoghurt','butter','cream','kefir','skyr','other')),
  version INT NOT NULL DEFAULT 1,
  parent_recipe_id UUID REFERENCES dairy_recipes(id) ON DELETE SET NULL,
  description TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]',
  steps JSONB NOT NULL DEFAULT '[]',
  aging_min_days INT,
  aging_max_days INT,
  aging_temp_celsius NUMERIC(4,1),
  aging_humidity_pct INT,
  difficulty TEXT NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy','medium','advanced')),
  expected_yield_pct NUMERIC(5,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dairy_recipes_type ON dairy_recipes(product_type);
CREATE INDEX IF NOT EXISTS idx_dairy_recipes_parent ON dairy_recipes(parent_recipe_id);

DROP TRIGGER IF EXISTS update_dairy_recipes_updated_at ON dairy_recipes;
CREATE TRIGGER update_dairy_recipes_updated_at
  BEFORE UPDATE ON dairy_recipes FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Dairy production batches ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dairy_production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT NOT NULL UNIQUE,
  recipe_id UUID REFERENCES dairy_recipes(id) ON DELETE SET NULL,
  product_type TEXT NOT NULL
    CHECK (product_type IN ('cheese','yoghurt','butter','cream','kefir','skyr','other')),
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','aging','ready','consumed','sold','discarded')),
  milk_batch_ids UUID[] NOT NULL DEFAULT '{}',
  milk_liters_used NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (milk_liters_used >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  process_log JSONB NOT NULL DEFAULT '[]',
  yield_kg NUMERIC(8,3),
  yield_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN milk_liters_used > 0 AND yield_kg IS NOT NULL
      THEN ROUND((yield_kg / milk_liters_used) * 100, 2)
      ELSE NULL
    END
  ) STORED,
  aging_location TEXT,
  aging_start DATE,
  aging_target_date DATE,
  aging_temp NUMERIC(4,1),
  aging_humidity INT,
  quality_score INT CHECK (quality_score IS NULL OR (quality_score >= 1 AND quality_score <= 10)),
  tasting_notes TEXT,
  consumed_at TIMESTAMPTZ,
  consumed_notes TEXT,
  sold_at TIMESTAMPTZ,
  sold_price_nok INT,
  sold_to TEXT,
  discarded_at TIMESTAMPTZ,
  discard_reason TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dairy_production_status ON dairy_production_batches(status);
CREATE INDEX IF NOT EXISTS idx_dairy_production_recipe ON dairy_production_batches(recipe_id);
CREATE INDEX IF NOT EXISTS idx_dairy_production_started ON dairy_production_batches(started_at DESC);

DROP TRIGGER IF EXISTS update_dairy_production_updated_at ON dairy_production_batches;
CREATE TRIGGER update_dairy_production_updated_at
  BEFORE UPDATE ON dairy_production_batches FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Dairy production audit ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dairy_production_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID NOT NULL REFERENCES dairy_production_batches(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT,
  changed_by TEXT,
  metadata JSONB DEFAULT '{}',
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dairy_production_audit_batch
  ON dairy_production_audit(production_id, changed_at DESC);

-- ─── Day states ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS milk_ops_day_states (
  milking_date DATE PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','closed')),
  morning_liters NUMERIC(8,2) DEFAULT 0,
  evening_liters NUMERIC(8,2) DEFAULT 0,
  closed_at TIMESTAMPTZ,
  closed_by TEXT,
  reopened_at TIMESTAMPTZ,
  reopened_by TEXT,
  reopen_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_milk_ops_day_states_updated_at ON milk_ops_day_states;
CREATE TRIGGER update_milk_ops_day_states_updated_at
  BEFORE UPDATE ON milk_ops_day_states FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Config seeds ───────────────────────────────────────────────────────────

INSERT INTO app_config (key, value, description)
VALUES
  ('milk_ops_require_auth', 'false', 'Require authentication for milk operations'),
  ('milk_ops_ip_allowlist', '[]', 'IP allowlist for milk operations (JSON array)'),
  ('milk_default_bottle_size_ml', '1000', 'Default bottle size in ml'),
  ('milk_pasteurize_default_temp', '72', 'Default pasteurization temperature (Celsius)'),
  ('milk_pasteurize_default_minutes', '15', 'Default pasteurization duration (minutes)'),
  ('milk_aging_alert_days_before', '7', 'Days before aging target to trigger alert')
ON CONFLICT (key) DO NOTHING;

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE milk_goats ENABLE ROW LEVEL SECURITY;
ALTER TABLE milk_daily_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE milk_session_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE milk_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE milk_batch_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE dairy_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dairy_production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dairy_production_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE milk_ops_day_states ENABLE ROW LEVEL SECURITY;
