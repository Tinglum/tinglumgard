-- Create config table for pricing configuration
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert current pricing values (these should match your admin settings)
-- IMPORTANT: Update these values to match your actual desired prices!
INSERT INTO config (key, value, description) VALUES
  ('box_8kg_price', '3500', '8kg box base price in NOK'),
  ('box_12kg_price', '4800', '12kg box base price in NOK'),
  ('box_8kg_deposit_percentage', '1', 'Deposit percentage for 8kg box (1% = 35kr for testing)'),
  ('box_12kg_deposit_percentage', '1', 'Deposit percentage for 12kg box'),
  ('delivery_fee_pickup_e6', '300', 'Pickup fee at E6 location in NOK'),
  ('delivery_fee_trondheim', '200', 'Delivery fee in Trondheim in NOK'),
  ('fresh_delivery_fee', '500', 'Fresh delivery upgrade fee in NOK')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Note: I've set deposit percentage to 1% (35 kr) to match what Vipps Test is charging
-- Change this to 50 when moving to production!
