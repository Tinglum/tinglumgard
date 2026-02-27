-- ============================================================================
-- Enrich all active recipes with sauce + side serving components
-- Date: 2026-02-27
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
  is_diy BOOLEAN;
  diy_slugs TEXT[] := ARRAY[
    'coppa-project',
    'lardo-crostini',
    'rendered-lard',
    'pancetta-project',
    'cure-ham'
  ];

  no_side_item TEXT;
  no_sauce_item TEXT;
  en_side_item TEXT;
  en_sauce_item TEXT;
  no_step_1 TEXT;
  no_step_2 TEXT;
  en_step_1 TEXT;
  en_step_2 TEXT;
  no_tip_append TEXT;
  en_tip_append TEXT;

  ingredients_no_new JSONB;
  ingredients_en_new JSONB;
  steps_no_new JSONB;
  steps_en_new JSONB;
  tips_no_new TEXT;
  tips_en_new TEXT;
BEGIN
  FOR rec IN
    SELECT id, slug, ingredients_no, ingredients_en, steps_no, steps_en, tips_no, tips_en
    FROM recipes
    WHERE active = true
  LOOP
    is_diy := rec.slug = ANY(diy_slugs);

    IF is_diy THEN
      no_side_item := 'serveringsforslag: surdeigsbrød eller knekkebrød';
      no_sauce_item := 'serveringsforslag: syrlige pickles og sennep/urtemajones';
      en_side_item := 'serving suggestion: sourdough bread or crispbread';
      en_sauce_item := 'serving suggestion: tangy pickles with mustard/herb mayo';
      no_step_1 := 'Ved servering: legg opp med brød eller knekkebrød, syrlige pickles og en passende saus.';
      no_step_2 := 'Dette gir en mer komplett servering som passer bildene og balanserer fettet.';
      en_step_1 := 'For serving: plate with bread or crispbread, tangy pickles, and a suitable sauce.';
      en_step_2 := 'This creates a fuller presentation that better matches the photos and balances richness.';
      no_tip_append := ' Serveringsforslag: Server tynne skiver med godt brød/knekkebrød, syrlige pickles og sennep eller urtemajones.';
      en_tip_append := ' Serving suggestion: Serve thin slices with good bread/crispbread, tangy pickles, and mustard or herb mayo.';
    ELSE
      no_side_item := 'serveringsforslag: poteter, salat eller ovnsbakte grønnsaker';
      no_sauce_item := 'serveringsforslag: saus/dressing (urtesmør, sjy eller yoghurtdressing)';
      en_side_item := 'serving suggestion: potatoes, salad, or roasted vegetables';
      en_sauce_item := 'serving suggestion: sauce/dressing (herb butter, pan jus, or yogurt dressing)';
      no_step_1 := 'Lag en rask saus/dressing parallelt (for eksempel urtesmør, sjy eller yoghurtdressing).';
      no_step_2 := 'Server med valgfritt tilbehør som poteter, salat eller ovnsbakte grønnsaker for en komplett tallerken.';
      en_step_1 := 'Make a quick sauce/dressing in parallel (for example herb butter, pan jus, or yogurt dressing).';
      en_step_2 := 'Serve with a side such as potatoes, salad, or roasted vegetables for a complete plated meal.';
      no_tip_append := ' Serveringsforslag: Server med en enkel grønn salat eller ovnsbakte grønnsaker, og en saus/dressing som passer retten (for eksempel urtesmør, vinaigrette eller yoghurtdressing).';
      en_tip_append := ' Serving suggestion: Serve with a simple green salad or roasted vegetables, plus a matching sauce/dressing (for example herb butter, vinaigrette, or yogurt dressing).';
    END IF;

    ingredients_no_new := COALESCE(rec.ingredients_no, '[]'::jsonb);
    ingredients_en_new := COALESCE(rec.ingredients_en, '[]'::jsonb);
    steps_no_new := COALESCE(rec.steps_no, '[]'::jsonb);
    steps_en_new := COALESCE(rec.steps_en, '[]'::jsonb);
    tips_no_new := trim(regexp_replace(COALESCE(rec.tips_no, ''), '\s*Serveringsforslag:.*$', ''));
    tips_en_new := trim(regexp_replace(COALESCE(rec.tips_en, ''), '\s*Serving suggestion:.*$', ''));
    tips_en_new := trim(regexp_replace(tips_en_new, '\s*temp test\s*$', ''));

    tips_no_new := tips_no_new || no_tip_append;
    tips_en_new := tips_en_new || en_tip_append;

    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(ingredients_no_new) e
      WHERE e->>'item' = no_side_item
    ) THEN
      ingredients_no_new := ingredients_no_new || jsonb_build_array(
        jsonb_build_object('amount', 'valgfritt', 'item', no_side_item)
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(ingredients_no_new) e
      WHERE e->>'item' = no_sauce_item
    ) THEN
      ingredients_no_new := ingredients_no_new || jsonb_build_array(
        jsonb_build_object('amount', 'valgfritt', 'item', no_sauce_item)
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(ingredients_en_new) e
      WHERE e->>'item' = en_side_item
    ) THEN
      ingredients_en_new := ingredients_en_new || jsonb_build_array(
        jsonb_build_object('amount', 'optional', 'item', en_side_item)
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(ingredients_en_new) e
      WHERE e->>'item' = en_sauce_item
    ) THEN
      ingredients_en_new := ingredients_en_new || jsonb_build_array(
        jsonb_build_object('amount', 'optional', 'item', en_sauce_item)
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(steps_no_new) s
      WHERE s = no_step_1
    ) THEN
      steps_no_new := steps_no_new || to_jsonb(no_step_1);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(steps_no_new) s
      WHERE s = no_step_2
    ) THEN
      steps_no_new := steps_no_new || to_jsonb(no_step_2);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(steps_en_new) s
      WHERE s = en_step_1
    ) THEN
      steps_en_new := steps_en_new || to_jsonb(en_step_1);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(steps_en_new) s
      WHERE s = en_step_2
    ) THEN
      steps_en_new := steps_en_new || to_jsonb(en_step_2);
    END IF;

    UPDATE recipes
    SET
      ingredients_no = ingredients_no_new,
      ingredients_en = ingredients_en_new,
      steps_no = steps_no_new,
      steps_en = steps_en_new,
      tips_no = tips_no_new,
      tips_en = tips_en_new,
      updated_at = NOW()
    WHERE id = rec.id;
  END LOOP;
END $$;
