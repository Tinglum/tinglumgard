-- Migration: Update Premium Cuts and BBQ & Steakhouse box contents
-- Created: 2026-09-05
--
-- Changes (scoped strictly to box contents + oppdelingsplan catalog):
--   Premium Cuts:      remove "Ribbevalg", add "Indrefilet" and "Culotte"
--   BBQ & Steakhouse:  remove "Ribbevalg", add "Spareribs"
--   Julespesial / Familieboks:  UNCHANGED (keep Ribbevalg)
--   Oppdelingsplan:    add "Culotte" as its own cut in the ham/rump area
--
-- No changes to box price, box target weight, boxes-per-pig, or checkout logic.
-- Updates BOTH the relational source of truth (mangalitsa_preset_cuts) and the
-- legacy fallback (mangalitsa_preset_contents) so no stale content can render.
-- Idempotent and safe to run multiple times.

-- ============================================================================
-- 1) New cuts in the canonical catalog (Culotte + Spareribs)
-- ============================================================================
INSERT INTO cuts_catalog (
  slug, name_no, name_en, chef_name_no, chef_name_en, part_id, display_order, active
)
SELECT
  v.slug, v.name_no, v.name_en, v.chef_name_no, v.chef_name_en, p.id, v.display_order, true
FROM (
  VALUES
    -- Culotte belongs to the ham / rump (bakpart) area, next to skinke cuts.
    ('culotte', 'Culotte', 'Culotte', 'rump cap', 'rump cap', 'skinke', 215),
    -- Spareribs belongs to the belly / rib side.
    ('spareribs', 'Spareribs', 'Spare ribs', 'spareribs', 'spare ribs', 'ribbeside', 235)
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

-- Size ranges for the oppdelingsplan "ca. X-Y kg" display.
UPDATE cuts_catalog SET size_from_kg = 0.80, size_to_kg = 1.20 WHERE slug = 'culotte';
UPDATE cuts_catalog SET size_from_kg = 1.00, size_to_kg = 1.80 WHERE slug = 'spareribs';

-- Descriptions for the oppdelingsplan cards / diagram panel.
UPDATE cuts_catalog SET
  description_no = 'Mørt bakpartstykke fra toppen av skinka med fin fettkappe. Perfekt til langsteking, biff eller grilling — server rosa.',
  description_en = 'Tender cut from the top of the ham with a fine fat cap. Perfect for roasting, steaks or the grill — serve pink.'
WHERE slug = 'culotte';

UPDATE cuts_catalog SET
  description_no = 'Klassiske spareribs fra ribbesiden. Perfekt til lav og langsom BBQ — sprø utenpå, saftig inni.',
  description_en = 'Classic spare ribs from the belly. Perfect for low-and-slow BBQ — crisp outside, juicy inside.'
WHERE slug = 'spareribs';

-- ============================================================================
-- 2) Relational source of truth: mangalitsa_preset_cuts
-- ============================================================================

-- 2a) Remove "Ribbevalg" from Premium Cuts and BBQ & Steakhouse only.
DELETE FROM mangalitsa_preset_cuts pc
USING mangalitsa_box_presets p, cuts_catalog c
WHERE pc.preset_id = p.id
  AND pc.cut_id = c.id
  AND c.slug = 'ribbevalg'
  AND p.slug IN ('premium-cuts', 'bbq-steakhouse');

-- 2b) Insert / update the new assignments and re-order Premium pølse.
--     Final Premium Cuts order: guanciale(1), coppa(2), secreto(3), lardo(4),
--     indrefilet(5), culotte(6), premium-polse(7).
--     Final BBQ order: tomahawk(1), entrecote(2), bogstek(3), spareribs(4), bbq-polse(5).
INSERT INTO mangalitsa_preset_cuts (
  preset_id, cut_id, target_weight_kg, quantity,
  quantity_unit_no, quantity_unit_en, display_order, is_hero
)
SELECT
  p.id, c.id, v.target_weight_kg, v.quantity,
  v.quantity_unit_no, v.quantity_unit_en, v.display_order, v.is_hero
FROM (
  VALUES
    ('premium-cuts', 'indrefilet',    0.50::numeric, 1::numeric, NULL, NULL, 5, true),
    ('premium-cuts', 'culotte',       1.00::numeric, 1::numeric, NULL, NULL, 6, false),
    ('premium-cuts', 'premium-polse', 1.30::numeric, 1::numeric, NULL, NULL, 7, false),

    ('bbq-steakhouse', 'spareribs',   1.50::numeric, 1::numeric, NULL, NULL, 4, false)
) AS v(
  preset_slug, cut_slug, target_weight_kg, quantity,
  quantity_unit_no, quantity_unit_en, display_order, is_hero
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
-- 3) Legacy fallback: mangalitsa_preset_contents (kept in sync)
-- ============================================================================

-- 3a) Remove legacy "Ribbevalg" rows from Premium Cuts and BBQ only.
DELETE FROM mangalitsa_preset_contents mpc
USING mangalitsa_box_presets p
WHERE mpc.preset_id = p.id
  AND p.slug IN ('premium-cuts', 'bbq-steakhouse')
  AND mpc.content_name_no ILIKE 'Ribbevalg%';

-- 3b) Re-point legacy Premium pølse to display_order 7 (was 6).
UPDATE mangalitsa_preset_contents mpc
SET display_order = 7
FROM mangalitsa_box_presets p
WHERE mpc.preset_id = p.id
  AND p.slug = 'premium-cuts'
  AND mpc.content_name_no ILIKE 'Premium pølse%';

-- 3c) Insert legacy rows for the new cuts (guarded against duplicates).
INSERT INTO mangalitsa_preset_contents (
  preset_id, content_name_no, content_name_en, target_weight_kg, display_order, is_hero
)
SELECT p.id, v.content_name_no, v.content_name_en, v.target_weight_kg, v.display_order, v.is_hero
FROM (
  VALUES
    ('premium-cuts', 'Indrefilet', 'Tenderloin', 0.50::numeric, 5, true),
    ('premium-cuts', 'Culotte', 'Culotte', 1.00::numeric, 6, false),
    ('bbq-steakhouse', 'Spareribs', 'Spare ribs', 1.50::numeric, 4, false)
) AS v(preset_slug, content_name_no, content_name_en, target_weight_kg, display_order, is_hero)
JOIN mangalitsa_box_presets p ON p.slug = v.preset_slug
WHERE NOT EXISTS (
  SELECT 1 FROM mangalitsa_preset_contents existing
  WHERE existing.preset_id = p.id
    AND existing.content_name_no = v.content_name_no
);
