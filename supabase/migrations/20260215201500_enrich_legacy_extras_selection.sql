-- Enrich legacy extras (from the original 8-item extras list) with premium copy,
-- chef terms, recipe suggestions and preparation tips.
-- Idempotent: safe to run multiple times.

-- Indrefilet
UPDATE extras_catalog SET
  description_no = 'Møreste stykket fra ullgris. Lite, eksklusivt og raskt å tilberede.',
  description_en = 'The most tender cut. Small, exclusive and quick to cook.',
  description_premium_no = 'Stek kort på høy varme, la hvile og server rosa. Dette er stykket du ikke overstekker.',
  description_premium_en = 'Sear briefly on high heat, rest, and serve pink. This is the cut you never overcook.',
  chef_term_no = 'Tenderloin',
  chef_term_en = 'Tenderloin',
  recipe_suggestions = '[
    {"title_no":"Indrefilet med smør","title_en":"Tenderloin with butter","description_no":"Rask steking og hvile","description_en":"Quick sear and rest","future_slug":"indrefilet-smor"},
    {"title_no":"Helstekt indrefilet","title_en":"Roasted tenderloin","description_no":"Lav varme, rosa kjerne","description_en":"Low heat, pink center","future_slug":"helstekt-indrefilet"}
  ]'::jsonb,
  preparation_tips_no = 'Tørk kjøttet godt, salt rett før steking. Stek 2-3 min per side og hvil i 5 min.',
  preparation_tips_en = 'Pat dry, salt just before searing. Sear 2-3 min per side and rest 5 min.',
  updated_at = NOW()
WHERE slug = 'indrefilet';

-- Ytrefilet / ryggfilet
UPDATE extras_catalog SET
  description_no = 'Saftig filet fra ryggen. Magert, men med nok fett til å holde seg mør.',
  description_en = 'Juicy loin fillet. Lean, yet tender with enough fat to stay moist.',
  description_premium_no = 'Perfekt som medaljonger eller rask stek. Server rosa for maksimal saftighet.',
  description_premium_en = 'Perfect as medallions or a quick sear. Serve pink for maximum juiciness.',
  chef_term_no = 'Loin fillet',
  chef_term_en = 'Loin fillet',
  recipe_suggestions = '[
    {"title_no":"Medaljonger i panne","title_en":"Pan-seared medallions","description_no":"Smør, hvitløk, urter","description_en":"Butter, garlic, herbs","future_slug":"ytrefilet-medaljonger"},
    {"title_no":"Rask helgestek","title_en":"Quick weekend roast","description_no":"Lav varme, kort stek","description_en":"Low heat, short cook","future_slug":"ytrefilet-helgestek"}
  ]'::jsonb,
  preparation_tips_no = 'Stek raskt på høy varme. Hvil alltid før du skjærer.',
  preparation_tips_en = 'Sear quickly on high heat. Always rest before slicing.',
  updated_at = NOW()
WHERE slug = 'ytrefilet';

-- Svinekoteletter
UPDATE extras_catalog SET
  description_no = 'Klassiske koteletter som tåler mer enn du tror. Best med rosa kjerne.',
  description_en = 'Classic chops that can handle more than you think. Best with a pink center.',
  description_premium_no = 'Mangalitsa-fettet gjør koteletter saftigere og mer tilgivende. Ikke trim bort fettkappen.',
  description_premium_en = 'Mangalitsa fat makes chops juicier and more forgiving. Don’t trim the fat cap.',
  chef_term_no = 'Chops',
  chef_term_en = 'Chops',
  recipe_suggestions = '[
    {"title_no":"Koteletter i panna","title_en":"Pan-fried chops","description_no":"Hard varme og hvile","description_en":"High heat and rest","future_slug":"koteletter-panne"},
    {"title_no":"Koteletter på grill","title_en":"Grilled chops","description_no":"Direkte + indirekte varme","description_en":"Direct + indirect heat","future_slug":"koteletter-grill"}
  ]'::jsonb,
  preparation_tips_no = 'Stek på hard varme til skorpe, flytt til lavere varme til 60-63°C. Hvil 5 min.',
  preparation_tips_en = 'Sear hard for crust, finish gently to 60-63°C. Rest 5 min.',
  updated_at = NOW()
WHERE slug = 'koteletter';

-- Ekstra ribbe
UPDATE extras_catalog SET
  description_no = 'Mer ribbe til jul eller BBQ. God balanse mellom kjøtt og fett.',
  description_en = 'More ribs for Christmas or BBQ. Great balance of meat and fat.',
  description_premium_no = 'Ullgris har mer fett enn vanlig gris. Gi ribba tid: lav varme lenge, sprø finish til slutt.',
  description_premium_en = 'Woolly pig has more fat than standard pork. Give it time: low and slow, crisp finish at the end.',
  chef_term_no = 'Ribs/Belly',
  chef_term_en = 'Ribs/Belly',
  recipe_suggestions = '[
    {"title_no":"Ribbe med sprø svor","title_en":"Crispy crackling ribs","description_no":"Lang tid, lav varme","description_en":"Low and slow","future_slug":"ribbe-spro-svor"},
    {"title_no":"BBQ ribs","title_en":"BBQ ribs","description_no":"Rub + ovn + glasering","description_en":"Rub + oven + glaze","future_slug":"bbq-ribs"}
  ]'::jsonb,
  preparation_tips_no = 'Stek 3-4 timer på 140°C. Skru opp varmen siste 10-15 min for sprø svor.',
  preparation_tips_en = 'Roast 3-4 hours at 140°C. Blast heat 10-15 min at the end for crackling.',
  updated_at = NOW()
WHERE slug = 'ekstra_ribbe';

-- Bacon / sideflesk
UPDATE extras_catalog SET
  description_no = 'Sideflesk med mye smak. Kan brukes ferskt eller til eget baconprosjekt.',
  description_en = 'Flavorful pork belly. Use fresh, or for a home bacon project.',
  description_premium_no = 'Dette er råvaren som gjør alt bedre: stek poteter i fettet, bruk i saus, eller lag din egen pancetta/bacon.',
  description_premium_en = 'This is the ingredient that upgrades everything: fry potatoes in the fat, use in sauces, or cure your own pancetta/bacon.',
  chef_term_no = 'Pancetta/Bacon',
  chef_term_en = 'Pancetta/Bacon',
  recipe_suggestions = '[
    {"title_no":"Lag din egen pancetta","title_en":"Make your own pancetta","description_no":"Salt, krydder og modning","description_en":"Salt, spice and cure","future_slug":"pancetta-prosjekt"},
    {"title_no":"Sprøstekt sideflesk","title_en":"Crispy pork belly","description_no":"Lav varme, sprø finish","description_en":"Low heat, crisp finish","future_slug":"sprosidemage"}
  ]'::jsonb,
  preparation_tips_no = 'Stek sakte på lav varme til fettet smelter og overflaten blir sprø. Salt til slutt.',
  preparation_tips_en = 'Cook slowly on low heat until fat renders and surface turns crisp. Salt at the end.',
  updated_at = NOW()
WHERE slug = 'bacon';

-- Spekeskinke (hel skinke / spekeprosjekt)
UPDATE extras_catalog SET
  description_no = 'Hel skinke med fettkappe, egnet for speking eller langsteking.',
  description_en = 'Whole ham with fat cap, suited for curing or slow roasting.',
  description_premium_no = 'Lag din egen spekeskinke. Fettkappen beskytter kjøttet under modning og gir en helt annen tekstur.',
  description_premium_en = 'Make your own cured ham. The fat cap protects the meat during ageing and gives a different texture.',
  chef_term_no = 'Prosciutto-style ham',
  chef_term_en = 'Prosciutto-style ham',
  recipe_suggestions = '[
    {"title_no":"Lag din egen spekeskinke","title_en":"Cure your own ham","description_no":"Salt og heng til modning","description_en":"Salt and hang to age","future_slug":"spekeskinke-prosjekt"}
  ]'::jsonb,
  preparation_tips_no = 'Til speking: salt 1 dag per kg, skyll av, tørk og heng til modning.',
  preparation_tips_en = 'For curing: salt 1 day per kg, rinse, dry, then hang to age.',
  updated_at = NOW()
WHERE slug = 'spekeskinke';

-- Bogsteik (pulled pork)
UPDATE extras_catalog SET
  description_no = 'Klassikeren til pulled pork og langtidssteking. Mye bindevev = mye smak.',
  description_en = 'The classic for pulled pork and long cooks. Lots of connective tissue = lots of flavor.',
  description_premium_no = 'Dette blir aldri tørt. Fettet smelter inn og gir dybde i kjøttet og sausen.',
  description_premium_en = 'This never dries out. The fat melts in and adds depth to meat and sauce.',
  chef_term_no = 'Shoulder',
  chef_term_en = 'Shoulder',
  recipe_suggestions = '[
    {"title_no":"Pulled pork","title_en":"Pulled pork","description_no":"Lav varme, lang tid","description_en":"Low and slow","future_slug":"pulled-pork"},
    {"title_no":"Langtidsstekt bog","title_en":"Slow-roasted shoulder","description_no":"Ovnsstekt til mør","description_en":"Oven-roasted until tender","future_slug":"bog-langtid"}
  ]'::jsonb,
  preparation_tips_no = 'Stek 6-8 timer på 120°C (eller røyk). Hvil 20 min før du river kjøttet.',
  preparation_tips_en = 'Cook 6-8 hours at 120°C (or smoke). Rest 20 min before shredding.',
  updated_at = NOW()
WHERE slug = 'bogsteik';

-- Svinelabb
UPDATE extras_catalog SET
  description_no = 'Gelatinrikt stykke som gir kraft og fylde. Perfekt til kraft, terrine eller suppe.',
  description_en = 'Gelatin-rich cut that adds body. Perfect for stock, terrine or soup.',
  description_premium_no = 'For entusiaster og kokker: dette er trikset for kraft som setter seg som gelé.',
  description_premium_en = 'For enthusiasts and chefs: the secret to stock that sets like jelly.',
  chef_term_no = 'Trotter',
  chef_term_en = 'Trotter',
  recipe_suggestions = '[
    {"title_no":"Kraft med labb","title_en":"Stock with trotters","description_no":"Kok lenge for gelatin","description_en":"Long simmer for gelatine","future_slug":"kraft-labb"}
  ]'::jsonb,
  preparation_tips_no = 'Kok 6-8 timer for gelatinrik kraft. Sil og avkjøl.',
  preparation_tips_en = 'Simmer 6-8 hours for gelatin-rich stock. Strain and chill.',
  updated_at = NOW()
WHERE slug = 'svinelabb';
