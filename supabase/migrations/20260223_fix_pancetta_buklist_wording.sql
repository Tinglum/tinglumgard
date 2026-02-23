-- ============================================================
-- Fix wording for pancetta recipe: use buklist/svinebuk, not svinebryst
-- Date: 2026-02-23
-- ============================================================

UPDATE recipes
SET
  intro_no = 'Hjemmelaget pancetta fra Mangalitsa-buklist (svinebuk). Salt i 7 dager, krydre med pepper, fennikel og einebær, rull stramt og heng i 4-6 uker. Resultatet er en pancetta med tykkere, rikere fettlag enn noe du kan kjøpe.',
  ingredients_no = jsonb_set(
    ingredients_no,
    '{0,item}',
    to_jsonb('Mangalitsa-buklist (svinebuk), med svoren fjernet'::text),
    false
  ),
  ingredients_en = jsonb_set(
    ingredients_en,
    '{0,item}',
    to_jsonb('Mangalitsa pork belly (buklist cut), skin removed'::text),
    false
  ),
  steps_no = jsonb_set(
    steps_no,
    '{0}',
    to_jsonb('Legg buklisten med kjøttsiden opp på et rent skjærebrett. Trim bort eventuelle løse biter og ujevnheter slik at du har et noenlunde rektangulært stykke.'::text),
    false
  ),
  updated_at = NOW()
WHERE slug = 'pancetta-project';

