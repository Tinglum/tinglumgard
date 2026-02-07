-- =============================================================================
-- EGG PRODUCT INTEGRATION MIGRATION
-- =============================================================================
-- This migration extends the existing Tinglumgård database to support egg products
-- alongside pig boxes, with unified admin management
-- =============================================================================

-- =============================================================================
-- 1. ADD PRODUCT TYPE TO EXISTING TABLES
-- =============================================================================

-- Add product_type column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'pig_box'
CHECK (product_type IN ('pig_box', 'eggs'));

-- Add product_type column to inventory table
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'pig_box'
CHECK (product_type IN ('pig_box', 'eggs'));

-- Add product_type column to extras_catalog table
ALTER TABLE extras_catalog
ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'pig_box'
CHECK (product_type IN ('pig_box', 'eggs'));

-- =============================================================================
-- 2. CREATE EGG BREEDS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS egg_breeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  detailed_description TEXT,
  price_per_egg INTEGER NOT NULL, -- in øre (NOK cents)
  min_order_quantity INTEGER NOT NULL DEFAULT 6,
  max_order_quantity INTEGER NOT NULL DEFAULT 60,
  accent_color TEXT NOT NULL DEFAULT '#1F2937',

  -- Characteristics
  egg_color TEXT NOT NULL,
  size_range TEXT NOT NULL,
  temperament TEXT NOT NULL,
  annual_production TEXT NOT NULL,

  -- Hatching info
  incubation_days INTEGER NOT NULL DEFAULT 21,
  temperature TEXT NOT NULL DEFAULT '37.5°C',
  humidity TEXT NOT NULL DEFAULT '55% dag 1-18, 65% dag 19-21',

  -- Status
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. CREATE EGG INVENTORY TABLE (WEEK-BASED)
-- =============================================================================

CREATE TABLE IF NOT EXISTS egg_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breed_id UUID NOT NULL REFERENCES egg_breeds(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 53),
  delivery_monday DATE NOT NULL,

  eggs_available INTEGER NOT NULL DEFAULT 0,
  eggs_allocated INTEGER NOT NULL DEFAULT 0,
  eggs_remaining INTEGER GENERATED ALWAYS AS (eggs_available - eggs_allocated) STORED,

  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('closed', 'open', 'locked', 'sold_out')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(breed_id, year, week_number)
);

-- =============================================================================
-- 4. CREATE EGG ORDERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS egg_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number TEXT UNIQUE NOT NULL,

  -- Customer info
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,

  -- Order details
  breed_id UUID NOT NULL REFERENCES egg_breeds(id) ON DELETE RESTRICT,
  inventory_id UUID NOT NULL REFERENCES egg_inventory(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  price_per_egg INTEGER NOT NULL,

  -- Pricing
  subtotal INTEGER NOT NULL, -- in øre
  delivery_fee INTEGER NOT NULL DEFAULT 30000, -- 300 kr in øre
  total_amount INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL,
  remainder_amount INTEGER NOT NULL,

  -- Delivery
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('farm_pickup', 'e6_pickup', 'posten')),
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  delivery_monday DATE NOT NULL,
  remainder_due_date DATE,

  -- Status
  status TEXT NOT NULL DEFAULT 'deposit_paid' CHECK (status IN ('deposit_paid', 'fully_paid', 'preparing', 'shipped', 'delivered', 'cancelled')),

  -- Admin
  notes TEXT,
  admin_notes TEXT,
  locked_at TIMESTAMPTZ,
  marked_delivered_at TIMESTAMPTZ,
  marked_delivered_by UUID REFERENCES auth.users(id),

  -- Vipps
  vipps_deposit_order_id TEXT,
  vipps_remainder_order_id TEXT,

  -- Policy
  policy_version TEXT NOT NULL DEFAULT 'v1-2026',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. CREATE EGG PAYMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS egg_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  egg_order_id UUID NOT NULL REFERENCES egg_orders(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'remainder')),
  amount_nok INTEGER NOT NULL,
  vipps_order_id TEXT,
  idempotency_key TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  webhook_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 6. CREATE ADMIN ACTIVITY LOG TABLE (UNIFIED)
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_name TEXT NOT NULL,

  product_type TEXT NOT NULL CHECK (product_type IN ('pig_box', 'eggs')),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT NOT NULL,
  changes JSONB,
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 7. INSERT DEFAULT EGG BREEDS
-- =============================================================================

INSERT INTO egg_breeds (slug, name, description, detailed_description, price_per_egg, min_order_quantity, max_order_quantity, accent_color, egg_color, size_range, temperament, annual_production, display_order)
VALUES
  ('ayam-cemani', 'Ayam Cemani', 'Sjelden indonesisk rase med helsvart fjærdrakt og mørke, næringsrike egg.', 'Ayam Cemani er en eksklusiv rase fra Indonesia, kjent for sin unike helsvarte fjærdrakt. Eggene er kremfarget til lys brune, men med høyt næringsinnhold. Vær oppmerksom på at Ayam Cemani-kyllinger kan være vanskeligere å klekke ut enn andre raser.', 8000, 6, 60, '#1F2937', 'Kremfarget til lys brun', 'Medium (50-60g)', 'Aktiv og varsom', '60-90 egg/år', 1),
  ('jersey-giant', 'Jersey Giant', 'Stor amerikansk rase med vennlig temperament og store, brune egg.', 'Jersey Giant er en av de største hønserasene i verden, opprinnelig avlet i New Jersey, USA. De er rolige og vennlige, noe som gjør dem perfekte for familier. Eggene er store og har en dyp brun farge. Kyllingene vokser til å bli imponerende store høns.', 4500, 10, 60, '#0F172A', 'Brun', 'Stor (60g+)', 'Rolig og vennlig', '180-220 egg/år', 2),
  ('silverudds-bla', 'Silverudd''s Blå (Isbar)', 'Svensk rase med blågrønne egg og god egglegging året rundt.', 'Silverudd''s Blå, også kjent som Isbar, er en svensk rase utviklet av Martin Silverudd. De er svært produktive og fortsetter å legge egg selv i kaldere måneder. Eggene har en vakker blågrønn farge, og hønsene er kjent for å være hardføre og tilpasningsdyktige.', 4500, 10, 60, '#334155', 'Blågrønn', 'Medium til stor (59-60g)', 'Aktiv og robust', '250 egg/år', 3),
  ('cream-legbar', 'Cream Legbar', 'Britisk autoséxing-rase med blå egg og lett identifiserbare kyllinger.', 'Cream Legbar er en britisk rase kjent for sine vakre blå egg og unike autoséxing-egenskap, som gjør det mulig å identifisere kjønnet på kyllingene ved klekking. Vær oppmerksom på at Cream Legbar ikke er godkjent av Norsk Fjørfeavlslag, da den ikke er ansett som en ren rase i Norge.', 4000, 10, 60, '#475569', 'Blå', 'Medium til stor (60g+)', 'Aktiv og selvstendig', '200 egg/år', 4),
  ('maran', 'Maran', 'Fransk rase med vakker kobberhalset fjærdrakt og dype sjokoladebrune egg.', 'Maran er en fransk rase fra Marans-regionen, berømt for sine mørkebr une til rødlige egg. Disse eggene er blant de mørkeste du kan få. Hønsene er robuste og tilpasningsdyktige, med et vakkert kobberhalset utseende hos hannene.', 4500, 6, 60, '#78350F', 'Mørkebrun til rødlig', 'Stor (70g+)', 'Rolig og lett å håndtere', '180-220 egg/år', 5);

-- =============================================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE egg_breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 9. CREATE RLS POLICIES
-- =============================================================================

-- Egg Breeds: Public read, admin write
CREATE POLICY "Egg breeds are viewable by everyone" ON egg_breeds
  FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage egg breeds" ON egg_breeds
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Egg Inventory: Public read active, admin full access
CREATE POLICY "Active egg inventory is viewable by everyone" ON egg_inventory
  FOR SELECT USING (status IN ('open', 'sold_out'));

CREATE POLICY "Admins can manage egg inventory" ON egg_inventory
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Egg Orders: Users see their own, admins see all
CREATE POLICY "Users can view their own egg orders" ON egg_orders
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Users can create egg orders" ON egg_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all egg orders" ON egg_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Egg Payments: Users see their own, admins see all
CREATE POLICY "Users can view their own egg payments" ON egg_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM egg_orders
      WHERE egg_orders.id = egg_payments.egg_order_id
      AND egg_orders.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can manage egg payments" ON egg_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Admin Activity Log: Admins only
CREATE POLICY "Admins can view activity log" ON admin_activity_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can create activity log entries" ON admin_activity_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- =============================================================================
-- 10. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_egg_orders_user_id ON egg_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_egg_orders_breed_id ON egg_orders(breed_id);
CREATE INDEX IF NOT EXISTS idx_egg_orders_inventory_id ON egg_orders(inventory_id);
CREATE INDEX IF NOT EXISTS idx_egg_orders_status ON egg_orders(status);
CREATE INDEX IF NOT EXISTS idx_egg_orders_created_at ON egg_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_egg_inventory_breed_id ON egg_inventory(breed_id);
CREATE INDEX IF NOT EXISTS idx_egg_inventory_year_week ON egg_inventory(year, week_number);
CREATE INDEX IF NOT EXISTS idx_egg_inventory_status ON egg_inventory(status);

CREATE INDEX IF NOT EXISTS idx_egg_payments_order_id ON egg_payments(egg_order_id);
CREATE INDEX IF NOT EXISTS idx_egg_payments_status ON egg_payments(status);

CREATE INDEX IF NOT EXISTS idx_admin_activity_product_type ON admin_activity_log(product_type);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON admin_activity_log(created_at DESC);

-- =============================================================================
-- 11. CREATE TRIGGERS FOR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_egg_breeds_updated_at
  BEFORE UPDATE ON egg_breeds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_egg_inventory_updated_at
  BEFORE UPDATE ON egg_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_egg_orders_updated_at
  BEFORE UPDATE ON egg_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify all tables created successfully
-- 3. Test RLS policies with test users
-- 4. Populate egg_inventory with initial weeks
-- 5. Update admin interface to support product_type filtering
-- =============================================================================
