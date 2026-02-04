-- Add configuration values to app_config (part 3 of 3)
-- Fresh delivery upgrade fee

INSERT INTO app_config (key, value, description) VALUES
  ('fresh_delivery_fee', '500', 'Fresh delivery upgrade fee in NOK')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verify
SELECT key, value, description FROM app_config 
WHERE key IN (
  'fresh_delivery_fee'
)
ORDER BY key;
