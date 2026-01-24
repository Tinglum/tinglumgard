-- =============================================================================
-- COMPLETE DATABASE SETUP FOR TINGLUM FARM
-- =============================================================================
-- This script combines all 7 migration files into one for easy execution
-- Run this entire script in Supabase SQL Editor to set up your database
-- =============================================================================

-- =============================================================================
-- MIGRATION 1: Create Base Schema
-- =============================================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season TEXT UNIQUE NOT NULL,
  kg_remaining INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create extras_catalog table
CREATE TABLE IF NOT EXISTS extras_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_no TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_no TEXT,
  description_en TEXT,
  price_nok INTEGER NOT NULL,
  pricing_type TEXT NOT NULL DEFAULT 'per_unit' CHECK (pricing_type IN ('per_unit', 'per_kg')),
  consumes_inventory_kg BOOLEAN NOT NULL DEFAULT false,
  kg_per_unit NUMERIC,
  stock_quantity INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number TEXT UNIQUE NOT NULL,
  box_size INTEGER NOT NULL CHECK (box_size IN (8, 12)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'deposit_paid', 'paid', 'ready_for_pickup', 'completed', 'cancelled')),
  deposit_amount INTEGER NOT NULL,
  remainder_amount INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('pickup_farm', 'pickup_e6', 'delivery_trondheim')),
  fresh_delivery BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  admin_notes TEXT,
  add_ons_json JSONB,
  extras_json JSONB,
  extra_products JSONB,
  ribbe_choice TEXT,
  locked_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  marked_delivered_at TIMESTAMPTZ,
  marked_delivered_by UUID REFERENCES auth.users(id),
  at_risk BOOLEAN NOT NULL DEFAULT false,
  vipps_deposit_order_id TEXT,
  vipps_remainder_order_id TEXT,
  inventory_deducted BOOLEAN NOT NULL DEFAULT false,
  inventory_deduction_kg NUMERIC,
  last_modified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create order_extras junction table
CREATE TABLE IF NOT EXISTS order_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  extra_id UUID NOT NULL REFERENCES extras_catalog(id) ON DELETE RESTRICT,
  price_nok INTEGER NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_type TEXT NOT NULL DEFAULT 'unit' CHECK (unit_type IN ('unit', 'kg')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'remainder')),
  amount_nok INTEGER NOT NULL,
  vipps_order_id TEXT,
  idempotency_key TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  webhook_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  box_size INTEGER CHECK (box_size IN (8, 12)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create vipps_users table
CREATE TABLE IF NOT EXISTS vipps_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vipps_sub TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create app_config table
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- MIGRATION 2-7: Additional Fields and Configurations
-- (These are already included in the table definitions above)
-- =============================================================================

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE extras_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE vipps_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Inventory policies (public read, admin write)
CREATE POLICY "Anyone can view active inventory" ON inventory FOR SELECT USING (active = true);
CREATE POLICY "Admins can manage inventory" ON inventory FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Extras catalog policies (public read, admin write)
CREATE POLICY "Anyone can view active extras" ON extras_catalog FOR SELECT USING (active = true);
CREATE POLICY "Admins can manage extras" ON extras_catalog FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Orders policies
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own orders" ON orders FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete orders" ON orders FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Order extras policies
CREATE POLICY "Users can view own order extras" ON order_extras FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_extras.order_id
    AND (orders.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  )
);
CREATE POLICY "Service role can manage order extras" ON order_extras FOR ALL USING (
  auth.jwt()->>'role' = 'service_role'
);

-- Payments policies
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = payments.order_id
    AND (orders.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  )
);
CREATE POLICY "Service role can manage payments" ON payments FOR ALL USING (
  auth.jwt()->>'role' = 'service_role'
);

-- Waitlist policies
CREATE POLICY "Anyone can join waitlist" ON waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view waitlist" ON waitlist FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Vipps users policies
CREATE POLICY "Service role can manage vipps users" ON vipps_users FOR ALL USING (
  auth.jwt()->>'role' = 'service_role'
);

-- App config policies
CREATE POLICY "Anyone can view config" ON app_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage config" ON app_config FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Insert initial inventory
INSERT INTO inventory (season, kg_remaining, active)
VALUES ('høst_2024', 1200, true)
ON CONFLICT (season) DO NOTHING;

-- Insert extras catalog
INSERT INTO extras_catalog (slug, name_no, name_en, description_no, price_nok, pricing_type, consumes_inventory_kg, active, display_order)
VALUES
  ('indrefilet', 'Indrefilet', 'Tenderloin', 'Møreste og mørest del av grisen', 350, 'per_kg', true, true, 1),
  ('ytrefilet', 'Ytrefilet', 'Pork Loin', 'Stor og mager muskel fra ryggen', 250, 'per_kg', true, true, 2),
  ('koteletter', 'Ekstra koteletter', 'Extra Pork Chops', 'Saftige koteletter', 220, 'per_kg', true, true, 3),
  ('ekstra-ribbe', 'Ekstra ribbe', 'Extra Ribs', 'Mer av den gode ribben', 200, 'per_kg', true, true, 4),
  ('bacon', 'Bacon', 'Bacon', 'Hjemmelaget bacon', 180, 'per_kg', true, true, 5),
  ('spekeskinke', 'Spekeskinke', 'Cured Ham', 'Tradisjonell norsk spekeskinke', 400, 'per_kg', true, true, 6),
  ('bogsteik', 'Bogsteik', 'Pork Shoulder', 'Perfekt for gryte eller langsteking', 150, 'per_kg', true, true, 7),
  ('svinelabb', 'Svinelabb', 'Pork Trotter', 'Tradisjonell delikatesse', 80, 'per_unit', true, true, 8)
ON CONFLICT (slug) DO NOTHING;

-- Insert app configuration
INSERT INTO app_config (key, value, description)
VALUES
  ('order_modification_cutoff', '{"year": 2024, "week": 46}'::jsonb, 'Week when order modifications are locked'),
  ('payment_deadline', '{"year": 2024, "week": 44, "day": "friday"}'::jsonb, 'Deadline for remainder payment'),
  ('lock_week', '{"year": 2024, "week": 46}'::jsonb, 'Week when all orders are locked'),
  ('reminder_week', '{"year": 2024, "week": 44}'::jsonb, 'Week to send payment reminders')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_vipps_order_id ON payments(vipps_order_id);
CREATE INDEX IF NOT EXISTS idx_order_extras_order_id ON order_extras(order_id);
CREATE INDEX IF NOT EXISTS idx_order_extras_extra_id ON order_extras(extra_id);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extras_catalog_updated_at BEFORE UPDATE ON extras_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vipps_users_updated_at BEFORE UPDATE ON vipps_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SETUP COMPLETE!
-- =============================================================================
-- Your database is now ready to use.
-- Next steps:
-- 1. Create an admin user by signing up through your app
-- 2. Run this query to make yourself admin (replace with your email):
--    UPDATE profiles SET role = 'admin'
--    WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
-- =============================================================================
