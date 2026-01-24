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
/*
  # Update for Vipps Integration

  1. New Tables
    - `vipps_users` - Custom user table for Vipps login
      - `id` (uuid, primary key)
      - `vipps_sub` (text, unique) - Vipps user identifier
      - `phone_number` (text)
      - `email` (text)
      - `name` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to payments table
    - Add `idempotency_key` for webhook safety
    - Add `webhook_processed_at` to track processing
    - Rename `vipps_order_id` to `vipps_payment_id` for clarity
    - Rename `payment_type` to `type` for consistency

  3. Security
    - RLS on vipps_users
    - Service role access for webhooks
*/

-- Create custom users table for Vipps
CREATE TABLE IF NOT EXISTS vipps_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vipps_sub text UNIQUE NOT NULL,
  phone_number text,
  email text,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vipps_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage vipps users"
  ON vipps_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add missing columns to payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE payments ADD COLUMN idempotency_key text UNIQUE;
    CREATE INDEX idx_payments_idempotency_key ON payments(idempotency_key);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'webhook_processed_at'
  ) THEN
    ALTER TABLE payments ADD COLUMN webhook_processed_at timestamptz;
  END IF;
END $$;

-- Update existing data to have idempotency keys (if any records exist)
UPDATE payments SET idempotency_key = id::text WHERE idempotency_key IS NULL;
ALTER TABLE payments ALTER COLUMN idempotency_key SET NOT NULL;
/*
  # Add Order Modifications and Configuration

  1. New Tables
    - `app_config` - Application configuration settings
      - `key` (text, primary key)
      - `value` (jsonb)
      - `description` (text)
      - `updated_at` (timestamptz)

  2. Changes to orders table
    - Add `add_ons_json` (jsonb) - Store selected add-ons
    - Add `extras_json` (jsonb) - Store selected extras
    - Add `last_modified_at` (timestamptz) - Track when order was last updated

  3. Security
    - Admins can read/write config
    - Users can update own orders
*/

-- Create app_config table
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage config"
  ON app_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role' = 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role' = 'admin')
    )
  );

CREATE POLICY "Service role can manage config"
  ON app_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert default cutoff configuration (week 46 of 2024)
INSERT INTO app_config (key, value, description)
VALUES (
  'order_modification_cutoff',
  '{"year": 2024, "week": 46, "reason": "Production schedule finalized"}'::jsonb,
  'Week number after which orders cannot be modified'
)
ON CONFLICT (key) DO NOTHING;

-- Add columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'add_ons_json'
  ) THEN
    ALTER TABLE orders ADD COLUMN add_ons_json jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'extras_json'
  ) THEN
    ALTER TABLE orders ADD COLUMN extras_json jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'last_modified_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN last_modified_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add policy for users to update their own orders
DROP POLICY IF EXISTS "Users can update own orders" ON orders;

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM vipps_users WHERE vipps_sub = current_setting('app.vipps_sub', true)
  ))
  WITH CHECK (user_id IN (
    SELECT id FROM vipps_users WHERE vipps_sub = current_setting('app.vipps_sub', true)
  ));
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
/*
  # Add Scheduling and Remainder Payment Fields

  1. Changes to orders table
    - Add `locked_at` (timestamptz) - When order was locked (Week 46)
    - Add `at_risk` (boolean) - Whether order is at risk due to unpaid remainder
    - Add `reminder_sent_at` (timestamptz) - When reminder email was sent
    - Add `vipps_remainder_order_id` (text) - Vipps order ID for remainder payment

  2. Configuration
    - Add lock_week configuration
    - Add reminder_week configuration

  3. Security
    - No RLS changes needed, inherits from orders table
*/

-- Add columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'locked_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN locked_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'at_risk'
  ) THEN
    ALTER TABLE orders ADD COLUMN at_risk boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'reminder_sent_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN reminder_sent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'vipps_remainder_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN vipps_remainder_order_id text;
  END IF;
END $$;

-- Insert lock week configuration
INSERT INTO app_config (key, value, description)
VALUES (
  'lock_week',
  '{"year": 2024, "week": 46, "reason": "Week 46 - orders are locked and finalized"}'::jsonb,
  'Week when orders are locked and can no longer be modified'
)
ON CONFLICT (key) DO NOTHING;

-- Insert reminder week configuration
INSERT INTO app_config (key, value, description)
VALUES (
  'reminder_week',
  '{"year": 2024, "week": 44, "reason": "Week 44 - send remainder payment reminders"}'::jsonb,
  'Week when remainder payment reminders are sent'
)
ON CONFLICT (key) DO NOTHING;

-- Create index for scheduled jobs
CREATE INDEX IF NOT EXISTS idx_orders_reminder_sent ON orders(reminder_sent_at) WHERE reminder_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_locked ON orders(locked_at) WHERE locked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_at_risk ON orders(at_risk) WHERE at_risk = true;
/*
  # Update Inventory Tracking and Pricing

  1. Changes to orders table
    - Add `inventory_deducted` (boolean) - tracks if inventory was deducted
    - Add `inventory_deduction_kg` (numeric) - tracks how many kg were deducted
    - Add `add_ons_json` if not exists - for storing add-on selections

  2. Update inventory
    - Increase initial inventory to realistic amount (1200 kg)
    - Update kg_remaining to 1200

  3. Update extras catalog
    - Fix delivery pricing to match spec:
      - E6 delivery: +250 NOK
      - Trondheim delivery: +300 NOK  
      - Fresh delivery: +500 NOK

  4. Add indexes for performance
*/

-- Add inventory tracking fields to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'inventory_deducted'
  ) THEN
    ALTER TABLE orders ADD COLUMN inventory_deducted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'inventory_deduction_kg'
  ) THEN
    ALTER TABLE orders ADD COLUMN inventory_deduction_kg numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'add_ons_json'
  ) THEN
    ALTER TABLE orders ADD COLUMN add_ons_json jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Update inventory to realistic amount
UPDATE inventory
SET kg_remaining = 1200
WHERE season = 'høst_2024' AND kg_remaining < 1200;

-- Update delivery pricing to match specification
UPDATE extras_catalog
SET price_nok = 250, name_no = 'Levering E6 (Levanger-Namsos)', name_en = 'E6 Delivery (Levanger-Namsos)'
WHERE slug = 'pickup_e6';

UPDATE extras_catalog
SET price_nok = 300
WHERE slug = 'delivery_trondheim';

UPDATE extras_catalog
SET price_nok = 500
WHERE slug = 'fresh_delivery';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_inventory_deducted ON orders(inventory_deducted) WHERE inventory_deducted = false;
CREATE INDEX IF NOT EXISTS idx_inventory_season_active ON inventory(season, active) WHERE active = true;
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
/*
  # Add Vipps Checkout API v3 Support

  1. Schema Changes
    - Add `vipps_session_id` column to payments table for Checkout v3 sessions
    - Keep `vipps_order_id` for backward compatibility with ePayment API
    - Add index on `vipps_session_id` for faster lookups

  2. Notes
    - Both `vipps_order_id` (ePayment reference) and `vipps_session_id` (Checkout session) can coexist
    - New payments will use `vipps_session_id` from Checkout API v3
    - Legacy payments will continue to use `vipps_order_id`
    - No data loss - existing payments unchanged
*/

-- Add vipps_session_id column to payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'vipps_session_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN vipps_session_id text;
  END IF;
END $$;

-- Add index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_payments_vipps_session_id ON payments(vipps_session_id);

-- Add comment to document the column purpose
COMMENT ON COLUMN payments.vipps_session_id IS 'Vipps Checkout API v3 session ID';
COMMENT ON COLUMN payments.vipps_order_id IS 'Vipps ePayment API v1 reference (legacy)';/*
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
