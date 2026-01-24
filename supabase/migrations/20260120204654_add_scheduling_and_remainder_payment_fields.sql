/*
  # Add Scheduling and Remainder Payment Fields

  1. Changes to orders table
    - Add `locked_at` (timestamptz) - When order was locked (Week 46)
    - Add `at_risk` (boolean) - Whether order is at risk due to unpaid remainder
    - Add `reminder_sent_at` (timestamptz) - When reminder email was sent
    - Add `vipps_remainder_order_id` (text) - Vipps order ID for remainder payment

  2. Configuration
    - Add lock_week configuration
    - Add reminder_week configuration

  3. Security
    - No RLS changes needed, inherits from orders table
*/

-- Add columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'locked_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN locked_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'at_risk'
  ) THEN
    ALTER TABLE orders ADD COLUMN at_risk boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'reminder_sent_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN reminder_sent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'vipps_remainder_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN vipps_remainder_order_id text;
  END IF;
END $$;

-- Insert lock week configuration
INSERT INTO app_config (key, value, description)
VALUES (
  'lock_week',
  '{"year": 2024, "week": 46, "reason": "Week 46 - orders are locked and finalized"}'::jsonb,
  'Week when orders are locked and can no longer be modified'
)
ON CONFLICT (key) DO NOTHING;

-- Insert reminder week configuration
INSERT INTO app_config (key, value, description)
VALUES (
  'reminder_week',
  '{"year": 2024, "week": 44, "reason": "Week 44 - send remainder payment reminders"}'::jsonb,
  'Week when remainder payment reminders are sent'
)
ON CONFLICT (key) DO NOTHING;

-- Create index for scheduled jobs
CREATE INDEX IF NOT EXISTS idx_orders_reminder_sent ON orders(reminder_sent_at) WHERE reminder_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_locked ON orders(locked_at) WHERE locked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_at_risk ON orders(at_risk) WHERE at_risk = true;
