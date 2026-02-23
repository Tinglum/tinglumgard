-- ============================================================
-- Fix recipe image assignments
-- Date: 2026-02-23
-- ============================================================

UPDATE recipes
SET image_url = '/recipes/carbonara-guanciale.jpg'
WHERE slug = 'amatriciana';

UPDATE recipes
SET image_url = '/recipes/neck-steak.jpg'
WHERE slug = 'secreto-plancha';

UPDATE recipes
SET image_url = '/recipes/tomahawk-grill.jpg'
WHERE slug = 'presa-herbs';

UPDATE recipes
SET image_url = '/recipes/coppa-project.jpg'
WHERE slug = 'lardo-crostini';

UPDATE recipes
SET image_url = '/recipes/coppa-project.jpg'
WHERE slug = 'rendered-lard';

UPDATE recipes
SET image_url = '/recipes/neck-steak.jpg'
WHERE slug = 'pancetta-project';

UPDATE recipes
SET image_url = '/recipes/tomahawk-grill.jpg'
WHERE slug = 'cure-ham';

