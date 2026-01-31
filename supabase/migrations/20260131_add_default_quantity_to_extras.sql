-- Add default_quantity to extras_catalog
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'extras_catalog' AND column_name = 'default_quantity'
  ) THEN
    ALTER TABLE extras_catalog ADD COLUMN default_quantity numeric(10,2) DEFAULT 1;
  END IF;
END $$;

-- Backfill default values for existing rows (set to 1 if null)
UPDATE extras_catalog SET default_quantity = 1 WHERE default_quantity IS NULL;
