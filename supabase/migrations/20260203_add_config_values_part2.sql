-- Add configuration values to app_config (part 2 of 3)
-- Delivery fees

INSERT INTO app_config (key, value, description) VALUES
  ('delivery_fee_pickup_e6', '300', 'Pickup fee at E6 location in NOK'),
  ('delivery_fee_trondheim', '200', 'Delivery fee in Trondheim in NOK')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verify
SELECT key, value, description FROM app_config 
WHERE key IN (
  'delivery_fee_pickup_e6',
  'delivery_fee_trondheim'
)
ORDER BY key;
