-- Add configuration values to app_config (part 1 of 3)
-- Box deposit percentages

INSERT INTO app_config (key, value, description) VALUES
  ('box_8kg_deposit_percentage', '50', 'Deposit percentage for 8kg box'),
  ('box_12kg_deposit_percentage', '50', 'Deposit percentage for 12kg box')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verify
SELECT key, value, description FROM app_config 
WHERE key IN (
  'box_8kg_deposit_percentage',
  'box_12kg_deposit_percentage'
)
ORDER BY key;
