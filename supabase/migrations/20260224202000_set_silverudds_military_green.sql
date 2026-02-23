-- ============================================================
-- Set Silverudds accent color to military green
-- Date: 2026-02-24
-- ============================================================

-- Egg breeds (rugeegg pages)
UPDATE egg_breeds
SET accent_color = '#6B7F3A'
WHERE slug IN ('silverudds-bla', 'silverudds');

-- Chicken breeds (keep Silverudds visually consistent if present)
UPDATE chicken_breeds
SET accent_color = '#6B7F3A'
WHERE slug IN ('silverudds-bla', 'silverudds');
