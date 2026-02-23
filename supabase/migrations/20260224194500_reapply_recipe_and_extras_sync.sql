-- ============================================================================
-- Consolidated replay migration: recipes + extras sync
-- Date: 2026-02-24
-- Purpose: Ensure latest recipe/extras changes are applied even if prior
-- migrations with duplicate day-based version prefixes were skipped.
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Update presa recipe (pomegranate + leek sauce)
-- Source: supabase/migrations/20260223_update_presa_recipe_with_pomegranate_and_leek_sauce.sql
-- ----------------------------------------------------------------------------

-- ============================================================
-- Update presa recipe: add pomegranate and leek sauce
-- Date: 2026-02-23
-- ============================================================

UPDATE recipes
SET
  intro_no = 'Presa er det flate, rike stykket fra øvre skulderparti. Pannestekt med smør, urter, kremet purreløksaus og granateple for frisk syre og sødme.',
  intro_en = 'Presa is the flat, rich cut from the upper shoulder. Pan-seared with butter, herbs, creamy leek sauce, and pomegranate for fresh acidity and sweetness.',
  ingredients_no = '[
    {"amount": "2 stk", "item": "Mangalitsa-presa (ca. 200-250 g hver)"},
    {"amount": "2 ss", "item": "nøytral olje (solsikke eller rapsolje)"},
    {"amount": "50 g", "item": "smør"},
    {"amount": "4 stk", "item": "kvister fersk timian"},
    {"amount": "2 stk", "item": "kvister fersk rosmarin"},
    {"amount": "3 stk", "item": "fedd hvitløk, knust med skallet på"},
    {"amount": "1 stk", "item": "stor purreløk, finsnittet"},
    {"amount": "2 dl", "item": "kremfløte"},
    {"amount": "1 ts", "item": "Dijonsennep"},
    {"amount": "1 ts", "item": "sitronsaft"},
    {"amount": "1 stk", "item": "granateple, kjerner"},
    {"amount": "", "item": "flaksalt og ferskkvernet pepper"}
  ]'::jsonb,
  ingredients_en = '[
    {"amount": "2", "item": "Mangalitsa presa (about 200-250 g each)"},
    {"amount": "2 tbsp", "item": "neutral oil (sunflower or rapeseed)"},
    {"amount": "50 g", "item": "butter"},
    {"amount": "4", "item": "sprigs fresh thyme"},
    {"amount": "2", "item": "sprigs fresh rosemary"},
    {"amount": "3", "item": "garlic cloves, crushed with skin on"},
    {"amount": "1", "item": "large leek, finely sliced"},
    {"amount": "200 ml", "item": "heavy cream"},
    {"amount": "1 tsp", "item": "Dijon mustard"},
    {"amount": "1 tsp", "item": "lemon juice"},
    {"amount": "1", "item": "pomegranate, seeds"},
    {"amount": "", "item": "flaky salt and freshly cracked pepper"}
  ]'::jsonb,
  steps_no = '[
    "Ta presaen ut av kjøleskapet 30 minutter i forveien. Tørk grundig med kjøkkenpapir og krydre godt med salt og pepper på begge sider.",
    "Varm en tung jernpanne (eller stekepanne med tykk bunn) til den ryker lett. Tilsett olje.",
    "Legg presaen i pannen og stek uten å røre i 3-4 minutter til den har en mørk, gyllen skorpe.",
    "Snu kjøttet. Tilsett smør, timian, rosmarin og knust hvitløk. Når smøret skummer, vipp pannen og øs det aromatiske smøret over kjøttet med en skje. Gjenta i 2-3 minutter.",
    "Sjekk kjernetemperaturen: 58-60°C for medium rare, 62-63°C for medium. Presaen er tynn, så den går fort. Ta ut kjøttet og la det hvile 4-5 minutter på et skjærebrett.",
    "Mens kjøttet hviler: senk varmen til middels, tilsett finsnittet purreløk i samme panne og la den bli myk i 2-3 minutter. Rør inn kremfløte og Dijonsennep, og la sausen småkoke i 3-4 minutter til den tykner lett. Smak til med sitronsaft, salt og pepper.",
    "Skjær presa i 1 cm tykke skiver på skrå mot fibrene. Legg på fat, skje over purreløksausen, og topp med granateplekjerner rett før servering."
  ]'::jsonb,
  steps_en = '[
    "Remove the presa from the fridge 30 minutes ahead. Dry thoroughly with paper towels and season generously with salt and pepper on both sides.",
    "Heat a heavy cast iron pan (or thick-bottomed skillet) until lightly smoking. Add oil.",
    "Place the presa in the pan and cook without touching for 3-4 minutes until it has a dark, golden crust.",
    "Flip the meat. Add butter, thyme, rosemary, and crushed garlic. When the butter foams, tilt the pan and baste the meat with the aromatic butter using a spoon. Repeat for 2-3 minutes.",
    "Check core temperature: 58-60°C for medium rare, 62-63°C for medium. Presa is thin, so it cooks fast. Remove the meat and rest for 4-5 minutes on a cutting board.",
    "While the meat rests: reduce to medium heat, add the sliced leek to the same pan, and soften for 2-3 minutes. Stir in heavy cream and Dijon mustard, then simmer for 3-4 minutes until slightly thickened. Season with lemon juice, salt, and pepper.",
    "Slice the presa into 1 cm thick slices on the bias against the grain. Spoon over the leek sauce and finish with pomegranate seeds just before serving."
  ]'::jsonb,
  tips_no = 'Bruk steketermometer for perfekt resultat, og la kjøttet alltid hvile før oppskjæring. Granateple tilsettes helt til slutt for frisk tekstur og syre.',
  tips_en = 'Use a meat thermometer for precision, and always rest the meat before slicing. Add pomegranate at the end for fresh texture and acidity.',
  prep_time_minutes = 12,
  cook_time_minutes = 12,
  updated_at = NOW()
WHERE slug = 'presa-herbs';


-- ----------------------------------------------------------------------------
-- Update pork ribeye recipe (rosemary + garlic in pan)
-- Source: supabase/migrations/20260223_add_rosemary_to_pork_ribeye_pan_recipe.sql
-- ----------------------------------------------------------------------------

-- ============================================================
-- Update pork ribeye cast iron recipe:
-- add rosemary in pan cooking step
-- Date: 2026-02-23
-- ============================================================

UPDATE recipes
SET
  ingredients_no = '[
    {"amount": "2 stk", "item": "Mangalitsa svine-entrec\\u00f4te (ca. 250-300 g, 3 cm tykke)"},
    {"amount": "1 ss", "item": "n\\u00f8ytral olje med h\\u00f8yt r\\u00f8ykpunkt"},
    {"amount": "40 g", "item": "sm\\u00f8r"},
    {"amount": "2 stk", "item": "fedd hvitl\\u00f8k, knust"},
    {"amount": "2 stk", "item": "kvister fersk rosmarin"},
    {"amount": "3 stk", "item": "kvister fersk timian"},
    {"amount": "", "item": "flaksalt og ferskkvernet sort pepper"}
  ]'::jsonb,
  ingredients_en = '[
    {"amount": "2", "item": "Mangalitsa pork ribeye steaks (about 250-300 g, 3 cm thick)"},
    {"amount": "1 tbsp", "item": "neutral oil with high smoke point"},
    {"amount": "40 g", "item": "butter"},
    {"amount": "2", "item": "garlic cloves, crushed"},
    {"amount": "2", "item": "sprigs fresh rosemary"},
    {"amount": "3", "item": "sprigs fresh thyme"},
    {"amount": "", "item": "flaky salt and freshly cracked black pepper"}
  ]'::jsonb,
  steps_no = '[
    "Ta biffene ut av kj\\u00f8leskapet 30 minutter i forveien. T\\u00f8rk godt med kj\\u00f8kkenpapir - fuktighet er fienden til god bruning. Krydre med salt og pepper.",
    "Varm en jernpanne p\\u00e5 h\\u00f8y varme til den akkurat begynner \\u00e5 ryke. Tilsett olje og fordel jevnt.",
    "Legg biffene forsiktig i pannen (bort fra deg for \\u00e5 unng\\u00e5 sprut). Stek i 3-4 minutter uten \\u00e5 r\\u00f8re - la Maillard-reaksjonen gj\\u00f8re jobben.",
    "Snu biffene. Skru ned til middels varme. Tilsett sm\\u00f8r, hvitl\\u00f8k, rosmarin og timian. N\\u00e5r sm\\u00f8ret skummer, vipp pannen og \\u00f8s det brunede sm\\u00f8ret over biffene med en skje. Bast i 3-4 minutter.",
    "Sjekk kjernetemperaturen: 60-63 C for en rosa, saftig kjerne. Mangalitsa t\\u00e5ler litt mer enn vanlig svineentrec\\u00f4te.",
    "Ta av varmen og la hvile i 5 minutter. \\u00d8s litt av pannesausen over.",
    "Skj\\u00e6r i 1 cm skiver og server med flaksalt og resten av urtesm\\u00f8ret fra pannen."
  ]'::jsonb,
  steps_en = '[
    "Remove the steaks from the fridge 30 minutes ahead. Pat dry thoroughly with paper towels - moisture is the enemy of a good sear. Season with salt and pepper.",
    "Heat a cast iron pan on high heat until it just begins to smoke. Add oil and swirl to coat evenly.",
    "Carefully place the steaks in the pan (away from you to avoid splatter). Cook for 3-4 minutes without touching - let the Maillard reaction do its work.",
    "Flip the steaks. Reduce to medium heat. Add butter, garlic, rosemary, and thyme. When the butter foams, tilt the pan and baste the steaks with the browned butter using a spoon. Baste for 3-4 minutes.",
    "Check the core temperature: 60-63 C for a pink, juicy center. Mangalitsa tolerates a bit more than regular pork ribeye.",
    "Remove from heat and rest for 5 minutes. Spoon some of the pan sauce over the top.",
    "Slice into 1 cm slices and serve with flaky salt and the remaining herb butter from the pan."
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'pork-ribeye-pan';


-- ----------------------------------------------------------------------------
-- Fix pancetta wording to buklist/svinebuk
-- Source: supabase/migrations/20260223_fix_pancetta_buklist_wording.sql
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- Fix rendered-lard image extension
-- Source: supabase/migrations/20260224_fix_rendered_lard_image_extension.sql
-- ----------------------------------------------------------------------------

-- ============================================================
-- Fix rendered-lard recipe image extension
-- Date: 2026-02-23
-- ============================================================

UPDATE recipes
SET image_url = '/recipes/rendered-lard.jpg',
    updated_at = NOW()
WHERE slug = 'rendered-lard';

-- ----------------------------------------------------------------------------
-- Add 12 Norwegian recipes (3 ribbe + 9 cuts)
-- Source: supabase/migrations/20260224_add_12_more_norwegian_recipes.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- Add 12 Norwegian-inspired recipes (3 ribbe + 9 additional unused cuts)
-- Date: 2026-02-24
-- ============================================================================

INSERT INTO recipes (
  slug, title_no, title_en,
  intro_no, intro_en,
  ingredients_no, ingredients_en,
  steps_no, steps_en,
  tips_no, tips_en,
  mangalitsa_tip_no, mangalitsa_tip_en,
  difficulty, prep_time_minutes, cook_time_minutes, servings,
  image_url, related_extra_slugs, display_order
) VALUES
-- 13) Ribbe - long and classic
(
  'ullgris-ribbe-langstekt',
  'Ullgris-ribbe langtidsstekt med sprø svor',
  'Slow-Roasted Wool Pig Ribbe with Crispy Crackling',
  'Klassisk norsk ribbemiddag med moderne temperaturkontroll. Lang steketid gir saftig kjøtt og sprø svor.',
  'Classic Norwegian ribbe dinner with modern temperature control. Long roasting gives juicy meat and crisp crackling.',
  '[
    {"amount":"2,5 kg","item":"ullgris-ribbe (hel side)"},
    {"amount":"2 ss","item":"flaksalt"},
    {"amount":"1 ss","item":"grovkvernet sort pepper"},
    {"amount":"3 dl","item":"vann"}
  ]',
  '[
    {"amount":"2.5 kg","item":"wool pig ribbe (whole side)"},
    {"amount":"2 tbsp","item":"flaky salt"},
    {"amount":"1 tbsp","item":"coarsely ground black pepper"},
    {"amount":"300 ml","item":"water"}
  ]',
  '[
    "Rut svoren med skarp kniv ned til, men ikke gjennom, fettlaget.",
    "Gni inn salt og pepper godt mellom rutene. Sett kaldt over natten.",
    "Legg ribba i langpanne med svoren opp. Hell vann i bunnen.",
    "Dekk med folie og stek på 125°C i 3 timer.",
    "Ta av folien og øk til 220°C. Stek videre 20-30 minutter til svoren bobler.",
    "Flytt eventuelt ribba høyere i ovnen de siste minuttene for jevn sprø svor.",
    "La hvile i 15 minutter før oppskjæring.",
    "Server med klassisk norsk tilbehør."
  ]',
  '[
    "Score the crackling down to, but not through, the fat layer.",
    "Rub salt and pepper thoroughly between the cuts. Chill overnight.",
    "Place ribbe in a roasting tray crackling-side up. Add water to the tray.",
    "Cover with foil and roast at 125°C for 3 hours.",
    "Remove foil and increase to 220°C. Roast 20-30 minutes until crackling puffs.",
    "Move the tray higher for the final minutes if needed for even crackling.",
    "Rest for 15 minutes before slicing.",
    "Serve with classic Norwegian sides."
  ]',
  'Legg små biter aluminiumsfolie under de laveste delene av ribba for å få svoren helt jevn.',
  'Use small foil balls under lower parts of the ribbe to level the crackling surface.',
  'Ullgris-ribbe har mer fett enn vanlig ribbe. Lav temperatur lenge gjør at fettet smelter sakte inn i kjøttet uten å tørke det ut.',
  'Wool pig ribbe carries more fat than standard ribbe. Low heat over time renders the fat gently into the meat without drying it out.',
  'medium', 20, 230, 6,
  '/recipes/tomahawk-grill.jpg',
  ARRAY['ekstra_ribbe'],
  13
),
-- 14) Ribbe - faster method
(
  'ullgris-ribbe-rask',
  'Ullgris-ribbe, raskere ovnsmetode',
  'Wool Pig Ribbe, Faster Oven Method',
  'Når du vil ha ribbe på hverdagsplan: høyere temperatur i kortere tid, men fortsatt sprø svor og saftig resultat.',
  'For a weeknight ribbe plan: higher heat for less time, still with crisp crackling and juicy meat.',
  '[
    {"amount":"1,8 kg","item":"ullgris-ribbe"},
    {"amount":"1,5 ss","item":"flaksalt"},
    {"amount":"1 ts","item":"sort pepper"},
    {"amount":"2 dl","item":"vann"}
  ]',
  '[
    {"amount":"1.8 kg","item":"wool pig ribbe"},
    {"amount":"1.5 tbsp","item":"flaky salt"},
    {"amount":"1 tsp","item":"black pepper"},
    {"amount":"200 ml","item":"water"}
  ]',
  '[
    "Rut svoren og krydre godt med salt og pepper.",
    "Legg ribba i form med vann i bunnen.",
    "Stek utildekket på 180°C i 80-90 minutter.",
    "Skru opp til 240°C de siste 10-15 minuttene for svor.",
    "Følg med tett så svoren ikke blir brent.",
    "La ribba hvile 10 minutter før servering."
  ]',
  '[
    "Score the crackling and season well with salt and pepper.",
    "Place ribbe in a tray with water in the bottom.",
    "Roast uncovered at 180°C for 80-90 minutes.",
    "Increase to 240°C for the final 10-15 minutes for crackling.",
    "Watch closely so the crackling does not burn.",
    "Rest 10 minutes before serving."
  ]',
  'Denne metoden passer best til mindre stykker ribbe under 2 kg.',
  'This method works best for smaller ribbe pieces under 2 kg.',
  'Det høye fettinnholdet i ullgris gjør at også raskere ribbe blir saftig, så lenge du ikke hopper over hviletid.',
  'The higher fat content of wool pig keeps even faster ribbe juicy, as long as you keep the resting time.',
  'easy', 15, 105, 4,
  '/recipes/tomahawk-grill.jpg',
  ARRAY['ekstra_ribbe'],
  14
),
-- 15) Ribbe - asian inspired
(
  'asiatisk-ribbe-glaze',
  'Asiatisk inspirert ullgris-ribbe med ingefærglasur',
  'Asian-Inspired Wool Pig Ribbe with Ginger Glaze',
  'Norsk ribbe møter asiatisk smak: soyasaus, ingefær, hvitløk og honning gir en blank, dyp glasur.',
  'Norwegian ribbe meets Asian flavors: soy sauce, ginger, garlic and honey create a glossy deep glaze.',
  '[
    {"amount":"2 kg","item":"ullgris-ribbe"},
    {"amount":"1 dl","item":"soyasaus"},
    {"amount":"3 ss","item":"honning"},
    {"amount":"2 ss","item":"riseddik"},
    {"amount":"2 ss","item":"revet ingefær"},
    {"amount":"3 fedd","item":"hvitløk, finrevet"},
    {"amount":"1 ts","item":"chiliflak"}
  ]',
  '[
    {"amount":"2 kg","item":"wool pig ribbe"},
    {"amount":"100 ml","item":"soy sauce"},
    {"amount":"3 tbsp","item":"honey"},
    {"amount":"2 tbsp","item":"rice vinegar"},
    {"amount":"2 tbsp","item":"grated ginger"},
    {"amount":"3 cloves","item":"garlic, finely grated"},
    {"amount":"1 tsp","item":"chili flakes"}
  ]',
  '[
    "Stek ribba på 140°C i 2,5 timer med litt vann i formen.",
    "Kok opp soyasaus, honning, eddik, ingefær, hvitløk og chili til lett tykk glasur.",
    "Pensle glasuren på ribba de siste 20 minuttene.",
    "Øk til 230°C siste 10 minutter for karamellisering.",
    "La hvile 10-15 minutter før du skjærer i biter."
  ]',
  '[
    "Roast ribbe at 140°C for 2.5 hours with a little water in the tray.",
    "Simmer soy sauce, honey, vinegar, ginger, garlic and chili into a light glaze.",
    "Brush glaze over ribbe during the final 20 minutes.",
    "Increase to 230°C for the last 10 minutes to caramelize.",
    "Rest 10-15 minutes before carving."
  ]',
  'Server med syrlig kålsalat og kokt ris for balanse.',
  'Serve with tangy cabbage slaw and steamed rice for balance.',
  'Ullgrisfett tåler kraftige smaker godt. Ingefær og syre kutter gjennom fettet uten å overdøve kjøttet.',
  'Wool pig fat handles bold flavors very well. Ginger and acidity cut through richness without masking the pork.',
  'medium', 20, 180, 6,
  '/recipes/secreto-plancha.jpg',
  ARRAY['ekstra_ribbe'],
  15
),
-- 16) Indrefilet
(
  'indrefilet-smor',
  'Indrefilet av ullgris med brunet smør og einebær',
  'Wool Pig Tenderloin with Brown Butter and Juniper',
  'En norsk skogsinspirert tallerken med einebær, timian og brunet smør.',
  'A Norwegian forest-inspired plate with juniper, thyme and brown butter.',
  '[
    {"amount":"700 g","item":"indrefilet av ullgris"},
    {"amount":"1 ss","item":"nøytral olje"},
    {"amount":"40 g","item":"smør"},
    {"amount":"1 ts","item":"knuste einebær"},
    {"amount":"2 kvister","item":"timian"},
    {"amount":"","item":"salt og pepper"}
  ]',
  '[
    {"amount":"700 g","item":"wool pig tenderloin"},
    {"amount":"1 tbsp","item":"neutral oil"},
    {"amount":"40 g","item":"butter"},
    {"amount":"1 tsp","item":"crushed juniper berries"},
    {"amount":"2 sprigs","item":"thyme"},
    {"amount":"","item":"salt and pepper"}
  ]',
  '[
    "Tørk fileten godt og krydre med salt og pepper.",
    "Brun raskt i varm panne med olje, ca. 2 minutter per side.",
    "Tilsett smør, einebær og timian. Øs smøret over kjøttet i 2 minutter.",
    "Stek videre til kjernetemperatur 60-62°C.",
    "La hvile 8 minutter før oppskjæring i skiver."
  ]',
  '[
    "Pat tenderloin dry and season with salt and pepper.",
    "Sear quickly in a hot pan with oil, about 2 minutes per side.",
    "Add butter, juniper and thyme. Baste for 2 minutes.",
    "Cook to a core temperature of 60-62°C.",
    "Rest 8 minutes before slicing."
  ]',
  'Brunet smør skal lukte nøtteaktig, ikke brent.',
  'Brown butter should smell nutty, not burnt.',
  'Indrefilet fra ullgris trenger kort steketid. Fettet holder kjøttet saftig selv ved høy overflatevarme.',
  'Tenderloin from wool pig needs short cook time. The fat keeps it juicy even with high surface heat.',
  'easy', 10, 12, 4,
  '/recipes/pork-ribeye-pan.jpg',
  ARRAY['indrefilet'],
  16
),
-- 17) Ytrefilet
(
  'ytrefilet-medaljonger',
  'Ytrefilet-medaljonger med steinsopp og persille',
  'Loin Medallions with Mushroom and Parsley',
  'En klassisk norsk-smakende panneoppskrift, rask nok til hverdagen.',
  'A classic Nordic pan recipe, quick enough for weekdays.',
  '[
    {"amount":"800 g","item":"ytrefilet av ullgris"},
    {"amount":"250 g","item":"sopp (helst steinsopp eller aromasopp)"},
    {"amount":"2 ss","item":"smør"},
    {"amount":"1 ss","item":"rapsolje"},
    {"amount":"2 ss","item":"finhakket persille"},
    {"amount":"","item":"salt og pepper"}
  ]',
  '[
    {"amount":"800 g","item":"wool pig loin fillet"},
    {"amount":"250 g","item":"mushrooms (porcini/chestnut preferred)"},
    {"amount":"2 tbsp","item":"butter"},
    {"amount":"1 tbsp","item":"rapeseed oil"},
    {"amount":"2 tbsp","item":"finely chopped parsley"},
    {"amount":"","item":"salt and pepper"}
  ]',
  '[
    "Skjær ytrefilet i medaljonger på 3 cm.",
    "Stek medaljongene raskt i olje, 2-3 minutter per side.",
    "Ta ut kjøttet, og stek sopp i samme panne med smør.",
    "Legg kjøttet tilbake, vend inn persille og smak til med salt/pepper.",
    "Server umiddelbart."
  ]',
  '[
    "Cut loin into 3 cm medallions.",
    "Sear quickly in oil, 2-3 minutes per side.",
    "Remove meat and cook mushrooms in the same pan with butter.",
    "Return meat, fold in parsley, and season to taste.",
    "Serve immediately."
  ]',
  'Stek soppen hardt nok til at væsken fordamper - da får du mer smak.',
  'Cook mushrooms hot enough to evaporate moisture for better flavor.',
  'Ytrefilet av ullgris har mer smak enn vanlig svin og tåler derfor enklere tilbehør.',
  'Wool pig loin has deeper flavor than standard pork, so it works beautifully with simple sides.',
  'easy', 12, 15, 4,
  '/recipes/presa-herbs.jpg',
  ARRAY['ytrefilet'],
  17
),
-- 18) Koteletter
(
  'koteletter-panne',
  'Svinekoteletter i panne med eple og løk',
  'Pan-Seared Pork Chops with Apple and Onion',
  'Husmannsinspirert klassiker med sødme fra eple og dybde fra stekt løk.',
  'A farmhouse-inspired classic with apple sweetness and deeply browned onion.',
  '[
    {"amount":"4 stk","item":"svinekoteletter av ullgris"},
    {"amount":"2 stk","item":"gule løk i skiver"},
    {"amount":"2 stk","item":"syrlige epler i båter"},
    {"amount":"1 ss","item":"smør"},
    {"amount":"1 ss","item":"rapsolje"},
    {"amount":"","item":"salt og pepper"}
  ]',
  '[
    {"amount":"4","item":"wool pig pork chops"},
    {"amount":"2","item":"yellow onions, sliced"},
    {"amount":"2","item":"tart apples, wedges"},
    {"amount":"1 tbsp","item":"butter"},
    {"amount":"1 tbsp","item":"rapeseed oil"},
    {"amount":"","item":"salt and pepper"}
  ]',
  '[
    "Krydre kotelettene med salt og pepper.",
    "Stek kotelettene 3-4 minutter per side i varm panne. Legg til side.",
    "Stek løk gyllen i samme panne, tilsett eplebåter siste 2 minutter.",
    "Legg kotelettene tilbake og varm alt sammen i 2 minutter.",
    "Server med poteter eller grov sennep."
  ]',
  '[
    "Season chops with salt and pepper.",
    "Sear chops 3-4 minutes per side in a hot pan. Set aside.",
    "Cook onion until golden in the same pan, add apples for the final 2 minutes.",
    "Return chops and warm everything for 2 minutes.",
    "Serve with potatoes or coarse mustard."
  ]',
  'Ikke stek kotelettene for lenge - de blir best ved 62-64°C kjernetemperatur.',
  'Do not overcook chops - best at 62-64°C core temperature.',
  'Fettkanten på ullgris-koteletter smelter sakte og gir naturlig stekefett til løk og eple.',
  'The fat edge on wool pig chops renders slowly and naturally flavors the onions and apples.',
  'easy', 10, 20, 4,
  '/recipes/neck-steak.jpg',
  ARRAY['koteletter'],
  18
),
-- 19) Bogsteik
(
  'bog-langtid',
  'Langtidsstekt bog med rotgrønnsaker',
  'Slow-Roasted Shoulder with Root Vegetables',
  'Tradisjonell søndagsstek med moderne presisjon og dyp kraftsmak.',
  'Traditional Sunday roast with modern precision and deep stock flavor.',
  '[
    {"amount":"2,2 kg","item":"bogsteik av ullgris"},
    {"amount":"4 stk","item":"gulrøtter, grove biter"},
    {"amount":"2 stk","item":"løk, delt i båter"},
    {"amount":"4 fedd","item":"hvitløk"},
    {"amount":"5 dl","item":"kraft eller vann"},
    {"amount":"","item":"salt, pepper og timian"}
  ]',
  '[
    {"amount":"2.2 kg","item":"wool pig shoulder roast"},
    {"amount":"4","item":"carrots, chunky pieces"},
    {"amount":"2","item":"onions, wedges"},
    {"amount":"4 cloves","item":"garlic"},
    {"amount":"500 ml","item":"stock or water"},
    {"amount":"","item":"salt, pepper and thyme"}
  ]',
  '[
    "Krydre steken godt. Brun den raskt i gryte.",
    "Legg i grønnsaker og hell over kraft.",
    "Stek under lokk i ovn på 140°C i 4 timer.",
    "Ta av lokket siste 30 minutter for mer stekeskorpe.",
    "La hvile 15 minutter og skjær i skiver."
  ]',
  '[
    "Season roast generously. Brown quickly in a heavy pot.",
    "Add vegetables and pour over stock.",
    "Roast covered at 140°C for 4 hours.",
    "Remove lid for the final 30 minutes for extra crust.",
    "Rest 15 minutes and slice."
  ]',
  'Sil kraften i gryta og kok den inn til en enkel sjy.',
  'Strain and reduce the liquid for a simple pan gravy.',
  'Bog fra ullgris har mye bindevev og fett, som gjør den perfekt til lang steking uten tørrhet.',
  'Wool pig shoulder has connective tissue and fat that make it ideal for long roasting without drying out.',
  'medium', 20, 260, 6,
  '/recipes/pancetta-project.jpg',
  ARRAY['bogsteik'],
  19
),
-- 20) Kjøttdeig
(
  'karbonader-husmann',
  'Karbonader av ullgris med stekt løk',
  'Wool Pig Patties with Fried Onion',
  'Gammeldags karbonader, men saftigere og rikere takket være ullgrisfett.',
  'Old-school pork patties, juicier and richer thanks to wool pig fat.',
  '[
    {"amount":"800 g","item":"grov kjøttdeig av ullgris"},
    {"amount":"1 stk","item":"egg"},
    {"amount":"1 dl","item":"melk"},
    {"amount":"2 ss","item":"potetmel"},
    {"amount":"1 ts","item":"malt muskat"},
    {"amount":"2 stk","item":"løk i skiver"},
    {"amount":"","item":"salt og pepper"}
  ]',
  '[
    {"amount":"800 g","item":"coarse wool pig mince"},
    {"amount":"1","item":"egg"},
    {"amount":"100 ml","item":"milk"},
    {"amount":"2 tbsp","item":"potato starch"},
    {"amount":"1 tsp","item":"ground nutmeg"},
    {"amount":"2","item":"onions, sliced"},
    {"amount":"","item":"salt and pepper"}
  ]',
  '[
    "Rør sammen farse av kjøttdeig, egg, melk, potetmel og krydder.",
    "Form 8 karbonader med våte hender.",
    "Stek karbonadene gyldne i panne, 4-5 minutter per side.",
    "Stek løk myk og mørk gyllen i samme panne.",
    "Server karbonader med stekt løk og kokte poteter."
  ]',
  '[
    "Mix mince, egg, milk, potato starch and seasoning into a batter.",
    "Shape 8 patties with wet hands.",
    "Pan-fry until golden, 4-5 minutes per side.",
    "Cook onions soft and deeply golden in the same pan.",
    "Serve with fried onion and boiled potatoes."
  ]',
  'La farsen hvile 10 minutter før steking for bedre binding.',
  'Rest the meat mix for 10 minutes before frying for better binding.',
  'Fettet i ullgris-kjøttdeig gjør karbonadene ekstra saftige uten behov for mye ekstra fett i panna.',
  'The fat in wool pig mince makes patties extra juicy without much added fat in the pan.',
  'easy', 15, 20, 4,
  '/recipes/pork-ribeye-pan.jpg',
  ARRAY['kjottdeig'],
  20
),
-- 21) Kjøttbiter
(
  'lapskaus-kjottbiter',
  'Brun lapskaus med ullgris-kjøttbiter',
  'Brown Stew with Wool Pig Meat Cubes',
  'En norsk klassiker med dypere smak og mykere tekstur fra ullgris.',
  'A Norwegian classic with deeper flavor and softer texture from wool pig.',
  '[
    {"amount":"1,2 kg","item":"ullgris-kjøttbiter til gryte"},
    {"amount":"6 stk","item":"poteter i terninger"},
    {"amount":"3 stk","item":"gulrøtter i skiver"},
    {"amount":"1 stk","item":"purreløk i ringer"},
    {"amount":"1 liter","item":"kraft"},
    {"amount":"","item":"salt, pepper og laurbærblad"}
  ]',
  '[
    {"amount":"1.2 kg","item":"wool pig stew cubes"},
    {"amount":"6","item":"potatoes, diced"},
    {"amount":"3","item":"carrots, sliced"},
    {"amount":"1","item":"leek, rings"},
    {"amount":"1 litre","item":"stock"},
    {"amount":"","item":"salt, pepper and bay leaf"}
  ]',
  '[
    "Brun kjøttbitene i flere omganger i varm gryte.",
    "Tilsett kraft og laurbærblad. La småkoke 45 minutter.",
    "Ha i poteter og gulrot, kok videre 20 minutter.",
    "Tilsett purre de siste 5 minuttene.",
    "Smak til med salt og pepper før servering."
  ]',
  '[
    "Brown meat cubes in batches in a hot pot.",
    "Add stock and bay leaf. Simmer 45 minutes.",
    "Add potatoes and carrots, cook 20 more minutes.",
    "Add leek for the final 5 minutes.",
    "Season with salt and pepper before serving."
  ]',
  'Lapskausen blir enda bedre dagen etter - perfekt å lage stor porsjon.',
  'Stew tastes even better the next day - perfect for batch cooking.',
  'Ullgris-kjøttbiter holder seg saftige gjennom lang koketid og gir fyldig kraft.',
  'Wool pig stew cubes stay juicy through long simmering and give a rich broth.',
  'easy', 20, 75, 6,
  '/recipes/neck-steak.jpg',
  ARRAY['kjottbiter'],
  21
),
-- 22) Pølser
(
  'ullgris-polser-lok',
  'Stekte ullgris-pølser med løk og eplesennep',
  'Pan-Fried Wool Pig Sausages with Onion and Apple Mustard',
  'Norsk hverdagsmat oppgradert med søt løk, syrlig eple og grov sennep.',
  'Norwegian everyday food upgraded with sweet onion, tart apple and coarse mustard.',
  '[
    {"amount":"800 g","item":"ullgris-pølser"},
    {"amount":"2 stk","item":"løk i båter"},
    {"amount":"1 stk","item":"eple i terninger"},
    {"amount":"2 ss","item":"grov sennep"},
    {"amount":"1 ss","item":"smør"},
    {"amount":"","item":"pepper"}
  ]',
  '[
    {"amount":"800 g","item":"wool pig sausages"},
    {"amount":"2","item":"onions, wedges"},
    {"amount":"1","item":"apple, diced"},
    {"amount":"2 tbsp","item":"coarse mustard"},
    {"amount":"1 tbsp","item":"butter"},
    {"amount":"","item":"pepper"}
  ]',
  '[
    "Stek pølsene jevnt i panne til gjennomvarme og lett sprø overflate.",
    "Ta pølsene ut. Stek løk og eple i smør til mykt.",
    "Rør inn sennep og litt pepper.",
    "Legg pølsene tilbake i panna og vend sammen før servering."
  ]',
  '[
    "Pan-fry sausages evenly until hot through with a lightly crisp surface.",
    "Remove sausages. Cook onion and apple in butter until soft.",
    "Stir in mustard and pepper.",
    "Return sausages and toss together before serving."
  ]',
  'Trekk pølser i 70-80°C vann i 5 minutter før steking hvis du vil ha ekstra saftig resultat.',
  'Poach sausages at 70-80°C for 5 minutes before searing for extra juiciness.',
  'Ullgris-pølser inneholder mer smak i selve råvaren, så du trenger mindre krydder i panna.',
  'Wool pig sausages carry deeper natural flavor, so you need less added seasoning in the pan.',
  'easy', 10, 18, 4,
  '/recipes/presa-herbs.jpg',
  ARRAY['polser'],
  22
),
-- 23) Kamsteik
(
  'kamsteik-eple',
  'Kamsteik av ullgris med eple, løk og timian',
  'Wool Pig Roast with Apple, Onion and Thyme',
  'En modernisert versjon av norsk steikemiddag med sødme, syre og urter.',
  'A modernized Norwegian roast dinner with sweetness, acidity and herbs.',
  '[
    {"amount":"2 kg","item":"kamsteik av ullgris"},
    {"amount":"3 stk","item":"epler i båter"},
    {"amount":"2 stk","item":"løk i båter"},
    {"amount":"4 kvister","item":"timian"},
    {"amount":"4 dl","item":"kraft"},
    {"amount":"","item":"salt og pepper"}
  ]',
  '[
    {"amount":"2 kg","item":"wool pig neck/loin roast"},
    {"amount":"3","item":"apples, wedges"},
    {"amount":"2","item":"onions, wedges"},
    {"amount":"4 sprigs","item":"thyme"},
    {"amount":"400 ml","item":"stock"},
    {"amount":"","item":"salt and pepper"}
  ]',
  '[
    "Krydre steiken og brun den raskt på alle sider.",
    "Legg steiken i form med eple, løk, timian og kraft.",
    "Stek på 150°C i 2-2,5 timer til kjernetemperatur 68-70°C.",
    "La hvile 15 minutter før skiver.",
    "Kok inn stekesjyen til en enkel saus."
  ]',
  '[
    "Season roast and brown quickly on all sides.",
    "Place with apples, onions, thyme and stock in a tray.",
    "Roast at 150°C for 2-2.5 hours to 68-70°C core.",
    "Rest 15 minutes before slicing.",
    "Reduce pan juices into a simple sauce."
  ]',
  'Skjær tynne skiver på tvers av fibrene for mørest resultat.',
  'Slice thinly across the grain for best tenderness.',
  'Kamsteik fra ullgris har jevn marmorering som tåler både lang ovnstid og oppvarming dagen etter.',
  'Wool pig roast has even marbling that handles long oven time and reheating very well.',
  'medium', 20, 150, 6,
  '/recipes/neck-steak.jpg',
  ARRAY['kamsteik'],
  23
),
-- 24) Knoke
(
  'knoke-kraft',
  'Kraftkokt ullgris-knoke med rotgrønnsaker',
  'Braised Wool Pig Knuckle with Root Vegetables',
  'Tradisjonell norsk kraftgryte, modernisert med renere smak og tydeligere grønnsakstoner.',
  'Traditional Norwegian broth stew, modernized with cleaner flavor and brighter vegetables.',
  '[
    {"amount":"2 stk","item":"ullgris-knoker"},
    {"amount":"2 stk","item":"gulrøtter"},
    {"amount":"1 stk","item":"sellerirot, i terninger"},
    {"amount":"1 stk","item":"purreløk"},
    {"amount":"2 stk","item":"laurbærblad"},
    {"amount":"2 liter","item":"vann"},
    {"amount":"","item":"salt og pepper"}
  ]',
  '[
    {"amount":"2","item":"wool pig knuckles"},
    {"amount":"2","item":"carrots"},
    {"amount":"1","item":"celeriac, diced"},
    {"amount":"1","item":"leek"},
    {"amount":"2","item":"bay leaves"},
    {"amount":"2 litres","item":"water"},
    {"amount":"","item":"salt and pepper"}
  ]',
  '[
    "Skyll knokene og legg dem i stor gryte med vann og laurbær.",
    "Kok opp, skum av, og la småkoke i 2,5-3 timer.",
    "Tilsett grønnsakene siste 45 minutter.",
    "Ta ut knokene, plukk kjøttet av benet og legg tilbake i gryta.",
    "Smak til med salt og pepper og server rykende varm."
  ]',
  '[
    "Rinse knuckles and place in a large pot with water and bay leaves.",
    "Bring to a boil, skim, then simmer 2.5-3 hours.",
    "Add vegetables for the final 45 minutes.",
    "Remove knuckles, pick meat off the bone and return to the pot.",
    "Season to taste and serve piping hot."
  ]',
  'Sil kraften hvis du vil ha en klarere suppebase før kjøttet legges tilbake.',
  'Strain the stock if you want a clearer soup base before adding meat back.',
  'Knoke fra ullgris gir ekstra gelatinrik kraft som løfter både smak og munnfølelse.',
  'Wool pig knuckle gives extra gelatin-rich stock that boosts both flavor and mouthfeel.',
  'medium', 25, 190, 6,
  '/recipes/cure-ham.jpg',
  ARRAY['extra-knoke'],
  24
)
ON CONFLICT (slug) DO UPDATE SET
  title_no = EXCLUDED.title_no,
  title_en = EXCLUDED.title_en,
  intro_no = EXCLUDED.intro_no,
  intro_en = EXCLUDED.intro_en,
  ingredients_no = EXCLUDED.ingredients_no,
  ingredients_en = EXCLUDED.ingredients_en,
  steps_no = EXCLUDED.steps_no,
  steps_en = EXCLUDED.steps_en,
  tips_no = EXCLUDED.tips_no,
  tips_en = EXCLUDED.tips_en,
  mangalitsa_tip_no = EXCLUDED.mangalitsa_tip_no,
  mangalitsa_tip_en = EXCLUDED.mangalitsa_tip_en,
  difficulty = EXCLUDED.difficulty,
  prep_time_minutes = EXCLUDED.prep_time_minutes,
  cook_time_minutes = EXCLUDED.cook_time_minutes,
  servings = EXCLUDED.servings,
  image_url = EXCLUDED.image_url,
  related_extra_slugs = EXCLUDED.related_extra_slugs,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- Align recipe related extras
-- Source: supabase/migrations/20260224_align_recipe_related_extras.sql
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Sync extras recipe_suggestions to real slugs
-- Source: supabase/migrations/20260224_sync_extras_recipe_suggestions.sql
-- ----------------------------------------------------------------------------

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

