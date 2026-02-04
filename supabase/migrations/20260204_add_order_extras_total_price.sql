-- Add `total_price` column to `order_extras` if it's missing, and backfill values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_extras' AND column_name = 'total_price'
  ) THEN
    ALTER TABLE order_extras ADD COLUMN total_price INT;

    -- Backfill existing rows: prefer existing price_nok * quantity calculation
    UPDATE order_extras
    SET total_price = ROUND(COALESCE(price_nok, 0) * COALESCE(quantity, 1))
    WHERE total_price IS NULL;

    -- Ensure future inserts have a sensible default if omitted (not forced)
    -- (Do not add NOT NULL to avoid compatibility issues with older inserts.)
  END IF;
END $$;

-- Optional: ensure consistent data type and constraints in future migrations if desired.
