-- ============================================================
-- Fix rendered-lard recipe image extension
-- Date: 2026-02-23
-- ============================================================

UPDATE recipes
SET image_url = '/recipes/rendered-lard.jpg',
    updated_at = NOW()
WHERE slug = 'rendered-lard';
