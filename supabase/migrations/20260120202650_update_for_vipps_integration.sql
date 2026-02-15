/*
  # Update for Vipps Integration

  1. New Tables
    - `vipps_users` - Custom user table for Vipps login
      - `id` (uuid, primary key)
      - `vipps_sub` (text, unique) - Vipps user identifier
      - `phone_number` (text)
      - `email` (text)
      - `name` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to payments table
    - Add `idempotency_key` for webhook safety
    - Add `webhook_processed_at` to track processing
    - Rename `vipps_order_id` to `vipps_payment_id` for clarity
    - Rename `payment_type` to `type` for consistency

  3. Security
    - RLS on vipps_users
    - Service role access for webhooks
*/

-- Create custom users table for Vipps
CREATE TABLE IF NOT EXISTS vipps_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vipps_sub text UNIQUE NOT NULL,
  phone_number text,
  email text,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vipps_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage vipps users" ON vipps_users;

CREATE POLICY "Service role can manage vipps users"
  ON vipps_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add missing columns to payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE payments ADD COLUMN idempotency_key text UNIQUE;
    CREATE INDEX idx_payments_idempotency_key ON payments(idempotency_key);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'webhook_processed_at'
  ) THEN
    ALTER TABLE payments ADD COLUMN webhook_processed_at timestamptz;
  END IF;
END $$;

-- Update existing data to have idempotency keys (if any records exist)
UPDATE payments SET idempotency_key = id::text WHERE idempotency_key IS NULL;
ALTER TABLE payments ALTER COLUMN idempotency_key SET NOT NULL;
