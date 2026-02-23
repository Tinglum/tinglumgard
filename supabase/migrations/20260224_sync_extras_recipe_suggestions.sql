-- ============================================================================
-- Sync extras recipe_suggestions to real, existing recipe slugs
-- Date: 2026-02-24
-- Purpose:
--   1) Remove stale/non-existing future_slug links
--   2) Connect legacy extras to the new Norwegian recipe set
-- ============================================================================

-- --------------------------------------------------------------------------
-- Premium special-cut extras (all links must resolve to existing recipes)
-- --------------------------------------------------------------------------
UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Carbonara med guanciale","title_en":"Carbonara with guanciale","description_no":"Klassisk romersk pasta","description_en":"Classic Roman pasta","future_slug":"carbonara-guanciale"},
    {"title_no":"Amatriciana","title_en":"Amatriciana","description_no":"Tomat, chili og guanciale","description_en":"Tomato, chili and guanciale","future_slug":"amatriciana"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'extra-guanciale';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Lag din egen coppa","title_en":"Make your own coppa","description_no":"Spekeprosjekt med nakkekam","description_en":"Curing project with neck collar","future_slug":"coppa-project"},
    {"title_no":"Nakkebiff på grill","title_en":"Grilled neck steaks","description_no":"Rask grilling med rosa kjerne","description_en":"Fast grilling with a pink center","future_slug":"neck-steak"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'extra-coppa';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Secreto på plancha","title_en":"Secreto a la plancha","description_no":"Brennheit stekeflate og kort steketid","description_en":"Screaming-hot surface and short cook time","future_slug":"secreto-plancha"},
    {"title_no":"Presa med urter og smør","title_en":"Presa with herbs and butter","description_no":"Urtesmør, hvitløk og perfekt hviletid","description_en":"Herb butter, garlic, and proper resting","future_slug":"presa-herbs"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'extra-secreto-presa-pluma';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Lardo crostini med honning","title_en":"Lardo crostini with honey","description_no":"Saltet ryggspekk i tynne skiver","description_en":"Cured back fat in thin slices","future_slug":"lardo-crostini"},
    {"title_no":"Hjemmelaget smult","title_en":"Homemade rendered lard","description_no":"Langsom utsmelting av fett","description_en":"Slow rendering of fat","future_slug":"rendered-lard"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'extra-spekk';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Tomahawk-kotelett på grill","title_en":"Grilled tomahawk chop","description_no":"To-soners grill og hviletid","description_en":"Two-zone grilling and resting","future_slug":"tomahawk-grill"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'extra-tomahawk';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Svine-entrecôte i jernpanne","title_en":"Pork ribeye in cast iron","description_no":"Smørbasting med urter og hvitløk","description_en":"Butter basting with herbs and garlic","future_slug":"pork-ribeye-pan"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'extra-svine-entrecote';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Lag din egen pancetta","title_en":"Make your own pancetta","description_no":"Buklist saltet og hengt til modning","description_en":"Belly strip cured and hung to mature","future_slug":"pancetta-project"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'extra-pancetta';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Lag din egen spekeskinke","title_en":"Make your own dry-cured ham","description_no":"Lang modning av hel skinke","description_en":"Long aging of whole ham","future_slug":"cure-ham"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'extra-skinke-speking';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Kraftkokt ullgris-knoke","title_en":"Braised wool pig knuckle","description_no":"Langkokt kraft med rotgrønnsaker","description_en":"Long-simmered broth with root vegetables","future_slug":"knoke-kraft"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'extra-knoke';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Hjemmelaget smult","title_en":"Homemade rendered lard","description_no":"Smelt ut fett til matlaging","description_en":"Render fat for cooking","future_slug":"rendered-lard"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'extra-smult';

-- --------------------------------------------------------------------------
-- Legacy extras connected to new recipe slugs
-- --------------------------------------------------------------------------
UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Indrefilet med brunet smør","title_en":"Tenderloin with brown butter","description_no":"Rask panneoppskrift med einebær","description_en":"Quick pan recipe with juniper","future_slug":"indrefilet-smor"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'indrefilet';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Ytrefilet-medaljonger","title_en":"Loin medallions","description_no":"Steinsopp og persille i panna","description_en":"Mushrooms and parsley in the pan","future_slug":"ytrefilet-medaljonger"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'ytrefilet';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Koteletter i panne med eple","title_en":"Pan-seared chops with apple","description_no":"Husmannsklassiker med moderne vri","description_en":"Farmhouse classic with a modern twist","future_slug":"koteletter-panne"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'koteletter';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Ullgris-ribbe langtidsstekt","title_en":"Slow-roasted wool pig ribbe","description_no":"Klassisk metode med sprø svor","description_en":"Classic method with crispy crackling","future_slug":"ullgris-ribbe-langstekt"},
    {"title_no":"Ullgris-ribbe raskere metode","title_en":"Wool pig ribbe faster method","description_no":"Kortere ovnstid, fortsatt sprø svor","description_en":"Shorter oven time, still crisp crackling","future_slug":"ullgris-ribbe-rask"},
    {"title_no":"Asiatisk ullgris-ribbe","title_en":"Asian-inspired wool pig ribbe","description_no":"Ingefærglasur og karamellisering","description_en":"Ginger glaze and caramelization","future_slug":"asiatisk-ribbe-glaze"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'ekstra_ribbe';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Lag din egen pancetta","title_en":"Make your own pancetta","description_no":"Tradisjonell modning av buklist","description_en":"Traditional belly curing","future_slug":"pancetta-project"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'bacon';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Lag din egen spekeskinke","title_en":"Make your own dry-cured ham","description_no":"Langtidsmodning av hel skinke","description_en":"Long curing of whole ham","future_slug":"cure-ham"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'spekeskinke';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Bog langtidsstekt med rotgrønnsaker","title_en":"Slow-roasted shoulder with root vegetables","description_no":"Søndagsmiddag med moderne teknikk","description_en":"Sunday roast with modern technique","future_slug":"bog-langtid"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'bogsteik';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Kraftkokt ullgris-knoke","title_en":"Braised wool pig knuckle","description_no":"Tradisjonskraft med rotgrønnsaker","description_en":"Traditional broth with root vegetables","future_slug":"knoke-kraft"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'svinelabb';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Karbonader av ullgris","title_en":"Wool pig patties","description_no":"Klassisk med stekt løk","description_en":"Classic patties with fried onion","future_slug":"karbonader-husmann"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'kjottdeig';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Stekte ullgris-pølser med løk","title_en":"Pan-fried wool pig sausages with onion","description_no":"Hverdagsmat med eple og sennep","description_en":"Weeknight dish with apple and mustard","future_slug":"ullgris-polser-lok"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'polser';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Kamsteik med eple og timian","title_en":"Roast with apple and thyme","description_no":"Norsk steikemiddag med moderne vri","description_en":"Norwegian roast dinner with a modern twist","future_slug":"kamsteik-eple"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'kamsteik';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Brun lapskaus med ullgris","title_en":"Brown stew with wool pig","description_no":"Tradisjonell gryte med kjøttbiter","description_en":"Traditional stew with meat cubes","future_slug":"lapskaus-kjottbiter"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'kjottbiter';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Kamsteik med eple og timian","title_en":"Roast with apple and thyme","description_no":"Norsk steikemiddag med moderne vri","description_en":"Norwegian roast dinner with a modern twist","future_slug":"kamsteik-eple"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'svinekam';

-- Keep these active extras without broken links until dedicated recipes are added.
UPDATE extras_catalog
SET
  recipe_suggestions = '[]'::jsonb,
  updated_at = NOW()
WHERE slug IN ('pinnekjøtt', 'pinnekjott', 'pinnekjÃ¸tt', 'medisterpølse', 'medisterpÃ¸lse', 'medisterpÃƒÂ¸lse');
