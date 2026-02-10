-- =============================================================================
-- ADD BASE EGG INVENTORY (15 ± 5) THROUGH AUGUST 2026
-- =============================================================================
-- Run this in Supabase SQL Editor
-- Creates weekly inventory for ALL active breeds from next Monday through 2026-08-01
-- Eggs available per week = random between 10 and 20 (15 ± 5)
-- Existing rows are preserved (ON CONFLICT DO NOTHING)
-- =============================================================================

-- Optional: clear existing rows in the range first
-- DELETE FROM egg_inventory
-- WHERE delivery_monday >= (date_trunc('week', current_date)::date + interval '7 days')
--   AND delivery_monday <= date '2026-08-01';

WITH params AS (
  SELECT
    (date_trunc('week', current_date)::date + interval '7 days')::date AS start_monday,
    date '2026-08-01' AS end_date
),
mondays AS (
  SELECT generate_series(start_monday, end_date, interval '7 days')::date AS delivery_monday
  FROM params
),
weeks AS (
  SELECT
    delivery_monday,
    extract(isoyear from delivery_monday)::int AS year,
    extract(week from delivery_monday)::int AS week_number
  FROM mondays
),
active_breeds AS (
  SELECT id AS breed_id
  FROM egg_breeds
  WHERE active = true
)
INSERT INTO egg_inventory (
  breed_id,
  year,
  week_number,
  delivery_monday,
  eggs_available,
  eggs_allocated,
  status
)
SELECT
  b.breed_id,
  w.year,
  w.week_number,
  w.delivery_monday,
  (floor(random() * 11)::int + 10) AS eggs_available,
  0 AS eggs_allocated,
  'open' AS status
FROM active_breeds b
CROSS JOIN weeks w
ON CONFLICT (breed_id, year, week_number) DO NOTHING;

-- Verify rows
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
WHERE ei.delivery_monday >= (date_trunc('week', current_date)::date + interval '7 days')
  AND ei.delivery_monday <= date '2026-08-01'
ORDER BY eb.display_order, ei.delivery_monday;

-- =============================================================================
