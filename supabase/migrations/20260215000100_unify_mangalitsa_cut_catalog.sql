-- Migration: Unify Mangalitsa cut data model
-- Purpose: make box contents relational and consistent across admin + frontend

-- ============================================================================
-- 1) Pig parts catalog (diagram-level parts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pig_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name_no TEXT NOT NULL,
  name_en TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO pig_parts (key, name_no, name_en, display_order, active)
VALUES
  ('nakke', 'Nakke', 'Neck', 1, true),
  ('svinebog', 'Svinebog', 'Shoulder', 2, true),
  ('kotelettkam', 'Kotelettkam', 'Loin', 3, true),
  ('ribbeside', 'Ribbeside', 'Belly / Ribs', 4, true),
  ('skinke', 'Skinke', 'Ham', 5, true),
  ('knoke', 'Knoke', 'Hock / Knuckle', 6, true)
ON CONFLICT (key) DO UPDATE
SET
  name_no = EXCLUDED.name_no,
  name_en = EXCLUDED.name_en,
  display_order = EXCLUDED.display_order,
  active = EXCLUDED.active;

-- ============================================================================
-- 2) Canonical cuts catalog
-- ============================================================================
CREATE TABLE IF NOT EXISTS cuts_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_no TEXT NOT NULL,
  name_en TEXT NOT NULL,
  chef_name_no TEXT,
  chef_name_en TEXT,
  part_id UUID NOT NULL REFERENCES pig_parts(id) ON DELETE RESTRICT,
  description_no TEXT,
  description_en TEXT,
  display_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cuts_catalog (
  slug, name_no, name_en, chef_name_no, chef_name_en, part_id, display_order, active
)
SELECT
  v.slug,
  v.name_no,
  v.name_en,
  v.chef_name_no,
  v.chef_name_en,
  p.id,
  v.display_order,
  true
FROM (
  VALUES
    ('guanciale', 'Svinekinn', 'Pork jowl', 'guanciale', 'guanciale', 'nakke', 10),
    ('nakkekam-coppa', 'Nakkekam', 'Neck collar', 'coppa', 'coppa', 'nakke', 20),
    ('secreto-presa-pluma', 'Slakterbiff', 'Butcher steak', 'secreto, presa, pluma', 'secreto, presa, pluma', 'nakke', 30),
    ('indrefilet', 'Indrefilet', 'Tenderloin', 'tenderloin', 'tenderloin', 'kotelettkam', 40),
    ('tomahawk-kotelett', 'Tomahawk-kotelett', 'Tomahawk chop', 'tomahawk', 'tomahawk', 'kotelettkam', 50),
    ('svine-entrecote', 'Svine-entrecôte', 'Pork ribeye', 'ribeye', 'ribeye', 'kotelettkam', 60),
    ('koteletter-fettkappe', 'Koteletter med fettkappe', 'Chops with fat cap', 'rib chop', 'rib chop', 'kotelettkam', 70),
    ('ryggspekk-lardo', 'Ryggspekk blokk', 'Back fat block', 'lardo', 'lardo', 'kotelettkam', 80),
    ('ribbevalg', 'Ribbevalg', 'Rib selection', 'ribs/belly', 'ribs/belly', 'ribbeside', 90),
    ('bacon', 'Bacon', 'Bacon', 'pancetta/bacon', 'pancetta/bacon', 'ribbeside', 100),
    ('kokkefett-smult', 'Kokkefett (smult)', 'Cooking fat (lard)', 'smult/lard', 'lard', 'ribbeside', 110),
    ('bogstek', 'Bogstek', 'Shoulder roast', 'shoulder', 'shoulder', 'svinebog', 120),
    ('kjottdeig-grov', 'Kjøttdeig, grov og saftig', 'Ground pork, coarse & juicy', 'mince', 'mince', 'svinebog', 130),
    ('gryte-stekekjott', 'Gryte/stekekjøtt', 'Stew/roast meat', 'stew cut', 'stew cut', 'svinebog', 140),
    ('premium-polse', 'Premium pølse', 'Premium sausage', 'sausage', 'sausage', 'svinebog', 150),
    ('bbq-polse', 'BBQ-pølse', 'BBQ sausage', 'sausage', 'sausage', 'svinebog', 160),
    ('medisterpolser', 'Medisterpølser av Mangalitsa', 'Mangalitsa medister sausages', 'medister sausage', 'medister sausage', 'svinebog', 170),
    ('medisterfarse', 'Medisterfarse', 'Medister mince', 'medister mince', 'medister mince', 'svinebog', 180),
    ('julepolse', 'Julepølse', 'Christmas sausage', 'julepølse', 'christmas sausage', 'svinebog', 190),
    ('knoke', 'Knoke', 'Knuckle', 'hock', 'hock', 'knoke', 200),
    ('skinke-speking', 'Skinke til speking', 'Ham for curing', 'ham', 'ham', 'skinke', 210),
    ('ytrefilet-ryggfilet', 'Ytrefilet/Ryggfilet', 'Loin fillet', 'loin fillet', 'loin fillet', 'kotelettkam', 220),
    ('svinekam', 'Hel svinekam', 'Whole pork loin', 'pork loin', 'pork loin', 'kotelettkam', 225),
    ('svinekoteletter', 'Svinekoteletter', 'Pork chops', 'chops', 'chops', 'kotelettkam', 230),
    ('ekstra-ribbe', 'Ekstra ribbe', 'Extra ribs', 'ribs', 'ribs', 'ribbeside', 240),
    ('pinnekjott', 'Pinnekjøtt', 'Salt-cured ribs (pinnekjøtt)', 'pinnekjøtt', 'salt-cured ribs', 'ribbeside', 245),
    ('bacon-sideflesk', 'Bacon/Sideflesk', 'Bacon/Pork belly', 'bacon/pork belly', 'bacon/pork belly', 'ribbeside', 250),
    ('kamsteik', 'Kamsteik/Svinesteik', 'Neck/loin roast', 'roast', 'roast', 'kotelettkam', 255),
    ('labb', 'Labb', 'Trotter', 'trotter', 'trotter', 'knoke', 260)
) AS v(slug, name_no, name_en, chef_name_no, chef_name_en, part_key, display_order)
JOIN pig_parts p ON p.key = v.part_key
ON CONFLICT (slug) DO UPDATE
SET
  name_no = EXCLUDED.name_no,
  name_en = EXCLUDED.name_en,
  chef_name_no = EXCLUDED.chef_name_no,
  chef_name_en = EXCLUDED.chef_name_en,
  part_id = EXCLUDED.part_id,
  display_order = EXCLUDED.display_order,
  active = true;

-- ============================================================================
-- 3) Relational preset -> cuts table
-- ============================================================================
CREATE TABLE IF NOT EXISTS mangalitsa_preset_cuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id UUID NOT NULL REFERENCES mangalitsa_box_presets(id) ON DELETE CASCADE,
  cut_id UUID NOT NULL REFERENCES cuts_catalog(id) ON DELETE RESTRICT,
  target_weight_kg NUMERIC(4,2),
  quantity NUMERIC(5,2) NOT NULL DEFAULT 1,
  quantity_unit_no TEXT,
  quantity_unit_en TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_hero BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (preset_id, cut_id)
);

-- ============================================================================
-- 4) Backfill preset cut assignments (source of truth for boxes)
-- ============================================================================
INSERT INTO mangalitsa_preset_cuts (
  preset_id,
  cut_id,
  target_weight_kg,
  quantity,
  quantity_unit_no,
  quantity_unit_en,
  display_order,
  is_hero
)
SELECT
  p.id,
  c.id,
  v.target_weight_kg,
  v.quantity,
  v.quantity_unit_no,
  v.quantity_unit_en,
  v.display_order,
  v.is_hero
FROM (
  VALUES
    ('premium-cuts', 'guanciale', 1.10::numeric, 2::numeric, 'stk', 'pcs', 1, true),
    ('premium-cuts', 'nakkekam-coppa', 1.50::numeric, 1::numeric, NULL, NULL, 2, true),
    ('premium-cuts', 'secreto-presa-pluma', 1.10::numeric, 1::numeric, NULL, NULL, 3, true),
    ('premium-cuts', 'ryggspekk-lardo', 1.20::numeric, 1::numeric, NULL, NULL, 4, false),
    ('premium-cuts', 'ribbevalg', 1.50::numeric, 1::numeric, NULL, NULL, 5, false),
    ('premium-cuts', 'premium-polse', 1.30::numeric, 1::numeric, NULL, NULL, 6, false),

    ('bbq-steakhouse', 'tomahawk-kotelett', 2.00::numeric, 2::numeric, 'stk', 'pcs', 1, true),
    ('bbq-steakhouse', 'svine-entrecote', 1.30::numeric, 2::numeric, 'stk', 'pcs', 2, true),
    ('bbq-steakhouse', 'bogstek', 3.00::numeric, 1::numeric, NULL, NULL, 3, false),
    ('bbq-steakhouse', 'ribbevalg', 1.50::numeric, 1::numeric, NULL, NULL, 4, false),
    ('bbq-steakhouse', 'bbq-polse', 1.20::numeric, 1::numeric, NULL, NULL, 5, false),

    ('julespesial', 'ribbevalg', 1.50::numeric, 1::numeric, NULL, NULL, 1, true),
    ('julespesial', 'medisterpolser', 1.50::numeric, 1::numeric, NULL, NULL, 2, true),
    ('julespesial', 'medisterfarse', 1.50::numeric, 1::numeric, NULL, NULL, 3, true),
    ('julespesial', 'knoke', 1.00::numeric, 1::numeric, 'stk', 'pc', 4, false),
    ('julespesial', 'julepolse', 1.50::numeric, 1::numeric, NULL, NULL, 5, false),
    ('julespesial', 'kokkefett-smult', 0.50::numeric, 1::numeric, NULL, NULL, 6, false),

    ('familieboks', 'ribbevalg', 1.50::numeric, 1::numeric, NULL, NULL, 1, false),
    ('familieboks', 'bacon', 1.00::numeric, 1::numeric, NULL, NULL, 2, false),
    ('familieboks', 'koteletter-fettkappe', 2.00::numeric, 1::numeric, NULL, NULL, 3, false),
    ('familieboks', 'kjottdeig-grov', 3.00::numeric, 1::numeric, NULL, NULL, 4, false),
    ('familieboks', 'premium-polse', 1.50::numeric, 1::numeric, NULL, NULL, 5, false),
    ('familieboks', 'gryte-stekekjott', 2.00::numeric, 1::numeric, NULL, NULL, 6, false)
) AS v(
  preset_slug,
  cut_slug,
  target_weight_kg,
  quantity,
  quantity_unit_no,
  quantity_unit_en,
  display_order,
  is_hero
)
JOIN mangalitsa_box_presets p ON p.slug = v.preset_slug
JOIN cuts_catalog c ON c.slug = v.cut_slug
ON CONFLICT (preset_id, cut_id) DO UPDATE
SET
  target_weight_kg = EXCLUDED.target_weight_kg,
  quantity = EXCLUDED.quantity,
  quantity_unit_no = EXCLUDED.quantity_unit_no,
  quantity_unit_en = EXCLUDED.quantity_unit_en,
  display_order = EXCLUDED.display_order,
  is_hero = EXCLUDED.is_hero;

-- ============================================================================
-- 5) RLS + indexes
-- ============================================================================
ALTER TABLE pig_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuts_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE mangalitsa_preset_cuts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pig_parts' AND policyname = 'Anyone can read pig parts'
  ) THEN
    CREATE POLICY "Anyone can read pig parts" ON pig_parts
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cuts_catalog' AND policyname = 'Anyone can read active cuts'
  ) THEN
    CREATE POLICY "Anyone can read active cuts" ON cuts_catalog
      FOR SELECT USING (active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mangalitsa_preset_cuts' AND policyname = 'Anyone can read preset cuts'
  ) THEN
    CREATE POLICY "Anyone can read preset cuts" ON mangalitsa_preset_cuts
      FOR SELECT USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pig_parts_key ON pig_parts(key);
CREATE INDEX IF NOT EXISTS idx_cuts_catalog_active_order ON cuts_catalog(active, display_order);
CREATE INDEX IF NOT EXISTS idx_cuts_catalog_part_id ON cuts_catalog(part_id);
CREATE INDEX IF NOT EXISTS idx_mangalitsa_preset_cuts_preset_id ON mangalitsa_preset_cuts(preset_id);
CREATE INDEX IF NOT EXISTS idx_mangalitsa_preset_cuts_cut_id ON mangalitsa_preset_cuts(cut_id);

DROP TRIGGER IF EXISTS update_cuts_catalog_updated_at ON cuts_catalog;
CREATE TRIGGER update_cuts_catalog_updated_at
  BEFORE UPDATE ON cuts_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE pig_parts IS 'Canonical pig parts used in the diagram and cut mapping.';
COMMENT ON TABLE cuts_catalog IS 'Canonical catalog of all selectable Mangalitsa cuts.';
COMMENT ON TABLE mangalitsa_preset_cuts IS 'Relational mapping between Mangalitsa box presets and selected cuts.';
COMMENT ON COLUMN cuts_catalog.part_id IS 'References pig part shown in diagram.';
COMMENT ON COLUMN mangalitsa_preset_cuts.quantity_unit_no IS 'Optional unit label for quantity (e.g. stk).';
COMMENT ON COLUMN mangalitsa_preset_cuts.quantity_unit_en IS 'Optional unit label for quantity (e.g. pcs).';
