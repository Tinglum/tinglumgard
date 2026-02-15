-- Migration: Mangalitsa Box Presets and Related Tables
-- Created: 2026-02-12
-- Description: Adds support for premium Mangalitsa pig box presets with predefined contents

-- ============================================================================
-- 1. Create mangalitsa_box_presets table
-- ============================================================================
CREATE TABLE IF NOT EXISTS mangalitsa_box_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_no TEXT NOT NULL,
  name_en TEXT NOT NULL,
  short_pitch_no TEXT NOT NULL,
  short_pitch_en TEXT NOT NULL,
  description_no TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  target_weight_kg INT NOT NULL CHECK (target_weight_kg IN (8, 9, 10, 12)),
  target_audience_no TEXT,
  target_audience_en TEXT,
  hero_cuts_no TEXT[],
  price_nok INT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_premium BOOLEAN DEFAULT true,
  scarcity_message_no TEXT,
  scarcity_message_en TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. Insert the 4 box presets
-- ============================================================================
INSERT INTO mangalitsa_box_presets (
  slug,
  name_no,
  name_en,
  short_pitch_no,
  short_pitch_en,
  target_weight_kg,
  price_nok,
  display_order,
  scarcity_message_no,
  scarcity_message_en,
  is_premium,
  active
) VALUES
  (
    'premium-cuts',
    'Premium Cuts',
    'Premium Cuts',
    'Alt det kule',
    'All the cool stuff',
    8,
    4900,
    1,
    'Kun 1 av 4 bokser per gris',
    'Only 1 of 4 boxes per pig',
    true,
    true
  ),
  (
    'bbq-steakhouse',
    'BBQ og Steakhouse',
    'BBQ & Steakhouse',
    'Helgemat og grill',
    'Weekend feasts & grill',
    9,
    3900,
    2,
    'Kun 1 av 4 bokser per gris',
    'Only 1 of 4 boxes per pig',
    true,
    true
  ),
  (
    'julespesial',
    'Julespesial',
    'Christmas Special',
    'Ribbe + medisterpakka',
    'Ribs + sausage package',
    8,
    3700,
    3,
    'Kun 1 av 4 bokser per gris',
    'Only 1 of 4 boxes per pig',
    true,
    true
  ),
  (
    'familieboks',
    'Familieboks',
    'Family Box',
    'Matuke og gode middager',
    'Meal prep & good dinners',
    10,
    3100,
    4,
    'Kun 1 av 4 bokser per gris',
    'Only 1 of 4 boxes per pig',
    true,
    true
  );

-- ============================================================================
-- 3. Create mangalitsa_preset_contents table
-- ============================================================================
CREATE TABLE IF NOT EXISTS mangalitsa_preset_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id UUID REFERENCES mangalitsa_box_presets(id) ON DELETE CASCADE,
  content_name_no TEXT NOT NULL,
  content_name_en TEXT NOT NULL,
  target_weight_kg NUMERIC(4,2),
  display_order INT NOT NULL DEFAULT 0,
  is_hero BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. Insert contents for each box
-- ============================================================================

-- Premium Cuts box (8 kg, 4900 kr)
INSERT INTO mangalitsa_preset_contents (
  preset_id,
  content_name_no,
  content_name_en,
  target_weight_kg,
  display_order,
  is_hero
)
SELECT
  id,
  'Svinekinn, 2 stk (guanciale)',
  'Pork jowl, 2 pcs (guanciale)',
  1.10,
  1,
  true
FROM mangalitsa_box_presets WHERE slug = 'premium-cuts'
UNION ALL
SELECT
  id,
  'Nakkekam (coppa)',
  'Neck collar (coppa)',
  1.50,
  2,
  true
FROM mangalitsa_box_presets WHERE slug = 'premium-cuts'
UNION ALL
SELECT
  id,
  'Slakterbiff (secreto, presa, pluma)',
  'Butcher steak (secreto, presa, pluma)',
  1.10,
  3,
  true
FROM mangalitsa_box_presets WHERE slug = 'premium-cuts'
UNION ALL
SELECT
  id,
  'Ryggspekk blokk (lardo)',
  'Back fat block (lardo)',
  1.20,
  4,
  false
FROM mangalitsa_box_presets WHERE slug = 'premium-cuts'
UNION ALL
SELECT
  id,
  'Ribbevalg, 1,5 kg',
  'Rib selection, 1.5 kg',
  1.50,
  5,
  false
FROM mangalitsa_box_presets WHERE slug = 'premium-cuts'
UNION ALL
SELECT
  id,
  'Premium pølse',
  'Premium sausage',
  1.30,
  6,
  false
FROM mangalitsa_box_presets WHERE slug = 'premium-cuts';

-- BBQ og Steakhouse (9 kg, 3900 kr)
INSERT INTO mangalitsa_preset_contents (
  preset_id,
  content_name_no,
  content_name_en,
  target_weight_kg,
  display_order,
  is_hero
)
SELECT
  id,
  'Tomahawk-kotelett, 2 stk',
  'Tomahawk chop, 2 pcs',
  2.00,
  1,
  true
FROM mangalitsa_box_presets WHERE slug = 'bbq-steakhouse'
UNION ALL
SELECT
  id,
  'Svine-entrecôte, 2 stk',
  'Pork ribeye, 2 pcs',
  1.30,
  2,
  true
FROM mangalitsa_box_presets WHERE slug = 'bbq-steakhouse'
UNION ALL
SELECT
  id,
  'Bogstek (pulled pork-emne)',
  'Shoulder roast (pulled pork cut)',
  3.00,
  3,
  false
FROM mangalitsa_box_presets WHERE slug = 'bbq-steakhouse'
UNION ALL
SELECT
  id,
  'Ribbevalg, 1,5 kg',
  'Rib selection, 1.5 kg',
  1.50,
  4,
  false
FROM mangalitsa_box_presets WHERE slug = 'bbq-steakhouse'
UNION ALL
SELECT
  id,
  'BBQ-pølse',
  'BBQ sausage',
  1.20,
  5,
  false
FROM mangalitsa_box_presets WHERE slug = 'bbq-steakhouse';

-- Julespesial (8 kg, 3700 kr)
INSERT INTO mangalitsa_preset_contents (
  preset_id,
  content_name_no,
  content_name_en,
  target_weight_kg,
  display_order,
  is_hero
)
SELECT
  id,
  'Ribbevalg, 1,5 kg',
  'Rib selection, 1.5 kg',
  1.50,
  1,
  true
FROM mangalitsa_box_presets WHERE slug = 'julespesial'
UNION ALL
SELECT
  id,
  'Medisterpølser av Mangalitsa',
  'Medister sausages from Mangalitsa',
  1.50,
  2,
  true
FROM mangalitsa_box_presets WHERE slug = 'julespesial'
UNION ALL
SELECT
  id,
  'Medisterfarse',
  'Medister patty mix',
  1.50,
  3,
  true
FROM mangalitsa_box_presets WHERE slug = 'julespesial'
UNION ALL
SELECT
  id,
  'Knoke, 1 stk',
  'Knuckle, 1 pc',
  1.00,
  4,
  false
FROM mangalitsa_box_presets WHERE slug = 'julespesial'
UNION ALL
SELECT
  id,
  'Julepølse (fancy variant)',
  'Christmas sausage (premium)',
  1.50,
  5,
  false
FROM mangalitsa_box_presets WHERE slug = 'julespesial'
UNION ALL
SELECT
  id,
  'Kokkefett (smult)',
  'Cooking fat (lard)',
  0.50,
  6,
  false
FROM mangalitsa_box_presets WHERE slug = 'julespesial';

-- Familieboks (10 kg, 3100 kr)
INSERT INTO mangalitsa_preset_contents (
  preset_id,
  content_name_no,
  content_name_en,
  target_weight_kg,
  display_order,
  is_hero
)
SELECT
  id,
  'Ribbevalg, 1,5 kg',
  'Rib selection, 1.5 kg',
  1.50,
  1,
  false
FROM mangalitsa_box_presets WHERE slug = 'familieboks'
UNION ALL
SELECT
  id,
  'Bacon',
  'Bacon',
  1.00,
  2,
  false
FROM mangalitsa_box_presets WHERE slug = 'familieboks'
UNION ALL
SELECT
  id,
  'Koteletter med fettkappe',
  'Chops with fat cap',
  2.00,
  3,
  false
FROM mangalitsa_box_presets WHERE slug = 'familieboks'
UNION ALL
SELECT
  id,
  'Kjøttdeig, grov og saftig',
  'Ground pork, coarse & juicy',
  3.00,
  4,
  false
FROM mangalitsa_box_presets WHERE slug = 'familieboks'
UNION ALL
SELECT
  id,
  'Pølse, premium hverdagsvariant',
  'Sausage, premium everyday',
  1.50,
  5,
  false
FROM mangalitsa_box_presets WHERE slug = 'familieboks'
UNION ALL
SELECT
  id,
  'Gryte/stekekjøtt',
  'Stew/roast meat',
  2.00,
  6,
  false
FROM mangalitsa_box_presets WHERE slug = 'familieboks';

-- ============================================================================
-- 5. Alter extras_catalog table to add premium fields
-- ============================================================================
ALTER TABLE extras_catalog
  ADD COLUMN IF NOT EXISTS description_premium_no TEXT,
  ADD COLUMN IF NOT EXISTS description_premium_en TEXT,
  ADD COLUMN IF NOT EXISTS chef_term_no TEXT,
  ADD COLUMN IF NOT EXISTS chef_term_en TEXT,
  ADD COLUMN IF NOT EXISTS recipe_suggestions JSONB,
  ADD COLUMN IF NOT EXISTS preparation_tips_no TEXT,
  ADD COLUMN IF NOT EXISTS preparation_tips_en TEXT;

-- Seed premium language for known extras (idempotent)
UPDATE extras_catalog
SET
  description_premium_no = COALESCE(description_premium_no, 'Ekstra ryggspekk fra ullgris. Perfekt til lardo, stekefett eller fritert som crunch-topping.'),
  description_premium_en = COALESCE(description_premium_en, 'Extra back fat from woolly pig. Perfect for lardo, cooking fat, or fried as crispy topping.'),
  chef_term_no = COALESCE(chef_term_no, 'Lardo'),
  chef_term_en = COALESCE(chef_term_en, 'Lardo'),
  recipe_suggestions = COALESCE(
    recipe_suggestions,
    '[
      {"title_no":"Lardo Crostini","title_en":"Lardo Crostini","description_no":"Tynt skaret lardo pa ristet brod med honning","description_en":"Thinly sliced lardo on toasted bread with honey","future_slug":"lardo-crostini"},
      {"title_no":"Stekt i lardo","title_en":"Fried in lardo","description_no":"Bruk lardo som stekefett til koteletter eller biffer","description_en":"Use lardo as cooking fat for chops or steaks","future_slug":"lardo-frying"}
    ]'::jsonb
  ),
  preparation_tips_no = COALESCE(preparation_tips_no, 'Kutt i tynne skiver og la smelte pa varmt brod, eller smelt ned til stekefett.'),
  preparation_tips_en = COALESCE(preparation_tips_en, 'Slice thinly and let melt on warm bread, or render down to cooking fat.')
WHERE slug = 'extra-spekk';

-- ============================================================================
-- 6. Alter orders table
-- ============================================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS mangalitsa_preset_id UUID REFERENCES mangalitsa_box_presets(id),
  ADD COLUMN IF NOT EXISTS is_mangalitsa BOOLEAN DEFAULT false;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS check_box_type;

ALTER TABLE orders
  ADD CONSTRAINT check_box_type CHECK (
    (box_size IS NOT NULL AND mangalitsa_preset_id IS NULL AND is_mangalitsa = false) OR
    (box_size IS NULL AND mangalitsa_preset_id IS NOT NULL AND is_mangalitsa = true)
  ) NOT VALID;

-- ============================================================================
-- 7. Add RLS policies for the new tables
-- ============================================================================
ALTER TABLE mangalitsa_box_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE mangalitsa_preset_contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active presets" ON mangalitsa_box_presets;
DROP POLICY IF EXISTS "Anyone can read preset contents" ON mangalitsa_preset_contents;

CREATE POLICY "Anyone can read active presets" ON mangalitsa_box_presets
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read preset contents" ON mangalitsa_preset_contents
  FOR SELECT USING (true);

-- ============================================================================
-- 8. Add updated_at trigger for mangalitsa_box_presets
-- ============================================================================

-- Create or replace the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to mangalitsa_box_presets
DROP TRIGGER IF EXISTS update_mangalitsa_box_presets_updated_at ON mangalitsa_box_presets;
CREATE TRIGGER update_mangalitsa_box_presets_updated_at
  BEFORE UPDATE ON mangalitsa_box_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_mangalitsa_box_presets_slug ON mangalitsa_box_presets(slug);
CREATE INDEX IF NOT EXISTS idx_mangalitsa_box_presets_active ON mangalitsa_box_presets(active);
CREATE INDEX IF NOT EXISTS idx_mangalitsa_box_presets_display_order ON mangalitsa_box_presets(display_order);
CREATE INDEX IF NOT EXISTS idx_mangalitsa_preset_contents_preset_id ON mangalitsa_preset_contents(preset_id);
CREATE INDEX IF NOT EXISTS idx_orders_mangalitsa_preset_id ON orders(mangalitsa_preset_id);
CREATE INDEX IF NOT EXISTS idx_orders_is_mangalitsa ON orders(is_mangalitsa);

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE mangalitsa_box_presets IS 'Predefined premium Mangalitsa pig box configurations with pricing and marketing content';
COMMENT ON TABLE mangalitsa_preset_contents IS 'Individual cut contents for each Mangalitsa box preset with target weights';
COMMENT ON COLUMN mangalitsa_box_presets.target_weight_kg IS 'Total target weight in kilograms - must be 8, 9, 10, or 12';
COMMENT ON COLUMN mangalitsa_box_presets.is_premium IS 'Indicates if this is a premium product offering';
COMMENT ON COLUMN mangalitsa_preset_contents.is_hero IS 'Indicates if this cut is a hero/featured item for marketing';
COMMENT ON COLUMN orders.is_mangalitsa IS 'Flag to identify Mangalitsa pig orders for inventory and fulfillment';

-- ============================================================================
-- 10. Validate the CHECK constraint (deferred from NOT VALID above)
-- ============================================================================
ALTER TABLE orders VALIDATE CONSTRAINT check_box_type;
