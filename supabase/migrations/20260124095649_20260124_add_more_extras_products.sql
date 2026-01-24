/*
  # Add More Extras Products to Catalog

  1. New Extras
    - Add more traditional pig products
    - Kjøttdeig (ground pork)
    - Pølser (sausages)
    - Medisterpølse (traditional sausage)
    - Kamsteik (neck roast)
    - Kjøttbiter (meat cubes)
    - Svinekam (pork loin)
    - Pinnekjøtt (salted and dried ribs)

  2. Updates
    - Set proper display order
    - Add descriptions

  3. Security
    - No changes needed, existing RLS policies apply
*/

-- Add new extras to catalog
INSERT INTO extras_catalog (slug, name_no, name_en, description_no, description_en, price_nok, pricing_type, active, display_order)
VALUES
  ('kjottdeig', 'Kjøttdeig', 'Ground Pork', 'Hjemmelaget kjøttdeig', 'Homemade ground pork', 180, 'per_kg', true, 9),
  ('polser', 'Pølser', 'Sausages', 'Grillpølser og kokepolser', 'Grilling and cooking sausages', 220, 'per_kg', true, 10),
  ('medisterpølse', 'Medisterpølse', 'Traditional Norwegian Sausage', 'Klassisk medisterpølse', 'Classic medister sausage', 260, 'per_kg', true, 11),
  ('kamsteik', 'Kamsteik/Svinesteik', 'Neck Roast/Pork Roast', 'Saftig steik', 'Juicy roast', 270, 'per_kg', true, 12),
  ('kjottbiter', 'Kjøttbiter til gryteretter', 'Meat Cubes for Stews', 'Perfekt til gryte og wok', 'Perfect for stews and wok', 240, 'per_kg', true, 13),
  ('svinekam', 'Hel svinekam', 'Whole Pork Loin', 'Perfekt til julemiddag', 'Perfect for Christmas dinner', 350, 'per_kg', true, 14),
  ('pinnekjøtt', 'Pinnekjøtt', 'Salted and Dried Ribs', 'Tradisjonell julemat', 'Traditional Christmas food', 380, 'per_kg', true, 15)
ON CONFLICT (slug) DO UPDATE SET
  name_no = EXCLUDED.name_no,
  name_en = EXCLUDED.name_en,
  description_no = EXCLUDED.description_no,
  description_en = EXCLUDED.description_en,
  price_nok = EXCLUDED.price_nok,
  pricing_type = EXCLUDED.pricing_type,
  display_order = EXCLUDED.display_order,
  active = EXCLUDED.active;
