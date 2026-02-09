-- Add extra credit amount for out-of-stock extras on pig orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'extra_credit_amount_nok'
  ) THEN
    ALTER TABLE orders ADD COLUMN extra_credit_amount_nok INT DEFAULT 0;
  END IF;
END $$;
