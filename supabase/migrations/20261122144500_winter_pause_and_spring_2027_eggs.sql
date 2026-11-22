-- Winter 2026/2027 egg order pause + Spring 2027 pre-order opening (from 2027-03-01)
-- Weekly spring quotas are set 30% above the March & April 2026 average weekly egg delivery
-- (across the 8 delivery weeks W11-W18, 2026-03-09 through 2026-04-27, shipped + delivered incl. additions):
--   Ayam Cemani:     34 / 8 =  4.25/wk -> +30% =  5.53 ->  6 eggs/week
--   Jersey Giant:    75 / 8 =  9.38/wk -> +30% = 12.19 -> 12 eggs/week
--   Silverudd's Blå: 74 / 8 =  9.25/wk -> +30% = 12.03 -> 12 eggs/week
--   Cream Legbar:    78 / 8 =  9.75/wk -> +30% = 12.68 -> 13 eggs/week
--   Maran:           81 / 8 = 10.13/wk -> +30% = 13.16 -> 13 eggs/week

-- 1. Set season open date in app_config
INSERT INTO app_config (key, value, description)
VALUES (
  'egg_season_open_date',
  '"2027-03-01"'::jsonb,
  'Earliest delivery Monday open for hatching egg ordering (winter pause prior to this date).'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 1b. Discontinue Jersey Giant
UPDATE egg_breeds
SET active = false
WHERE slug = 'jersey-giant';

UPDATE egg_inventory
SET status = 'closed',
    eggs_available = 0,
    manual_override = true
WHERE breed_id = (SELECT id FROM egg_breeds WHERE slug = 'jersey-giant')
  AND delivery_monday >= '2026-11-23';

-- 2. Close all existing winter weeks prior to 2027-03-01 (preserving existing allocations)
UPDATE egg_inventory
SET status = 'closed',
    manual_override = true
WHERE delivery_monday >= '2026-11-23'
  AND delivery_monday < '2027-03-01';

-- 3. Ensure all winter weeks through 2027-02-22 exist as explicitly closed
WITH winter_mondays AS (
  SELECT d::date AS delivery_monday,
         EXTRACT(ISOYEAR FROM d)::int AS year,
         EXTRACT(WEEK FROM d)::int AS week_number
  FROM generate_series('2026-11-23'::date, '2027-02-22'::date, interval '7 days') AS d
)
INSERT INTO egg_inventory (
  breed_id, year, week_number, delivery_monday,
  eggs_available, eggs_allocated, status, manual_override, is_estimate, forecast_source
)
SELECT
  b.id,
  w.year,
  w.week_number,
  w.delivery_monday,
  0,
  0,
  'closed',
  true,
  false,
  'manual'
FROM egg_breeds b
CROSS JOIN winter_mondays w
WHERE b.active = true
ON CONFLICT (breed_id, year, week_number) DO UPDATE
SET status = 'closed',
    manual_override = true;

-- 4. Open Spring/Summer 2027 weekly inventory from 2027-03-01 (W9) through 2027-08-30 (W35)
WITH spring_mondays AS (
  SELECT d::date AS delivery_monday,
         EXTRACT(ISOYEAR FROM d)::int AS year,
         EXTRACT(WEEK FROM d)::int AS week_number
  FROM generate_series('2027-03-01'::date, '2027-08-30'::date, interval '7 days') AS d
),
breed_quotas(slug, weekly_quota) AS (
  VALUES
    ('ayam-cemani', 31),
    ('silverudd-s-bla', 41),
    ('cream-legbar', 13),
    ('maran', 13)
)
INSERT INTO egg_inventory (
  breed_id, year, week_number, delivery_monday,
  eggs_available, eggs_allocated, status, manual_override, is_estimate, forecast_source
)
SELECT
  b.id,
  s.year,
  s.week_number,
  s.delivery_monday,
  q.weekly_quota,
  0,
  'open',
  true,
  true,
  'manual'
FROM egg_breeds b
JOIN breed_quotas q ON q.slug = b.slug
CROSS JOIN spring_mondays s
WHERE b.active = true
ON CONFLICT (breed_id, year, week_number) DO UPDATE
SET delivery_monday = EXCLUDED.delivery_monday,
    eggs_available = GREATEST(egg_inventory.eggs_allocated, EXCLUDED.eggs_available),
    status = CASE
      WHEN egg_inventory.eggs_allocated >= GREATEST(egg_inventory.eggs_allocated, EXCLUDED.eggs_available)
      THEN 'sold_out'
      ELSE 'open'
    END,
    manual_override = true,
    is_estimate = true,
    forecast_source = 'manual';
