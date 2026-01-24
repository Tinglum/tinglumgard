/*
  # Add Vipps Checkout API v3 Support

  1. Schema Changes
    - Add `vipps_session_id` column to payments table for Checkout v3 sessions
    - Keep `vipps_order_id` for backward compatibility with ePayment API
    - Add index on `vipps_session_id` for faster lookups

  2. Notes
    - Both `vipps_order_id` (ePayment reference) and `vipps_session_id` (Checkout session) can coexist
    - New payments will use `vipps_session_id` from Checkout API v3
    - Legacy payments will continue to use `vipps_order_id`
    - No data loss - existing payments unchanged
*/

-- Add vipps_session_id column to payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'vipps_session_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN vipps_session_id text;
  END IF;
END $$;

-- Add index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_payments_vipps_session_id ON payments(vipps_session_id);

-- Add comment to document the column purpose
COMMENT ON COLUMN payments.vipps_session_id IS 'Vipps Checkout API v3 session ID';
COMMENT ON COLUMN payments.vipps_order_id IS 'Vipps ePayment API v1 reference (legacy)';