-- Add minimum egg weight to egg breeds
ALTER TABLE egg_breeds
ADD COLUMN IF NOT EXISTS min_egg_weight_grams INTEGER;

-- Update accent colors for egg breeds
UPDATE egg_breeds SET accent_color = '#1A1A1A' WHERE slug = 'ayam-cemani';
UPDATE egg_breeds SET accent_color = '#6B7F3A' WHERE slug = 'silverudds-bla';
UPDATE egg_breeds SET accent_color = '#8FD9D6' WHERE slug = 'cream-legbar';
UPDATE egg_breeds SET accent_color = '#5A2A1D' WHERE slug = 'maran';
UPDATE egg_breeds SET accent_color = '#C8A26A' WHERE slug = 'jersey-giant';
