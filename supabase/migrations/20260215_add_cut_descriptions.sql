-- Add descriptions to all 26 cuts in cuts_catalog.
-- These descriptions appear in the oppdelingsplan page cards and diagram panel.
-- Idempotent: safe to run multiple times.

-- ═══ NAKKE (Neck) ═══

UPDATE cuts_catalog SET
  description_no = 'Kun to kinn per gris. Dyp smak og ekstrem marmorering — perfekt til carbonara, amatriciana eller confit.',
  description_en = 'Only two jowls per pig. Deep flavor and extreme marbling — perfect for carbonara, amatriciana or confit.'
WHERE slug = 'guanciale';

UPDATE cuts_catalog SET
  description_no = 'Grisens entrecôte med dyp marmorering. Kan serveres rosa. Perfekt til hard stek eller speking som coppa.',
  description_en = 'The pig''s ribeye with deep marbling. Can be served pink. Perfect for searing or curing as coppa.'
WHERE slug = 'nakkekam-coppa';

UPDATE cuts_catalog SET
  description_no = 'Små, skjulte kutt med ekstrem marmorering. Finnes mellom større muskelgrupper — svært begrenset.',
  description_en = 'Small, hidden cuts with extreme marbling. Found between larger muscle groups — very limited.'
WHERE slug = 'secreto-presa-pluma';

-- ═══ KOTELETTKAM (Loin) ═══

UPDATE cuts_catalog SET
  description_no = 'Det møreste kuttet fra ullgris. Lite fett men saftig tekstur. Kun én per gris — eksklusivt.',
  description_en = 'The most tender cut from woolly pig. Low fat but juicy texture. Only one per pig — exclusive.'
WHERE slug = 'indrefilet';

UPDATE cuts_catalog SET
  description_no = 'Tykke koteletter med langt bein og fettkappe. Steakhouse-kutt med wow-effekt på bordet.',
  description_en = 'Thick chops with long bone and fat cap. Steakhouse cut with serious wow-factor on the table.'
WHERE slug = 'tomahawk-kotelett';

UPDATE cuts_catalog SET
  description_no = 'Marmorerte biffer fra nakke/kam-området. Mye smak, mye saftighet — best med rosa kjerne.',
  description_en = 'Marbled steaks from the neck/loin area. Big flavor, big juiciness — best with a pink center.'
WHERE slug = 'svine-entrecote';

UPDATE cuts_catalog SET
  description_no = 'Tykke koteletter med fettkappe som holder smaken inne. Fettkappe er nøkkelen — ikke trim den bort.',
  description_en = 'Thick chops with a fat cap that locks in flavor. The fat cap is key — don''t trim it off.'
WHERE slug = 'koteletter-fettkappe';

UPDATE cuts_catalog SET
  description_no = 'Rent fett fra ryggen. Kan saltes og cures til lardo, eller smeltes ned til smult.',
  description_en = 'Pure fat from the back. Can be salted and cured into lardo, or rendered down to lard.'
WHERE slug = 'ryggspekk-lardo';

UPDATE cuts_catalog SET
  description_no = 'Mørt filétkutt fra ryggen. Magert men saftig, perfekt til rask steking eller medaljonger.',
  description_en = 'Tender loin fillet from the back. Lean but juicy, perfect for quick searing or medallions.'
WHERE slug = 'ytrefilet-ryggfilet';

UPDATE cuts_catalog SET
  description_no = 'Klassiske koteletter til hverdags. Allsidige og enkle å tilberede — stek, grill eller i ovn.',
  description_en = 'Classic everyday chops. Versatile and easy to prepare — pan-fry, grill or oven-roast.'
WHERE slug = 'svinekoteletter';

UPDATE cuts_catalog SET
  description_no = 'Hel svinekam med fettkappe. Perfekt til langsteking, julemiddag eller som imponerende stek til mange.',
  description_en = 'Whole pork loin with fat cap. Perfect for slow roasting, Christmas dinner, or a centerpiece roast.'
WHERE slug = 'svinekam';

UPDATE cuts_catalog SET
  description_no = 'Saftig steik fra kam/rygg-området. Allsidig stykke som kan langtidsstekes eller skjæres i tykke skiver.',
  description_en = 'Juicy roast from the loin/back area. Versatile cut that can be slow-roasted or sliced into thick steaks.'
WHERE slug = 'kamsteik';

-- ═══ RIBBESIDE (Belly / Ribs) ═══

UPDATE cuts_catalog SET
  description_no = 'Velg mellom familieribbe, tynnribbe, porchetta eller Butcher''s Choice. Hjertet av julematen og BBQ-kulturen.',
  description_en = 'Choose between family ribs, thin ribs, porchetta or Butcher''s Choice. The heart of Christmas dinner and BBQ culture.'
WHERE slug = 'ribbevalg';

UPDATE cuts_catalog SET
  description_no = 'Premium bacon med fettlag og dybde i smaken. Ideell til frokost, pasta eller som tilbehør.',
  description_en = 'Premium bacon with rich fat layers and deep flavor. Ideal for breakfast, pasta or as a side.'
WHERE slug = 'bacon';

UPDATE cuts_catalog SET
  description_no = 'Kokkefett/smult fra ullgris. Ren smak og høy varmebestandighet — hever alt du steker.',
  description_en = 'Cooking fat/lard from woolly pig. Clean flavor and high heat tolerance — elevates everything you fry.'
WHERE slug = 'kokkefett-smult';

UPDATE cuts_catalog SET
  description_no = 'Ekstra ribbe til julemiddag eller BBQ. Mangalitsa-ribbe har 3x mer fett enn vanlig — julen du husker.',
  description_en = 'Extra ribs for Christmas dinner or BBQ. Mangalitsa ribs have 3x more fat than standard — the Christmas you''ll remember.'
WHERE slug = 'ekstra-ribbe';

UPDATE cuts_catalog SET
  description_no = 'Tradisjonelt pinnekjøtt av ullgris. Saltet og tørket ribbe med dypere smak og mer saftighet.',
  description_en = 'Traditional salt-cured ribs (pinnekjøtt) from woolly pig. Deeper flavor and more juiciness.'
WHERE slug = 'pinnekjott';

UPDATE cuts_catalog SET
  description_no = 'Buklist med fettlag perfekt til hjemmelaget pancetta eller premium bacon.',
  description_en = 'Belly strip with fat layers, perfect for homemade pancetta or premium bacon.'
WHERE slug = 'bacon-sideflesk';

-- ═══ SVINEBOG (Shoulder) ═══

UPDATE cuts_catalog SET
  description_no = 'Perfekt til pulled pork, langsteking eller storsteiker. Mye bindevev gir mye smak — blir aldri tørt.',
  description_en = 'Perfect for pulled pork, slow roasting or large roasts. Lots of connective tissue means lots of flavor — never dries out.'
WHERE slug = 'bogstek';

UPDATE cuts_catalog SET
  description_no = 'Grovmalt kjøttdeig med høyere fettprosent. Saftigere og mer smak enn vanlig kjøttdeig.',
  description_en = 'Coarsely ground pork with higher fat content. Juicier and more flavor than standard ground pork.'
WHERE slug = 'kjottdeig-grov';

UPDATE cuts_catalog SET
  description_no = 'Saftige kjøttbiter fra bogen, perfekt til gryter, wok og langtidsretter.',
  description_en = 'Juicy meat cubes from the shoulder, perfect for stews, stir-fry and slow-cooked dishes.'
WHERE slug = 'gryte-stekekjott';

UPDATE cuts_catalog SET
  description_no = 'Premium pølse av ullgris med høyere fettprosent. Smaker kraftigere og holder seg saftig på grillen.',
  description_en = 'Premium sausage from woolly pig with higher fat content. Stronger flavor and stays juicy on the grill.'
WHERE slug = 'premium-polse';

UPDATE cuts_catalog SET
  description_no = 'BBQ-pølse med røkt smak og saftig kjerne. Laget for grillen — sprø utenpå, saftig inni.',
  description_en = 'BBQ sausage with smoky flavor and juicy center. Made for the grill — crispy outside, juicy inside.'
WHERE slug = 'bbq-polse';

UPDATE cuts_catalog SET
  description_no = 'Mangalitsa-medisterpølser med rikere, fetere smak. Tradisjonell julemat — premium utgave.',
  description_en = 'Mangalitsa medister sausages with richer, fattier flavor. Traditional Christmas food — premium edition.'
WHERE slug = 'medisterpolser';

UPDATE cuts_catalog SET
  description_no = 'Medisterfarse til medisterkaker og pølsefyll. Saftig og krydret, perfekt til julens klassikere.',
  description_en = 'Medister mince for patties and sausage filling. Juicy and seasoned, perfect for Christmas classics.'
WHERE slug = 'medisterfarse';

UPDATE cuts_catalog SET
  description_no = 'Julepølse krydret for den norske julebordet. Perfekt tilbehør til ribbe og pinnekjøtt.',
  description_en = 'Christmas sausage seasoned for the Norwegian Christmas table. Perfect side for ribs and pinnekjøtt.'
WHERE slug = 'julepolse';

-- ═══ KNOKE (Hock / Knuckle) ═══

UPDATE cuts_catalog SET
  description_no = 'Kraftbein med kollagen og gelatin. Gir dybde til supper, gryter og kraft — kok 4-6 timer.',
  description_en = 'Stock bone with collagen and gelatin. Adds depth to soups, stews and stock — simmer 4-6 hours.'
WHERE slug = 'knoke';

-- ═══ SKINKE (Ham) ═══

UPDATE cuts_catalog SET
  description_no = 'Stor skinke med fettkappe til speking eller langsteking. Mangalitsa-skinke er fetere og mer egnet til speking.',
  description_en = 'Large ham with fat cap for curing or slow-roasting. Mangalitsa ham is fattier and better suited for curing.'
WHERE slug = 'skinke-speking';

-- ═══ KNOKE extras ═══

UPDATE cuts_catalog SET
  description_no = 'Labber fulle av gelatin. Brukes til terrine, aspic eller tilsatt kraft for konsistens. For entusiaster og kokker.',
  description_en = 'Trotters full of gelatin. Used for terrine, aspic or added to stock for body. For enthusiasts and chefs.'
WHERE slug = 'labb';
