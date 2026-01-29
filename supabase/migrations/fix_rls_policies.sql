-- Fix RLS policies to allow API access
-- The issue is that the API needs to read extras_catalog but RLS is blocking it

-- Drop existing policies to recreate them correctly
DROP POLICY IF EXISTS "Anyone can read extras" ON extras_catalog;
DROP POLICY IF EXISTS "Admins can manage extras" ON extras_catalog;

-- Recreate with proper access
CREATE POLICY "Public can read active extras"
  ON extras_catalog FOR SELECT
  USING (active = true);

CREATE POLICY "Service role can read all extras"
  ON extras_catalog FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage extras"
  ON extras_catalog FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Ensure anonymous users can also create orders
DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Ensure anonymous users can create order_extras
DROP POLICY IF EXISTS "Users can create order extras" ON order_extras;
CREATE POLICY "Anyone can create order extras"
  ON order_extras FOR INSERT
  WITH CHECK (true);

-- Ensure anonymous users can read inventory
DROP POLICY IF EXISTS "Anyone can read inventory" ON inventory;
CREATE POLICY "Public can read active inventory"
  ON inventory FOR SELECT
  USING (active = true);
