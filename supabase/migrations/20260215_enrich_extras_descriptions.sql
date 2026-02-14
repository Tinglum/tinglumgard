-- Enrich the 7 original extras with premium descriptions, chef terms,
-- recipe suggestions, and preparation tips - matching the quality
-- of the 10 Mangalitsa special-cut extras added in 20260213.
-- Idempotent: safe to run multiple times.

-- 1) Kjøttdeig
UPDATE extras_catalog SET
  description_no = 'Grovmalt kjøttdeig fra Mangalitsa ullgris med høyere fettprosent enn vanlig svin. Saftigere, mer smak.',
  description_en = 'Coarsely ground Mangalitsa pork with higher fat than standard. Juicier, more flavor.',
  description_premium_no = 'Perfekt til kjøttboller, burgere og bolognese. Fettet smelter inn og gir dybde som vanlig kjøttdeig aldri kan.',
  description_premium_en = 'Ideal for meatballs, burgers and bolognese. The fat melts in and adds depth standard mince never achieves.',
  chef_term_no = 'Kjøttdeig (grovmalt)',
  chef_term_en = 'Ground pork (coarse)',
  recipe_suggestions = '[
    {"title_no":"Mangalitsa-kjøttboller","title_en":"Mangalitsa meatballs","description_no":"Saftige kjøttboller med brunet smør","description_en":"Juicy meatballs with browned butter","future_slug":"mangalitsa-kjoettboller"},
    {"title_no":"Hjemmelaget hamburger","title_en":"Homemade burger","description_no":"Grovmalt med syltet rødløk","description_en":"Coarse ground with pickled red onion","future_slug":"hjemmelaget-hamburger"}
  ]'::jsonb,
  preparation_tips_no = 'Ikke overarbeid deigen. Form løst, stek på middels varme. Fettet holder burgeren saftig.',
  preparation_tips_en = 'Don''t overwork the mince. Form loosely, cook on medium heat. The fat keeps it juicy.',
  updated_at = NOW()
WHERE slug = 'kjottdeig';

-- 2) Pølser
UPDATE extras_catalog SET
  description_no = 'Grillpølser og kokepølser av Mangalitsa ullgris. Kraftigere smak og saftigere enn standardpølser.',
  description_en = 'Grilling and cooking sausages from Mangalitsa woolly pig. Bolder flavor and juicier than standard.',
  description_premium_no = 'Laget med høyere fettprosent fra frittgående ullgris. Spretter aldri på grillen - bare saftig godhet.',
  description_premium_en = 'Made with higher fat from free-range woolly pig. Never burst on the grill - just juicy goodness.',
  chef_term_no = 'Grillpølse',
  chef_term_en = 'Sausage',
  recipe_suggestions = '[
    {"title_no":"Pølser på grill","title_en":"Sausages on grill","description_no":"Direkte varme, sprø skinn","description_en":"Direct heat, crispy casing","future_slug":"polser-pa-grill"},
    {"title_no":"Pølserett med potetmos","title_en":"Sausage with mashed potato","description_no":"Klassisk hverdagsmiddag","description_en":"Classic weeknight dinner","future_slug":"polserett"}
  ]'::jsonb,
  preparation_tips_no = 'Stek sakte på middels varme for jevn bruning. Ikke stikk hull - hold saften inne.',
  preparation_tips_en = 'Cook slowly on medium heat for even browning. Don''t pierce - keep the juices in.',
  updated_at = NOW()
WHERE slug = 'polser';

-- 3) Medisterpølse
UPDATE extras_catalog SET
  description_no = 'Klassisk medisterpølse av Mangalitsa ullgris. Rikere, fetere og mer smakfull enn vanlig medister.',
  description_en = 'Classic medister sausage from Mangalitsa woolly pig. Richer, fattier and more flavorful than standard.',
  description_premium_no = 'Tradisjonell norsk julemat, oppgradert med ullgris-fett. Perfekt til surkål og julemiddag.',
  description_premium_en = 'Traditional Norwegian Christmas food, upgraded with woolly pig fat. Perfect with sauerkraut and Christmas dinner.',
  chef_term_no = 'Medisterpølse',
  chef_term_en = 'Medister sausage',
  recipe_suggestions = '[
    {"title_no":"Medisterkaker","title_en":"Medister patties","description_no":"Stekes i smør, serveres med tyttebær og kål","description_en":"Pan-fried in butter, served with lingonberry and cabbage","future_slug":"medisterkaker"},
    {"title_no":"Medisterpølse til julemiddag","title_en":"Medister for Christmas dinner","description_no":"Tradisjonelt tilbehør til ribbe","description_en":"Traditional side for Christmas ribs","future_slug":"medisterpolse-julemiddag"}
  ]'::jsonb,
  preparation_tips_no = 'Stek i smør på middels varme, eller kok forsiktig i 20 minutter. Ikke for høy varme.',
  preparation_tips_en = 'Pan-fry in butter on medium heat, or simmer gently for 20 minutes. Avoid high heat.',
  updated_at = NOW()
WHERE slug = 'medisterpølse';

-- 4) Kamsteik / Svinesteik
UPDATE extras_catalog SET
  description_no = 'Saftig kamsteik fra nakke/kam-området. Naturlig marmorering gir ekstra smak og saftighet.',
  description_en = 'Juicy neck/loin roast. Natural marbling adds extra flavor and juiciness.',
  description_premium_no = 'Perfekt til langsteking i ovn med rotgrønnsaker. Mangalitsa-fettet smelter inn og gir dyp smak.',
  description_premium_en = 'Perfect for slow-roasting with root vegetables. Mangalitsa fat melts in and adds deep flavor.',
  chef_term_no = 'Kamsteik',
  chef_term_en = 'Neck roast',
  recipe_suggestions = '[
    {"title_no":"Langstekt kamsteik","title_en":"Slow-roasted neck roast","description_no":"4-5 timer i ovn med rotgrønnsaker","description_en":"4-5 hours in oven with root vegetables","future_slug":"langstekt-kamsteik"},
    {"title_no":"Pulled pork av kamsteik","title_en":"Pulled pork from neck roast","description_no":"Langsom tilberedning til mør, dratt tekstur","description_en":"Low and slow until fork-tender, shredded texture","future_slug":"pulled-pork-kamsteik"}
  ]'::jsonb,
  preparation_tips_no = 'Brun godt på alle sider først, deretter langstekt på 130°C i 4-5 timer.',
  preparation_tips_en = 'Sear well on all sides first, then slow-roast at 130°C for 4-5 hours.',
  updated_at = NOW()
WHERE slug = 'kamsteik';

-- 5) Kjøttbiter til gryteretter
UPDATE extras_catalog SET
  description_no = 'Saftige kjøttbiter fra bog og lår, perfekt til gryter, wok og langtidsretter.',
  description_en = 'Juicy meat cubes from shoulder and leg, perfect for stews, stir-fry and slow-cooked dishes.',
  description_premium_no = 'Bindevevet smelter under langsom tilberedning og gir rik, fyldig saus. Ideell til helgegryter.',
  description_premium_en = 'Connective tissue melts during slow cooking, creating rich, full-bodied sauce. Ideal for weekend stews.',
  chef_term_no = 'Grytekjøtt',
  chef_term_en = 'Stew meat',
  recipe_suggestions = '[
    {"title_no":"Mangalitsa-gryte","title_en":"Mangalitsa stew","description_no":"Langtidskokt med øl, løk og urter","description_en":"Slow-cooked with beer, onion and herbs","future_slug":"mangalitsa-gryte"},
    {"title_no":"Wok med svinekjøtt","title_en":"Pork stir-fry","description_no":"Rask wok med sesamolje og grønnsaker","description_en":"Quick stir-fry with sesame oil and vegetables","future_slug":"wok-med-svinekjott"}
  ]'::jsonb,
  preparation_tips_no = 'Brun bitene godt i små porsjoner. Kok sakte på lav varme - aldri la det koke hardt.',
  preparation_tips_en = 'Brown the cubes well in small batches. Simmer gently on low heat - never let it boil hard.',
  updated_at = NOW()
WHERE slug = 'kjottbiter';

-- 6) Hel svinekam
UPDATE extras_catalog SET
  description_no = 'Hel svinekam fra Mangalitsa ullgris. Stort, imponerende stykke perfekt til selskap og julemat.',
  description_en = 'Whole pork loin from Mangalitsa woolly pig. Large, impressive cut perfect for gatherings and Christmas.',
  description_premium_no = 'Mangalitsa-kam har jevnere fettfordeling og bedre svor enn vanlig gris. Julemiddagens hovedattraksjon.',
  description_premium_en = 'Mangalitsa loin has more even fat distribution and better crackling than standard. The Christmas dinner centerpiece.',
  chef_term_no = 'Svinekam',
  chef_term_en = 'Pork loin',
  recipe_suggestions = '[
    {"title_no":"Julekam med sprøtt svor","title_en":"Christmas loin with crispy crackling","description_no":"Langsom steking, sprøstekt svor på slutten","description_en":"Slow roasting, crispy crackling at the end","future_slug":"julekam"},
    {"title_no":"Svinekam i ovn","title_en":"Oven-roasted pork loin","description_no":"Med eplesaus og rødkål","description_en":"With apple sauce and red cabbage","future_slug":"svinekam-ovn"}
  ]'::jsonb,
  preparation_tips_no = 'Riss svoren med skarpt blad. Salt godt kvelden før. Stek på 180°C til kjernetemperatur 65°C.',
  preparation_tips_en = 'Score the rind with a sharp blade. Salt well the night before. Roast at 180°C to core temp 65°C.',
  updated_at = NOW()
WHERE slug = 'svinekam';

-- 7) Pinnekjøtt
UPDATE extras_catalog SET
  description_no = 'Tradisjonelt pinnekjøtt av Mangalitsa ullgris. Saltet og tørket ribbe med dypere smak enn vanlig.',
  description_en = 'Traditional salt-cured ribs from Mangalitsa woolly pig. Deeper flavor than standard pinnekjøtt.',
  description_premium_no = 'Mangalitsa-fettet gir pinnekjøttet en fyldigere, rikere smak. Vestlandets julemat - premium utgave.',
  description_premium_en = 'Mangalitsa fat gives pinnekjøtt a fuller, richer taste. Western Norway''s Christmas dish - premium edition.',
  chef_term_no = 'Pinnekjøtt',
  chef_term_en = 'Salt-cured ribs (pinnekjøtt)',
  recipe_suggestions = '[
    {"title_no":"Tradisjonelt pinnekjøtt","title_en":"Traditional pinnekjøtt","description_no":"Dampet over bjørkepinner med kålrotstappe","description_en":"Steamed over birch sticks with swede mash","future_slug":"tradisjonell-pinnekjott"},
    {"title_no":"Pinnekjøtt på grill","title_en":"Grilled pinnekjøtt","description_no":"Moderne vri: grillet etter damping","description_en":"Modern twist: grilled after steaming","future_slug":"pinnekjott-grill"}
  ]'::jsonb,
  preparation_tips_no = 'Bløtlegg 24-30 timer. Damp over bjørkepinner i 3-4 timer til kjøttet faller fra beinet.',
  preparation_tips_en = 'Soak 24-30 hours. Steam over birch sticks for 3-4 hours until meat falls off the bone.',
  updated_at = NOW()
WHERE slug = 'pinnekjøtt';

