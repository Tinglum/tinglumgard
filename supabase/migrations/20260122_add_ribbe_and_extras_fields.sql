-- Add ribbe_choice and extra_products fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS ribbe_choice TEXT,
ADD COLUMN IF NOT EXISTS extra_products JSONB DEFAULT '[]'::jsonb;

-- Update extras_catalog to support pricing types
ALTER TABLE extras_catalog
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'per_unit' CHECK (pricing_type IN ('per_unit', 'per_kg')),
ADD COLUMN IF NOT EXISTS description_no TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS stock_quantity INT,
ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_ribbe_choice ON orders(ribbe_choice);
CREATE INDEX IF NOT EXISTS idx_extras_catalog_active ON extras_catalog(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_extras_catalog_display_order ON extras_catalog(display_order);

-- Update order_extras table to support quantities and weights
ALTER TABLE order_extras
ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'unit' CHECK (unit_type IN ('unit', 'kg'));

-- Seed initial extras catalog
INSERT INTO extras_catalog (slug, name_no, name_en, description_no, description_en, price_nok, pricing_type, active, display_order)
VALUES
  ('indrefilet', 'Indrefilet', 'Inner Tenderloin', 'Premium mør filet', 'Premium tender fillet', 450, 'per_unit', true, 1),
  ('ytrefilet', 'Ytrefilet/Ryggfilet', 'Outer Tenderloin/Back Fillet', 'Saftig og mør', 'Juicy and tender', 380, 'per_unit', true, 2),
  ('koteletter', 'Svinekoteletter', 'Pork Chops', 'Perfekt til grilling', 'Perfect for grilling', 280, 'per_kg', true, 3),
  ('ekstra_ribbe', 'Ekstra ribbe', 'Extra Ribs', 'Mer av det gode', 'More of the good stuff', 320, 'per_kg', true, 4),
  ('bacon', 'Bacon/Sideflesk', 'Bacon/Side Pork', 'Hjemmelaget bacon', 'Homemade bacon', 250, 'per_kg', true, 5),
  ('spekeskinke', 'Spekeskinke', 'Cured Ham', 'Tradisjonell spekeskinke', 'Traditional cured ham', 400, 'per_kg', true, 6),
  ('bogsteik', 'Bogsteik (pulled pork)', 'Shoulder Roast (Pulled Pork)', 'Perfekt til pulled pork', 'Perfect for pulled pork', 290, 'per_kg', true, 7),
  ('svinelabb', 'Svinelabb', 'Pork Trotter', 'Tradisjonell delikatesse', 'Traditional delicacy', 150, 'per_unit', true, 8)
ON CONFLICT (slug) DO UPDATE SET
  name_no = EXCLUDED.name_no,
  name_en = EXCLUDED.name_en,
  description_no = EXCLUDED.description_no,
  description_en = EXCLUDED.description_en,
  price_nok = EXCLUDED.price_nok,
  pricing_type = EXCLUDED.pricing_type,
  display_order = EXCLUDED.display_order;
