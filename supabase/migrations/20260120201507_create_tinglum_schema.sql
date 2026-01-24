/*
  # Tinglum Gård E-commerce Schema

  ## Overview
  Complete schema for season-based premium pork box e-commerce with deposit + remainder payment flow.

  ## New Tables
  
  ### `profiles`
  - `id` (uuid, FK to auth.users) - User profile ID
  - `role` (text) - User role: 'customer' or 'admin'
  - `created_at` (timestamptz) - Profile creation timestamp

  ### `inventory`
  - `id` (uuid, PK) - Inventory record ID
  - `season` (text) - Season identifier (e.g., 'høst_2024')
  - `kg_remaining` (int) - Kilograms of meat remaining
  - `active` (boolean) - Whether this inventory is active
  - `created_at`, `updated_at` (timestamptz)

  ### `extras_catalog`
  - `id` (uuid, PK) - Extra item ID
  - `slug` (text, unique) - URL-friendly identifier
  - `name_no` (text) - Norwegian name
  - `name_en` (text) - English name
  - `price_nok` (int) - Price in Norwegian kroner
  - `active` (boolean) - Whether this extra is available
  - `created_at` (timestamptz)

  ### `orders`
  - `id` (uuid, PK) - Order ID
  - `user_id` (uuid, FK to auth.users, nullable) - User who placed order
  - `order_number` (text, unique) - Human-readable order number
  - `box_size` (int) - Box size in kg (8 or 12)
  - `status` (text) - Order status
  - `deposit_amount` (int) - Deposit amount in NOK
  - `remainder_amount` (int) - Remainder amount in NOK
  - `total_amount` (int) - Total amount in NOK
  - `customer_name` (text) - Customer full name
  - `customer_email` (text) - Customer email
  - `customer_phone` (text, nullable) - Customer phone
  - `delivery_type` (text) - Delivery/pickup type
  - `fresh_delivery` (boolean) - Fresh vs frozen delivery
  - `notes` (text, nullable) - Order notes
  - `created_at`, `updated_at` (timestamptz)

  ### `order_extras`
  - `id` (uuid, PK) - Order extra ID
  - `order_id` (uuid, FK to orders) - Associated order
  - `extra_id` (uuid, FK to extras_catalog) - Extra item
  - `price_nok` (int) - Price at time of order
  - `created_at` (timestamptz)

  ### `payments`
  - `id` (uuid, PK) - Payment ID
  - `order_id` (uuid, FK to orders) - Associated order
  - `payment_type` (text) - 'deposit' or 'remainder'
  - `amount_nok` (int) - Amount in NOK
  - `vipps_order_id` (text, nullable) - Vipps order reference
  - `status` (text) - Payment status
  - `paid_at` (timestamptz, nullable) - When payment completed
  - `created_at` (timestamptz)

  ### `waitlist`
  - `id` (uuid, PK) - Waitlist entry ID
  - `email` (text) - Email address
  - `box_size` (int, nullable) - Preferred box size
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Customers can only read their own orders
  - Admin role required for inventory management and all orders view
  - Public read access to inventory and extras catalog
  - Anyone can join waitlist
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  season text NOT NULL UNIQUE,
  kg_remaining int NOT NULL DEFAULT 0 CHECK (kg_remaining >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read inventory"
  ON inventory FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can update inventory"
  ON inventory FOR UPDATE
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

CREATE POLICY "Admins can insert inventory"
  ON inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create extras_catalog table
CREATE TABLE IF NOT EXISTS extras_catalog (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text NOT NULL UNIQUE,
  name_no text NOT NULL,
  name_en text NOT NULL,
  price_nok int NOT NULL CHECK (price_nok >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE extras_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read extras"
  ON extras_catalog FOR SELECT
  TO authenticated, anon
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

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number text NOT NULL UNIQUE,
  box_size int NOT NULL CHECK (box_size IN (8, 12)),
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'deposit_paid', 'paid', 'ready_for_pickup', 'completed', 'cancelled')
  ),
  deposit_amount int NOT NULL CHECK (deposit_amount >= 0),
  remainder_amount int NOT NULL CHECK (remainder_amount >= 0),
  total_amount int NOT NULL CHECK (total_amount >= 0),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  delivery_type text NOT NULL DEFAULT 'pickup_farm' CHECK (
    delivery_type IN ('pickup_farm', 'pickup_e6', 'delivery_trondheim')
  ),
  fresh_delivery boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all orders"
  ON orders FOR UPDATE
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

-- Create order_extras table
CREATE TABLE IF NOT EXISTS order_extras (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  extra_id uuid NOT NULL REFERENCES extras_catalog(id) ON DELETE RESTRICT,
  price_nok int NOT NULL CHECK (price_nok >= 0),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own order extras"
  ON order_extras FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_extras.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all order extras"
  ON order_extras FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can create order extras"
  ON order_extras FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_type text NOT NULL CHECK (payment_type IN ('deposit', 'remainder')),
  amount_nok int NOT NULL CHECK (amount_nok >= 0),
  vipps_order_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'completed', 'failed', 'refunded')
  ),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can create payments"
  ON payments FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Admins can update payments"
  ON payments FOR UPDATE
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

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  box_size int CHECK (box_size IN (8, 12)),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
  ON waitlist FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Admins can read waitlist"
  ON waitlist FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed initial data
INSERT INTO inventory (season, kg_remaining, active)
VALUES ('høst_2024', 250, true)
ON CONFLICT (season) DO NOTHING;

INSERT INTO extras_catalog (slug, name_no, name_en, price_nok, active)
VALUES
  ('delivery_trondheim', 'Levering Trondheim sentrum', 'Trondheim center delivery', 150, true),
  ('pickup_e6', 'Henting E6 Melhus', 'E6 Melhus pickup', 0, true),
  ('fresh_delivery', 'Fersk levering (ikke fryst)', 'Fresh delivery (not frozen)', 200, true)
ON CONFLICT (slug) DO NOTHING;
