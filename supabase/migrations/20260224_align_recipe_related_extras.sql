-- ============================================================
-- Align recipe related extras with sold cuts and projects
-- Date: 2026-02-24
-- ============================================================

UPDATE recipes
SET related_extra_slugs = CASE slug
  WHEN 'carbonara-guanciale' THEN ARRAY['extra-guanciale']::text[]
  WHEN 'amatriciana' THEN ARRAY['extra-guanciale']::text[]
  WHEN 'coppa-project' THEN ARRAY['extra-coppa']::text[]
  WHEN 'neck-steak' THEN ARRAY['extra-coppa','extra-secreto-presa-pluma']::text[]
  WHEN 'secreto-plancha' THEN ARRAY['extra-secreto-presa-pluma']::text[]
  WHEN 'presa-herbs' THEN ARRAY['extra-secreto-presa-pluma']::text[]
  WHEN 'lardo-crostini' THEN ARRAY['extra-spekk']::text[]
  WHEN 'rendered-lard' THEN ARRAY['extra-spekk','extra-smult']::text[]
  WHEN 'tomahawk-grill' THEN ARRAY['extra-tomahawk']::text[]
  WHEN 'pork-ribeye-pan' THEN ARRAY['extra-svine-entrecote']::text[]
  WHEN 'pancetta-project' THEN ARRAY['extra-pancetta']::text[]
  WHEN 'cure-ham' THEN ARRAY['extra-skinke-speking']::text[]
  ELSE related_extra_slugs
END,
updated_at = NOW()
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
