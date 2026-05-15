ALTER TABLE chicken_orders
  ADD COLUMN IF NOT EXISTS reminder_7_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_5_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_3_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_1_sent boolean DEFAULT false;
