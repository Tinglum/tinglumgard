-- Add configuration values to app_config (NOT prices - those come from box_configurations)
-- Box prices are set in Admin Panel under Boksinnhold

INSERT INTO app_config (key, value, description) VALUES
  ('box_8kg_deposit_percentage', '50', 'Deposit percentage for 8kg box'),
  ('box_12kg_deposit_percentage', '50', 'Deposit percentage for 12kg box'),
  ('delivery_fee_pickup_e6', '300', 'Pickup fee at E6 location in NOK'),
  ('delivery_fee_trondheim', '200', 'Delivery fee in Trondheim in NOK'),
  ('fresh_delivery_fee', '500', 'Fresh delivery upgrade fee in NOK')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verify
SELECT key, value, description FROM app_config 
WHERE key IN (
  'box_8kg_deposit_percentage',
  'box_12kg_deposit_percentage',
  'delivery_fee_pickup_e6',
  'delivery_fee_trondheim',
  'fresh_delivery_fee'
)
ORDER BY key;
