-- ============================================================================
-- Relabel "lapskaus-kjottbiter" to meat soup wording (matches method/content)
-- Date: 2026-02-27
-- ============================================================================

UPDATE recipes
SET
  title_no = U&'Kj\00F8ttsuppe med ullgris-kj\00F8ttbiter',
  title_en = 'Norwegian Meat Soup with Wool Pig Meat Cubes',
  intro_no = U&'En norsk kj\00F8ttsuppe med dypere smak og mykere tekstur fra ullgris.',
  intro_en = 'A Norwegian meat soup with deeper flavor and softer texture from wool pig.',
  tips_no = U&'Kj\00F8ttsuppe blir ofte enda bedre dagen etter - perfekt \00E5 lage stor porsjon.',
  tips_en = 'Meat soup is often even better the next day - perfect for batch cooking.',
  updated_at = NOW()
WHERE slug = 'lapskaus-kjottbiter';
