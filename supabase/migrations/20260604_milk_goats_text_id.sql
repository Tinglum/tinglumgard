-- Change milk_goats.id from UUID to TEXT to match goat-lineage IDs (slug-based)
-- Also update the FK on milk_session_entries

-- Drop FK constraint first
ALTER TABLE milk_session_entries DROP CONSTRAINT IF EXISTS milk_session_entries_goat_id_fkey;

-- Change milk_goats.id to TEXT
ALTER TABLE milk_goats ALTER COLUMN id SET DATA TYPE TEXT;
ALTER TABLE milk_goats ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;

-- Change milk_session_entries.goat_id to TEXT
ALTER TABLE milk_session_entries ALTER COLUMN goat_id SET DATA TYPE TEXT;

-- Re-add FK
ALTER TABLE milk_session_entries ADD CONSTRAINT milk_session_entries_goat_id_fkey
  FOREIGN KEY (goat_id) REFERENCES milk_goats(id) ON DELETE RESTRICT;
