ALTER TABLE milk_daily_sessions
ADD COLUMN IF NOT EXISTS milker_name TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_milk_daily_sessions_milker_name
  ON milk_daily_sessions(milker_name);

COMMENT ON COLUMN milk_daily_sessions.milker_name IS
  'Name of the person who milked this session. Used for milker-level analytics and performance tracking.';
