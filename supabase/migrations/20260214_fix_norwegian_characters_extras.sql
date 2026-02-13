-- Fix Norwegian characters (æ/ø/å) for Mangalitsa extras text.
-- Safe to run multiple times.

UPDATE extras_catalog
SET
  description_premium_no = 'Restaurantkutt med høy verdi per gram. Perfekt til carbonara og amatriciana.',
  recipe_suggestions = '[
    {"title_no":"Carbonara med guanciale","title_en":"Carbonara with guanciale","description_no":"Sprø, stekte biter med eggeplommer og pecorino","description_en":"Crisped cubes with egg yolks and pecorino","future_slug":"carbonara-guanciale"},
    {"title_no":"Amatriciana","title_en":"Amatriciana","description_no":"Tomat, chili og guanciale","description_en":"Tomato, chili and guanciale","future_slug":"amatriciana"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'extra-guanciale';

UPDATE extras_catalog
SET
  description_premium_no = 'Egner seg til speking som coppa eller tykke biffer på grill.',
  recipe_suggestions = '[
    {"title_no":"Coppa-prosjekt","title_en":"Coppa project","description_no":"Tørrsalting og langtidsmodning","description_en":"Dry curing and long maturation","future_slug":"coppa-project"},
    {"title_no":"Nakkebiff","title_en":"Neck steak","description_no":"Hard varme, rosa kjerne","description_en":"High heat, pink center","future_slug":"neck-steak"}
  ]'::jsonb,
  preparation_tips_no = 'Skjær tykt, stek hardt, hvil 5 minutter.',
  updated_at = NOW()
WHERE slug = 'extra-coppa';

UPDATE extras_catalog
SET
  description_no = 'Smakstette, skjulte muskler med mye intramuskulært fett.',
  description_premium_no = 'Dette er de mest ettertraktede små-kuttene på gris.',
  recipe_suggestions = '[
    {"title_no":"Secreto på plancha","title_en":"Secreto a la plancha","description_no":"2-3 min per side på hard varme","description_en":"2-3 min per side on high heat","future_slug":"secreto-plancha"},
    {"title_no":"Presa med urter","title_en":"Presa with herbs","description_no":"Rask steking og hvile","description_en":"Quick sear and rest","future_slug":"presa-herbs"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'extra-secreto-presa-pluma';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Lardo crostini","title_en":"Lardo crostini","description_no":"Tynne skiver på ristet brød","description_en":"Thin slices on toasted bread","future_slug":"lardo-crostini"},
    {"title_no":"Smeltet smult","title_en":"Rendered lard","description_no":"Langsom utsmelting til glass","description_en":"Slow render into jarred fat","future_slug":"rendered-lard"}
  ]'::jsonb,
  preparation_tips_no = 'Skjær tynt for servering eller smelt ned på lav varme.',
  updated_at = NOW()
WHERE slug = 'extra-spekk';

UPDATE extras_catalog
SET
  description_premium_no = 'Steakhouse-kutt med wow-effekt på fjøla.',
  recipe_suggestions = '[
    {"title_no":"Tomahawk på grill","title_en":"Tomahawk on grill","description_no":"Direkte + indirekte varme","description_en":"Direct + indirect heat","future_slug":"tomahawk-grill"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'extra-tomahawk';

UPDATE extras_catalog
SET
  name_no = 'Svine-entrecôte',
  description_no = 'Marmorerte biffer fra nakke/kam-området.',
  recipe_suggestions = '[
    {"title_no":"Entrecôte i panne","title_en":"Ribeye in pan","description_no":"Høy varme og rask hvile","description_en":"High heat and short rest","future_slug":"pork-ribeye-pan"}
  ]'::jsonb,
  preparation_tips_no = 'Stek 2-3 min per side på høy varme, hvil kort.',
  updated_at = NOW()
WHERE slug = 'extra-svine-entrecote';

UPDATE extras_catalog
SET
  preparation_tips_no = 'Hold fettkappen på under lagring for bedre resultat.',
  updated_at = NOW()
WHERE slug = 'extra-skinke-speking';

UPDATE extras_catalog
SET
  preparation_tips_no = 'Kok 4-6 timer for kraft, eller braiser til mørk tekstur.',
  updated_at = NOW()
WHERE slug = 'extra-knoke';

UPDATE extras_catalog
SET
  description_premium_no = 'Ren smak og høy varmebestandighet på kjøkkenet.',
  updated_at = NOW()
WHERE slug = 'extra-smult';

