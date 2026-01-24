/*
  # Extend Extras Catalog and Orders for Admin Features

  1. Changes to extras_catalog
    - Add `description` (text) - Description of the extra
    - Add `consumes_inventory_kg` (boolean) - Whether it consumes inventory
    - Add `kg_per_unit` (numeric) - Kilograms consumed per unit
    - Add `updated_at` (timestamptz) - Last update timestamp

  2. Changes to orders table
    - Add `admin_notes` (text) - Admin-only notes
    - Add `marked_delivered_at` (timestamptz) - When marked as delivered
    - Add `marked_delivered_by` (uuid) - Which admin marked it delivered

  3. Configuration
    - Add payment deadline configuration

  4. Security
    - Update RLS policies for admin access
*/

-- Add columns to extras_catalog
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'extras_catalog' AND column_name = 'description'
  ) THEN
    ALTER TABLE extras_catalog ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'extras_catalog' AND column_name = 'consumes_inventory_kg'
  ) THEN
    ALTER TABLE extras_catalog ADD COLUMN consumes_inventory_kg boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'extras_catalog' AND column_name = 'kg_per_unit'
  ) THEN
    ALTER TABLE extras_catalog ADD COLUMN kg_per_unit numeric(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'extras_catalog' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE extras_catalog ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add admin-related columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN admin_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'marked_delivered_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN marked_delivered_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'marked_delivered_by'
  ) THEN
    ALTER TABLE orders ADD COLUMN marked_delivered_by uuid;
  END IF;
END $$;

-- Update existing extras with inventory consumption data
UPDATE extras_catalog
SET 
  consumes_inventory_kg = true,
  kg_per_unit = CASE 
    WHEN slug = 'extra_bones' THEN 2.0
    WHEN slug = 'organ_package' THEN 1.5
    WHEN slug = 'oxtail' THEN 1.0
    ELSE 0
  END,
  description = CASE
    WHEN slug = 'extra_bones' THEN 'Ekstra oksebeiner for kraft'
    WHEN slug = 'organ_package' THEN 'Hjerte, lever, nyrer'
    WHEN slug = 'oxtail' THEN 'Perfekt til supper og gryter'
    ELSE description
  END
WHERE slug IN ('extra_bones', 'organ_package', 'oxtail');

-- Insert payment deadline configuration
INSERT INTO app_config (key, value, description)
VALUES (
  'payment_deadline',
  '{"year": 2024, "week": 44, "day": 5, "reason": "Week 44 Friday - remainder payment deadline"}'::jsonb,
  'Deadline for remainder payment before orders are marked at risk'
)
ON CONFLICT (key) DO NOTHING;

-- Update timestamp trigger for extras_catalog
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_extras_catalog_updated_at ON extras_catalog;

CREATE TRIGGER update_extras_catalog_updated_at
  BEFORE UPDATE ON extras_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add admin policies for extras_catalog management
DROP POLICY IF EXISTS "Admins can manage extras catalog" ON extras_catalog;

CREATE POLICY "Admins can manage extras catalog"
  ON extras_catalog FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vipps_users
      WHERE vipps_users.id = (
        SELECT user_id FROM orders WHERE user_id IN (
          SELECT id FROM vipps_users WHERE vipps_sub = current_setting('app.vipps_sub', true)
        ) LIMIT 1
      )
    )
    OR
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vipps_users
      WHERE vipps_users.id = (
        SELECT user_id FROM orders WHERE user_id IN (
          SELECT id FROM vipps_users WHERE vipps_sub = current_setting('app.vipps_sub', true)
        ) LIMIT 1
      )
    )
    OR
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );
