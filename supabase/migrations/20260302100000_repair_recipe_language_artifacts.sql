-- ============================================================================
-- Repair lingering language artifacts in recipe texts (mojibake/replacement drift)
-- Date: 2026-03-02
-- ============================================================================

CREATE OR REPLACE FUNCTION public._repair_recipe_text(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  out_text text := input;
  pair text[];
  replacements text[][] := ARRAY[
    ARRAY['Ã¦', 'æ'],
    ARRAY['Ã¸', 'ø'],
    ARRAY['Ã¥', 'å'],
    ARRAY['Ã†', 'Æ'],
    ARRAY['Ã˜', 'Ø'],
    ARRAY['Ã…', 'Å'],
    ARRAY['Â°C', '°C'],
    ARRAY['Â°', '°'],
    ARRAY['Ã©', 'é'],

    ARRAY['Skj�r', 'Skjær'],
    ARRAY['skj�r', 'skjær'],
    ARRAY['oppskj�ring', 'oppskjæring'],
    ARRAY['kj�tt', 'kjøtt'],
    ARRAY['Kj�tt', 'Kjøtt'],
    ARRAY['kj�leskapet', 'kjøleskapet'],
    ARRAY['kj�leskap', 'kjøleskap'],
    ARRAY['kj�kkenpapir', 'kjøkkenpapir'],
    ARRAY['st�pejern', 'støpejern'],
    ARRAY['hvitl�k', 'hvitløk'],
    ARRAY['l�k', 'løk'],
    ARRAY['sm�r', 'smør'],
    ARRAY['f�r', 'før'],
    ARRAY['f�rst', 'først'],
    ARRAY['h�y', 'høy'],
    ARRAY['h�ye', 'høye'],
    ARRAY['h�yere', 'høyere'],
    ARRAY['v�re', 'være'],
    ARRAY['n�r', 'når'],
    ARRAY['n�ye', 'nøye'],
    ARRAY['n�dvendig', 'nødvendig'],
    ARRAY['gr�nnsaker', 'grønnsaker'],
    ARRAY['gr�nn', 'grønn'],
    ARRAY['gr�nt', 'grønt'],
    ARRAY['spr�', 'sprø'],
    ARRAY['d�rslag', 'dørslag'],
    ARRAY['g�r', 'går'],
    ARRAY['p�', 'på'],
    ARRAY['ogs�', 'også'],

    ARRAY['intramuskul��rt', 'intramuskulært'],
    ARRAY['intramuskul�rt', 'intramuskulært'],
    ARRAY['for - overvåke', 'for å overvåke'],
    ARRAY['for - overvake', 'for å overvåke'],
    ARRAY['begynner - samle seg', 'begynner å samle seg'],
    ARRAY['Fortsett - rendre', 'Fortsett å rendre'],
    ARRAY['enklere - skjære', 'enklere å skjære'],
    ARRAY['mykt - håndtere', 'mykt å håndtere'],
    ARRAY['mykt - handtere', 'mykt å håndtere'],
    ARRAY['unng- trekk', 'unngå trekk'],
    ARRAY['osteh-vel', 'ostehøvel'],
    ARRAY['fårst om', 'først om'],
    ARRAY['fårst', 'først'],
    ARRAY['fårste', 'første'],
    ARRAY['får grilling', 'før grilling'],
    ARRAY['får oppskjæring', 'før oppskjæring'],
    ARRAY['får servering', 'før servering'],
    ARRAY['får skjæring', 'før skjæring'],
    ARRAY['fårste uken', 'første uken']
  ];
BEGIN
  IF out_text IS NULL THEN
    RETURN NULL;
  END IF;

  FOREACH pair SLICE 1 IN ARRAY replacements LOOP
    out_text := replace(out_text, pair[1], pair[2]);
  END LOOP;

  RETURN out_text;
END;
$$;

UPDATE recipes
SET
  title_no = public._repair_recipe_text(title_no),
  title_en = public._repair_recipe_text(title_en),
  intro_no = public._repair_recipe_text(intro_no),
  intro_en = public._repair_recipe_text(intro_en),
  ingredients_no = public._repair_recipe_text(ingredients_no::text)::jsonb,
  ingredients_en = public._repair_recipe_text(ingredients_en::text)::jsonb,
  steps_no = public._repair_recipe_text(steps_no::text)::jsonb,
  steps_en = public._repair_recipe_text(steps_en::text)::jsonb,
  tips_no = public._repair_recipe_text(tips_no),
  tips_en = public._repair_recipe_text(tips_en),
  mangalitsa_tip_no = public._repair_recipe_text(mangalitsa_tip_no),
  mangalitsa_tip_en = public._repair_recipe_text(mangalitsa_tip_en),
  updated_at = NOW()
WHERE active = true
  AND (
    title_no IS DISTINCT FROM public._repair_recipe_text(title_no)
    OR title_en IS DISTINCT FROM public._repair_recipe_text(title_en)
    OR intro_no IS DISTINCT FROM public._repair_recipe_text(intro_no)
    OR intro_en IS DISTINCT FROM public._repair_recipe_text(intro_en)
    OR ingredients_no::text IS DISTINCT FROM public._repair_recipe_text(ingredients_no::text)
    OR ingredients_en::text IS DISTINCT FROM public._repair_recipe_text(ingredients_en::text)
    OR steps_no::text IS DISTINCT FROM public._repair_recipe_text(steps_no::text)
    OR steps_en::text IS DISTINCT FROM public._repair_recipe_text(steps_en::text)
    OR tips_no IS DISTINCT FROM public._repair_recipe_text(tips_no)
    OR tips_en IS DISTINCT FROM public._repair_recipe_text(tips_en)
    OR mangalitsa_tip_no IS DISTINCT FROM public._repair_recipe_text(mangalitsa_tip_no)
    OR mangalitsa_tip_en IS DISTINCT FROM public._repair_recipe_text(mangalitsa_tip_en)
  );

DROP FUNCTION public._repair_recipe_text(text);
