-- Chicken winter pause (Ayam Cemani only) + May 1, 2027 Spring opening (10w, 14w, 18w cohorts)
-- + Discontinue Jersey Giant + Update local chicken breed images

-- 1. Discontinue Jersey Giant & update breed images for the 4 active breeds
UPDATE chicken_breeds SET active = false WHERE slug = 'jersey-giant';
UPDATE chicken_breeds SET image_url = '/chickens/ayam-cemani.jpg', active = true WHERE slug = 'ayam-cemani';
UPDATE chicken_breeds SET image_url = '/chickens/silverudds.jpg', active = true WHERE slug = 'silverudds';
UPDATE chicken_breeds SET image_url = '/chickens/maran.jpg', active = true WHERE slug = 'maran';
UPDATE chicken_breeds SET image_url = '/chickens/cream-legbar.jpg', active = true WHERE slug = 'cream-legbar';

-- 2. Configure Spring 2027 chicken opening gate in app_config
INSERT INTO app_config (key, value, description)
VALUES
  (
    'chicken_spring_open_date',
    '"2027-05-01"'::jsonb,
    'Earliest pickup date for Spring 2027 chicken cohorts and non-Ayam Cemani breeds.'
  ),
  (
    'chicken_spring_cohort_hatch_from',
    '"2026-12-01"'::jsonb,
    'Hatches on/after this date belong to Spring 2027 cohorts gated by chicken_spring_open_date.'
  )
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 3. Close all existing pre-Dec-2026 chicken hatches for non-Ayam Cemani breeds
UPDATE chicken_hatches
SET active = false
WHERE breed_id IN (SELECT id FROM chicken_breeds WHERE slug <> 'ayam-cemani')
  AND hatch_date < '2026-12-01'
  AND active = true;

-- 4. Seed Spring 2027 cohorts (18w, 14w, 10w at Monday 2027-05-03 / W18) — 5 hens each per breed
WITH cohorts(hatch_date, label) AS (
  VALUES
    ('2026-12-28'::date, '18w'),
    ('2027-01-25'::date, '14w'),
    ('2027-02-22'::date, '10w')
)
INSERT INTO chicken_hatches (
  breed_id, hatch_date, initial_count, estimated_hens, estimated_roosters,
  available_hens, available_roosters, expected_hatch_count, actual_hatched_count, notes, active
)
SELECT
  b.id,
  c.hatch_date,
  12,
  6,
  6,
  5,
  0,
  12,
  12,
  'Spring 2027 cohort (' || c.label || ' at May 1 opening)',
  true
FROM chicken_breeds b
CROSS JOIN cohorts c
WHERE b.active = true
  AND b.slug IN ('ayam-cemani', 'silverudds', 'maran', 'cream-legbar')
  AND NOT EXISTS (
    SELECT 1 FROM chicken_hatches h
    WHERE h.breed_id = b.id AND h.hatch_date = c.hatch_date
  );
