-- Add pricing configuration to app_config table
-- This is required for the checkout system to work

-- Insert pricing configuration
INSERT INTO app_config (key, value, description) VALUES
  ('box_8kg_price', '3500', '8kg box base price in NOK'),
  ('box_12kg_price', '4800', '12kg box base price in NOK'),
  ('box_8kg_deposit_percentage', '50', 'Deposit percentage for 8kg box'),
  ('box_12kg_deposit_percentage', '50', 'Deposit percentage for 12kg box'),
  ('delivery_fee_pickup_e6', '300', 'Pickup fee at E6 location in NOK'),
  ('delivery_fee_trondheim', '200', 'Delivery fee in Trondheim in NOK'),
  ('fresh_delivery_fee', '500', 'Fresh delivery upgrade fee in NOK')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verify the configuration was inserted
SELECT key, value, description 
FROM app_config 
WHERE key IN (
  'box_8kg_price',
  'box_12kg_price',
  'box_8kg_deposit_percentage',
  'box_12kg_deposit_percentage',
  'delivery_fee_pickup_e6',
  'delivery_fee_trondheim',
  'fresh_delivery_fee'
)
ORDER BY key;
