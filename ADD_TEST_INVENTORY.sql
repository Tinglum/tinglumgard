-- =============================================================================
-- ADD TEST INVENTORY FOR EGG BREEDS
-- =============================================================================
-- Run this in Supabase SQL Editor to add inventory for testing
-- This adds 8 weeks of inventory for each breed (weeks 12-19 of 2026)
-- =============================================================================

-- Add inventory for Ayam Cemani (50 eggs per week)
INSERT INTO egg_inventory (breed_id, year, week_number, delivery_monday, eggs_available, eggs_allocated, status)
SELECT
  id,
  2026,
  week_num,
  ('2026-03-16'::date + ((week_num - 12) * 7 || ' days')::interval)::date,
  50,
  0,
  'open'
FROM egg_breeds
CROSS JOIN generate_series(12, 19) AS week_num
WHERE slug = 'ayam-cemani';

-- Add inventory for Jersey Giant (60 eggs per week)
INSERT INTO egg_inventory (breed_id, year, week_number, delivery_monday, eggs_available, eggs_allocated, status)
SELECT
  id,
  2026,
  week_num,
  ('2026-03-16'::date + ((week_num - 12) * 7 || ' days')::interval)::date,
  60,
  0,
  'open'
FROM egg_breeds
CROSS JOIN generate_series(12, 19) AS week_num
WHERE slug = 'jersey-giant';

-- Add inventory for Silverudd's Blå (60 eggs per week)
INSERT INTO egg_inventory (breed_id, year, week_number, delivery_monday, eggs_available, eggs_allocated, status)
SELECT
  id,
  2026,
  week_num,
  ('2026-03-16'::date + ((week_num - 12) * 7 || ' days')::interval)::date,
  60,
  0,
  'open'
FROM egg_breeds
CROSS JOIN generate_series(12, 19) AS week_num
WHERE slug = 'silverudds-bla';

-- Add inventory for Cream Legbar (60 eggs per week)
INSERT INTO egg_inventory (breed_id, year, week_number, delivery_monday, eggs_available, eggs_allocated, status)
SELECT
  id,
  2026,
  week_num,
  ('2026-03-16'::date + ((week_num - 12) * 7 || ' days')::interval)::date,
  60,
  0,
  'open'
FROM egg_breeds
CROSS JOIN generate_series(12, 19) AS week_num
WHERE slug = 'cream-legbar';

-- Add inventory for Maran (60 eggs per week)
INSERT INTO egg_inventory (breed_id, year, week_number, delivery_monday, eggs_available, eggs_allocated, status)
SELECT
  id,
  2026,
  week_num,
  ('2026-03-16'::date + ((week_num - 12) * 7 || ' days')::interval)::date,
  60,
  0,
  'open'
FROM egg_breeds
CROSS JOIN generate_series(12, 19) AS week_num
WHERE slug = 'maran';

-- Verify the inventory was added
SELECT
  eb.name,
  ei.year,
  ei.week_number,
  ei.delivery_monday,
  ei.eggs_available,
  ei.eggs_allocated,
  ei.status
FROM egg_inventory ei
JOIN egg_breeds eb ON eb.id = ei.breed_id
ORDER BY eb.display_order, ei.week_number;

-- =============================================================================
-- Expected result: 40 rows (5 breeds × 8 weeks each)
-- =============================================================================
