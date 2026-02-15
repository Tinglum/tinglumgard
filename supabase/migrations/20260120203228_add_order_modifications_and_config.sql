/*
  # Add Order Modifications and Configuration

  1. New Tables
    - `app_config` - Application configuration settings
      - `key` (text, primary key)
      - `value` (jsonb)
      - `description` (text)
      - `updated_at` (timestamptz)

  2. Changes to orders table
    - Add `add_ons_json` (jsonb) - Store selected add-ons
    - Add `extras_json` (jsonb) - Store selected extras
    - Add `last_modified_at` (timestamptz) - Track when order was last updated

  3. Security
    - Admins can read/write config
    - Users can update own orders
*/

-- Create app_config table
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage config" ON app_config;
DROP POLICY IF EXISTS "Service role can manage config" ON app_config;

CREATE POLICY "Admins can manage config"
  ON app_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role' = 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role' = 'admin')
    )
  );

CREATE POLICY "Service role can manage config"
  ON app_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert default cutoff configuration (week 46 of 2024)
INSERT INTO app_config (key, value, description)
VALUES (
  'order_modification_cutoff',
  '{"year": 2024, "week": 46, "reason": "Production schedule finalized"}'::jsonb,
  'Week number after which orders cannot be modified'
)
ON CONFLICT (key) DO NOTHING;

-- Add columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'add_ons_json'
  ) THEN
    ALTER TABLE orders ADD COLUMN add_ons_json jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'extras_json'
  ) THEN
    ALTER TABLE orders ADD COLUMN extras_json jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'last_modified_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN last_modified_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add policy for users to update their own orders
DROP POLICY IF EXISTS "Users can update own orders" ON orders;

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM vipps_users WHERE vipps_sub = current_setting('app.vipps_sub', true)
  ))
  WITH CHECK (user_id IN (
    SELECT id FROM vipps_users WHERE vipps_sub = current_setting('app.vipps_sub', true)
  ));
