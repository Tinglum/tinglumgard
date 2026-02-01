-- Add box_contents configuration to app_config table
-- This stores the list of products included in the standard kasse and available extras

INSERT INTO app_config (key, value, description)
VALUES (
  'box_contents',
  '{
    "inBox": ["Knoke (1 stk)", "Medisterfarse", "Julepølse", "Nakkekoteletter", "Svinesteik", "Ribbe (velg type)", "Slakterens valg (varierer)"],
    "canOrder": []
  }'::jsonb,
  'Products included in standard box and available extras - synced to oppdelingsplan from admin'
)
ON CONFLICT (key) DO NOTHING;
