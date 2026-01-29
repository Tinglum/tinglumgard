-- Safe migration to add missing columns and data
-- This script checks before adding to avoid conflicts

-- 1. Add missing columns to extras_catalog if they don't exist
DO $$
BEGIN
  -- Add display_order column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'extras_catalog' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE extras_catalog ADD COLUMN display_order INT DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_extras_catalog_display_order ON extras_catalog(display_order);
  END IF;

  -- Add pricing_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'extras_catalog' AND column_name = 'pricing_type'
  ) THEN
    ALTER TABLE extras_catalog ADD COLUMN pricing_type TEXT DEFAULT 'per_unit' CHECK (pricing_type IN ('per_unit', 'per_kg'));
  END IF;

  -- Add description_no column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'extras_catalog' AND column_name = 'description_no'
  ) THEN
    ALTER TABLE extras_catalog ADD COLUMN description_no TEXT;
  END IF;

  -- Add description_en column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'extras_catalog' AND column_name = 'description_en'
  ) THEN
    ALTER TABLE extras_catalog ADD COLUMN description_en TEXT;
  END IF;

  -- Add stock_quantity column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'extras_catalog' AND column_name = 'stock_quantity'
  ) THEN
    ALTER TABLE extras_catalog ADD COLUMN stock_quantity INT;
  END IF;
END $$;

-- 2. Add missing columns to orders if they don't exist
DO $$
BEGIN
  -- Add ribbe_choice column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'ribbe_choice'
  ) THEN
    ALTER TABLE orders ADD COLUMN ribbe_choice TEXT;
    CREATE INDEX IF NOT EXISTS idx_orders_ribbe_choice ON orders(ribbe_choice);
  END IF;

  -- Add extra_products column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'extra_products'
  ) THEN
    ALTER TABLE orders ADD COLUMN extra_products JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 3. Add missing columns to order_extras if they don't exist
DO $$
BEGIN
  -- Add quantity column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_extras' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE order_extras ADD COLUMN quantity DECIMAL(10,2) DEFAULT 1.0;
  END IF;

  -- Add unit_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_extras' AND column_name = 'unit_type'
  ) THEN
    ALTER TABLE order_extras ADD COLUMN unit_type TEXT DEFAULT 'unit' CHECK (unit_type IN ('unit', 'kg'));
  END IF;
END $$;

-- 4. Add missing columns to payments if they don't exist
DO $$
BEGIN
  -- Add vipps_session_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'vipps_session_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN vipps_session_id text;
    CREATE INDEX IF NOT EXISTS idx_payments_vipps_session_id ON payments(vipps_session_id);
  END IF;

  -- Rename vipps_order_id to vipps_payment_id if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'vipps_order_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'vipps_payment_id'
  ) THEN
    ALTER TABLE payments RENAME COLUMN vipps_order_id TO vipps_payment_id;
  END IF;
END $$;

-- 5. Add missing extras to catalog (use ON CONFLICT to avoid duplicates)
INSERT INTO extras_catalog (slug, name_no, name_en, description_no, description_en, price_nok, pricing_type, active, display_order)
VALUES
  ('indrefilet', 'Indrefilet', 'Inner Tenderloin', 'Premium mør filet', 'Premium tender fillet', 450, 'per_unit', true, 1),
  ('ytrefilet', 'Ytrefilet/Ryggfilet', 'Outer Tenderloin/Back Fillet', 'Saftig og mør', 'Juicy and tender', 380, 'per_unit', true, 2),
  ('koteletter', 'Svinekoteletter', 'Pork Chops', 'Perfekt til grilling', 'Perfect for grilling', 280, 'per_kg', true, 3),
  ('ekstra_ribbe', 'Ekstra ribbe', 'Extra Ribs', 'Mer av det gode', 'More of the good stuff', 320, 'per_kg', true, 4),
  ('bacon', 'Bacon/Sideflesk', 'Bacon/Side Pork', 'Hjemmelaget bacon', 'Homemade bacon', 250, 'per_kg', true, 5),
  ('spekeskinke', 'Spekeskinke', 'Cured Ham', 'Tradisjonell spekeskinke', 'Traditional cured ham', 400, 'per_kg', true, 6),
  ('bogsteik', 'Bogsteik (pulled pork)', 'Shoulder Roast (Pulled Pork)', 'Perfekt til pulled pork', 'Perfect for pulled pork', 290, 'per_kg', true, 7),
  ('svinelabb', 'Svinelabb', 'Pork Trotter', 'Tradisjonell delikatesse', 'Traditional delicacy', 150, 'per_unit', true, 8),
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
