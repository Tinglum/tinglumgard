-- Egg forecast v2: flock event markers, accuracy log, is_estimate flag

-- Flock event markers: tells the forecast to ignore data before this date for a breed
CREATE TABLE IF NOT EXISTS egg_flock_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breed_id    uuid NOT NULL REFERENCES egg_breeds(id) ON DELETE CASCADE,
  event_date  date NOT NULL,
  event_type  text NOT NULL DEFAULT 'other',
  -- 'new_rooster','rooster_removed','new_hens','molt_start','molt_end','illness','culling','other'
  notes       text,
  created_by  text NOT NULL DEFAULT 'admin',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS egg_flock_events_breed_date ON egg_flock_events(breed_id, event_date DESC);

-- Accuracy log: records forecast vs actual for each week/breed after Sunday finalisation
CREATE TABLE IF NOT EXISTS egg_forecast_accuracy_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breed_id            uuid NOT NULL REFERENCES egg_breeds(id) ON DELETE CASCADE,
  year                int NOT NULL,
  week_number         int NOT NULL,
  delivery_monday     date NOT NULL,
  actual_eggs         int,                  -- final collected (set on Sunday finalisation)
  forecast_5wk_out    int,                  -- what eggs_available was set to when 5+ weeks out
  forecast_4wk_out    int,
  forecast_3wk_out    int,
  forecast_2wk_out    int,
  forecast_1wk_out    int,                  -- last estimate before Sunday
  finalised_at        timestamptz,          -- when Sunday run locked in actual
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (breed_id, year, week_number)
);
CREATE INDEX IF NOT EXISTS egg_forecast_accuracy_log_breed ON egg_forecast_accuracy_log(breed_id, delivery_monday DESC);

-- Add is_estimate flag to egg_inventory (true for weeks >4 out)
ALTER TABLE egg_inventory ADD COLUMN IF NOT EXISTS is_estimate boolean NOT NULL DEFAULT false;

-- Add divergence_alert flag (set when within 3 weeks and actual diverges >20% from earlier forecast)
ALTER TABLE egg_inventory ADD COLUMN IF NOT EXISTS divergence_alert boolean NOT NULL DEFAULT false;
ALTER TABLE egg_inventory ADD COLUMN IF NOT EXISTS divergence_pct int;  -- signed %, positive = higher than predicted
