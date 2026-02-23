-- ============================================================================
-- Replace "lapskaus-kjottbiter" recipe with Norwegian-style pulled pork
-- Date: 2026-02-25
-- ============================================================================

UPDATE recipes
SET
  title_no = 'Norsk pulled pork av ullgris med einebaer, eplemost og brunost',
  title_en = 'Norwegian Pulled Pork with Juniper, Apple Cider and Brown Cheese',
  intro_no = 'En norsk vri paa pulled pork: einebaer, eplemost, laurbaer og en lett brunostglaze gir dyp smak og saftig kjott.',
  intro_en = 'A Norwegian take on pulled pork: juniper, apple cider, bay leaf, and a light brown-cheese glaze give deep flavor and juicy meat.',
  ingredients_no = '[
    {"amount":"1,8 kg","item":"ullgris-kjottbiter (gjerne bog/grytekjott)"},
    {"amount":"2 stk","item":"gul lok, grovhakket"},
    {"amount":"4 fedd","item":"hvitlok, knust"},
    {"amount":"4 dl","item":"eplemost (usotet)"},
    {"amount":"3 dl","item":"kraft eller vann"},
    {"amount":"1 ss","item":"knuste einebaer"},
    {"amount":"2 stk","item":"laurbaerblad"},
    {"amount":"1 ts","item":"torket timian"},
    {"amount":"1 ss","item":"eplesidereddik"},
    {"amount":"40 g","item":"revet brunost"},
    {"amount":"","item":"salt og sort pepper"}
  ]'::jsonb,
  ingredients_en = '[
    {"amount":"1.8 kg","item":"wool pig stew/shoulder pieces"},
    {"amount":"2","item":"yellow onions, roughly chopped"},
    {"amount":"4 cloves","item":"garlic, crushed"},
    {"amount":"400 ml","item":"unsweetened apple cider"},
    {"amount":"300 ml","item":"stock or water"},
    {"amount":"1 tbsp","item":"crushed juniper berries"},
    {"amount":"2","item":"bay leaves"},
    {"amount":"1 tsp","item":"dried thyme"},
    {"amount":"1 tbsp","item":"apple cider vinegar"},
    {"amount":"40 g","item":"grated brown cheese"},
    {"amount":"","item":"salt and black pepper"}
  ]'::jsonb,
  steps_no = '[
    "Krydre kjottet med salt og pepper. Brun i omganger i varm gryte for god stekeskorpe.",
    "Tilsett lok, hvitlok, einebaer, timian og laurbaerblad. Hell over eplemost og kraft.",
    "Sett paa lokk og braiser i ovn paa 150 C i 2,5-3,5 timer, til kjottet lett kan trekkes fra hverandre.",
    "Ta kjottet ut og riv det med to gafler.",
    "Sil eller kok inn sjyen i gryta til fyldigere konsistens. Ror inn brunost og eplesidereddik.",
    "Vend det revne kjottet tilbake i sausen og smak til med salt/pepper.",
    "Server i briochebrod, potetlefse eller med rotgronnsakspure og syltet rodlok."
  ]'::jsonb,
  steps_en = '[
    "Season meat with salt and pepper. Brown in batches in a hot pot for a good crust.",
    "Add onion, garlic, juniper, thyme, and bay leaves. Pour in cider and stock.",
    "Cover and braise in the oven at 150 C for 2.5-3.5 hours, until the meat pulls apart easily.",
    "Remove meat and shred with two forks.",
    "Reduce the braising liquid to a richer consistency. Stir in brown cheese and cider vinegar.",
    "Return shredded meat to the sauce and season to taste.",
    "Serve in brioche buns, potato flatbread, or with root-veg puree and pickled red onion."
  ]'::jsonb,
  tips_no = 'Lag gjerne dagen i forveien. Smaken blir dypere over natten, og kjottet holder seg saftig ved oppvarming.',
  tips_en = 'Great to make a day ahead. Flavor deepens overnight and the meat reheats very well.',
  mangalitsa_tip_no = 'Ullgris har hoyere intramuskulaert fett og kollagen enn vanlig svin, noe som gir ekstra saftig og silkemyk pulled pork uten at kjottet blir tort.',
  mangalitsa_tip_en = 'Wool pig has higher intramuscular fat and collagen than standard pork, creating extra juicy, silky pulled pork without drying out.',
  difficulty = 'medium',
  prep_time_minutes = 25,
  cook_time_minutes = 210,
  servings = 6,
  related_extra_slugs = ARRAY['kjottbiter'],
  image_url = '/recipes/neck-steak.jpg',
  updated_at = NOW()
WHERE slug = 'lapskaus-kjottbiter';

UPDATE extras_catalog
SET
  recipe_suggestions = '[
    {"title_no":"Norsk pulled pork av ullgris","title_en":"Norwegian pulled pork from wool pig","description_no":"Einebaer, eplemost og brunostglaze","description_en":"Juniper, apple cider and brown-cheese glaze","future_slug":"lapskaus-kjottbiter"}
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'kjottbiter';
