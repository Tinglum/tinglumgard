-- ============================================================
-- Restore unique image per recipe slug
-- Date: 2026-02-23
-- ============================================================

UPDATE recipes
SET image_url = CASE slug
  WHEN 'carbonara-guanciale' THEN '/recipes/carbonara-guanciale.jpg'
  WHEN 'amatriciana' THEN '/recipes/amatriciana.jpg'
  WHEN 'coppa-project' THEN '/recipes/coppa-project.jpg'
  WHEN 'neck-steak' THEN '/recipes/neck-steak.jpg'
  WHEN 'secreto-plancha' THEN '/recipes/secreto-plancha.jpg'
  WHEN 'presa-herbs' THEN '/recipes/presa-herbs.jpg'
  WHEN 'lardo-crostini' THEN '/recipes/lardo-crostini.jpg'
  WHEN 'rendered-lard' THEN '/recipes/rendered-lard.jpg'
  WHEN 'tomahawk-grill' THEN '/recipes/tomahawk-grill.jpg'
  WHEN 'pork-ribeye-pan' THEN '/recipes/pork-ribeye-pan.jpg'
  WHEN 'pancetta-project' THEN '/recipes/pancetta-project.jpg'
  WHEN 'cure-ham' THEN '/recipes/cure-ham.jpg'
  ELSE image_url
END
WHERE slug IN (
  'carbonara-guanciale',
  'amatriciana',
  'coppa-project',
  'neck-steak',
  'secreto-plancha',
  'presa-herbs',
  'lardo-crostini',
  'rendered-lard',
  'tomahawk-grill',
  'pork-ribeye-pan',
  'pancetta-project',
  'cure-ham'
);

