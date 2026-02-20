-- ============================================================
-- Live Chickens (Kyllinger) Feature
-- 5 tables: breeds, hatches, orders, order_additions, payments
-- + seed 5 breeds
-- ============================================================

-- 1) chicken_breeds
CREATE TABLE IF NOT EXISTS chicken_breeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  accent_color TEXT NOT NULL DEFAULT '#6B7280',
  description_no TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  image_url TEXT DEFAULT '',

  -- Pricing (NOK, not øre)
  start_price_nok NUMERIC(10,2) NOT NULL DEFAULT 0,
  weekly_increase_nok NUMERIC(10,2) NOT NULL DEFAULT 0,
  adult_price_nok NUMERIC(10,2) NOT NULL DEFAULT 0,
  rooster_price_nok NUMERIC(10,2) NOT NULL DEFAULT 250,
  sell_roosters BOOLEAN NOT NULL DEFAULT false,

  -- Mortality estimates
  mortality_rate_early_pct NUMERIC(5,2) NOT NULL DEFAULT 5.0, -- weeks 0-4
  mortality_rate_late_pct NUMERIC(5,2) NOT NULL DEFAULT 2.0,  -- weeks 4+

  active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) chicken_hatches
CREATE TABLE IF NOT EXISTS chicken_hatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breed_id UUID NOT NULL REFERENCES chicken_breeds(id) ON DELETE CASCADE,
  hatch_date DATE NOT NULL,
  initial_count INT NOT NULL DEFAULT 0,
  estimated_hens INT NOT NULL DEFAULT 0,
  estimated_roosters INT NOT NULL DEFAULT 0,
  available_hens INT NOT NULL DEFAULT 0,
  available_roosters INT NOT NULL DEFAULT 0,
  mortality_override NUMERIC(5,2) DEFAULT NULL, -- nullable override
  notes TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) chicken_orders
CREATE TABLE IF NOT EXISTS chicken_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID DEFAULT NULL,
  customer_name TEXT NOT NULL DEFAULT 'Vipps kunde',
  customer_email TEXT NOT NULL DEFAULT 'pending@vipps.no',
  customer_phone TEXT DEFAULT NULL,

  hatch_id UUID NOT NULL REFERENCES chicken_hatches(id),
  breed_id UUID NOT NULL REFERENCES chicken_breeds(id),
  quantity_hens INT NOT NULL DEFAULT 0,
  quantity_roosters INT NOT NULL DEFAULT 0,

  pickup_year INT NOT NULL,
  pickup_week INT NOT NULL,
  pickup_monday DATE NOT NULL,
  age_weeks_at_pickup INT NOT NULL DEFAULT 0,

  price_per_hen_nok NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_per_rooster_nok NUMERIC(10,2) NOT NULL DEFAULT 250,
  subtotal_nok NUMERIC(10,2) NOT NULL DEFAULT 0,

  delivery_method TEXT NOT NULL DEFAULT 'farm_pickup'
    CHECK (delivery_method IN ('farm_pickup', 'delivery_namsos_trondheim')),
  delivery_fee_nok NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount_nok NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_amount_nok NUMERIC(10,2) NOT NULL DEFAULT 0,
  remainder_amount_nok NUMERIC(10,2) NOT NULL DEFAULT 0,
  remainder_due_date DATE DEFAULT NULL,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','deposit_paid','fully_paid','ready_for_pickup','picked_up','cancelled')),

  -- Shipping (for delivery)
  shipping_address TEXT DEFAULT NULL,
  shipping_postal_code TEXT DEFAULT NULL,
  shipping_city TEXT DEFAULT NULL,
  shipping_country TEXT DEFAULT NULL,

  notes TEXT DEFAULT '',
  admin_notes TEXT DEFAULT '',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) chicken_order_additions
CREATE TABLE IF NOT EXISTS chicken_order_additions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chicken_order_id UUID NOT NULL REFERENCES chicken_orders(id) ON DELETE CASCADE,
  hatch_id UUID NOT NULL REFERENCES chicken_hatches(id),
  breed_id UUID NOT NULL REFERENCES chicken_breeds(id),
  quantity_hens INT NOT NULL DEFAULT 0,
  quantity_roosters INT NOT NULL DEFAULT 0,
  price_per_hen_nok NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal_nok NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5) chicken_payments
CREATE TABLE IF NOT EXISTS chicken_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chicken_order_id UUID NOT NULL REFERENCES chicken_orders(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'remainder')),
  amount_nok NUMERIC(10,2) NOT NULL DEFAULT 0,
  vipps_order_id TEXT DEFAULT NULL,
  vipps_callback_token TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  idempotency_key TEXT UNIQUE DEFAULT NULL,
  paid_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chicken_hatches_breed ON chicken_hatches(breed_id);
CREATE INDEX IF NOT EXISTS idx_chicken_hatches_date ON chicken_hatches(hatch_date);
CREATE INDEX IF NOT EXISTS idx_chicken_orders_user ON chicken_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_chicken_orders_email ON chicken_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_chicken_orders_status ON chicken_orders(status);
CREATE INDEX IF NOT EXISTS idx_chicken_orders_hatch ON chicken_orders(hatch_id);
CREATE INDEX IF NOT EXISTS idx_chicken_payments_order ON chicken_payments(chicken_order_id);
CREATE INDEX IF NOT EXISTS idx_chicken_payments_vipps ON chicken_payments(vipps_order_id);

-- Updated-at triggers
CREATE OR REPLACE FUNCTION update_chicken_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chicken_breeds_updated_at
  BEFORE UPDATE ON chicken_breeds
  FOR EACH ROW EXECUTE FUNCTION update_chicken_updated_at();

CREATE TRIGGER chicken_hatches_updated_at
  BEFORE UPDATE ON chicken_hatches
  FOR EACH ROW EXECUTE FUNCTION update_chicken_updated_at();

CREATE TRIGGER chicken_orders_updated_at
  BEFORE UPDATE ON chicken_orders
  FOR EACH ROW EXECUTE FUNCTION update_chicken_updated_at();

CREATE TRIGGER chicken_payments_updated_at
  BEFORE UPDATE ON chicken_payments
  FOR EACH ROW EXECUTE FUNCTION update_chicken_updated_at();

-- RLS (enable but allow service role full access)
ALTER TABLE chicken_breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE chicken_hatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE chicken_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE chicken_order_additions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chicken_payments ENABLE ROW LEVEL SECURITY;

-- Public read for breeds
CREATE POLICY "Anyone can read active chicken breeds"
  ON chicken_breeds FOR SELECT
  USING (true);

-- Service role full access on all tables
CREATE POLICY "Service role full access chicken_breeds"
  ON chicken_breeds FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access chicken_hatches"
  ON chicken_hatches FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access chicken_orders"
  ON chicken_orders FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access chicken_order_additions"
  ON chicken_order_additions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access chicken_payments"
  ON chicken_payments FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- Seed 5 breeds
-- ============================================================
INSERT INTO chicken_breeds (name, slug, accent_color, description_no, description_en, start_price_nok, weekly_increase_nok, adult_price_nok, rooster_price_nok, sell_roosters, mortality_rate_early_pct, mortality_rate_late_pct, active, display_order)
VALUES
  ('Silverudds Blue',      'silverudds',    '#6BB8E0', 'Svensk rase kjent for vakre blågrønne egg. Rolig og robust høne som trives godt i norsk klima.', 'Swedish breed known for beautiful blue-green eggs. Calm and robust hen that thrives in Nordic climates.', 180, 15, 375, 250, false, 5.0, 2.0, true, 1),
  ('Maran',                'maran',         '#8B4513', 'Fransk rase med dype sjokoladebrune egg. Elegant fugl med kobberfarget fjærdrakt.', 'French breed with deep chocolate-brown eggs. Elegant bird with copper-colored plumage.', 185, 20, 445, 250, false, 5.0, 2.0, true, 2),
  ('Jersey Giant',         'jersey-giant',  '#2F4F4F', 'Verdens største hønerase. Rolig kjempe som legger store brune egg.', 'The world''s largest chicken breed. Gentle giant that lays large brown eggs.', 200, 25, 525, 250, false, 5.0, 2.0, true, 3),
  ('Cream Legbar',         'cream-legbar',  '#DDA0DD', 'Britisk rase med automatisk kjønnsbestemmelse — garantert høne! Legger lyseblå egg.', 'British autosexing breed — guaranteed hen! Lays light blue eggs.', 300, 15, 495, 250, false, 5.0, 2.0, true, 4),
  ('Ayam Cemani',          'ayam-cemani',   '#1C1C1C', 'Eksotisk indonesisk rase, helt svart — fjær, skinn, bein. Sjelden og eksklusiv.', 'Exotic Indonesian breed, completely black — feathers, skin, bones. Rare and exclusive.', 275, 25, 600, 250, false, 5.0, 2.0, true, 5)
ON CONFLICT (slug) DO NOTHING;
