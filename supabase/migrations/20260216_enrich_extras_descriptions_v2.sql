-- Enrich ALL extras with detailed, informative descriptions.
-- Based on matprat.no oppdelingsguiden, Mangalitsa breed research,
-- and traditional Norwegian culinary terminology.

-- 1. GUANCIALE (Svinekinn)
UPDATE extras_catalog SET
  description_no = 'Svinekinn er kinnet og kjaken på grisen — et stykke med høy fettandel og en tynn stripe magert kjøtt gjennom midten. På Mangalitsa er kinnet ekstra rikt fordi rasen lagrer mer fett i hodet enn vanlig gris. Ca. 0,8–1,4 kg per stykk.',
  description_en = 'The jowl is the cheek and jaw of the pig — a cut with high fat content and a thin strip of lean meat running through the center. On Mangalitsa, the jowl is exceptionally rich because the breed stores more fat in the head than conventional pigs. Approx. 0.8–1.4 kg per piece.',
  description_premium_no = 'Dette er råvaren bak ekte guanciale — det italienske kinnspekkproduktet som gjør carbonara og amatriciana til noe helt annet enn med bacon. Mangalitsa-fettet har en smøraktig mykhet og smelter ved lavere temperatur, noe som gir sprøere resultat og dypere smak. Kun to kinn per gris.',
  description_premium_en = 'This is the raw material behind real guanciale — the Italian cured jowl that makes carbonara and amatriciana something entirely different from bacon. Mangalitsa fat has a buttery softness and melts at lower temperature, giving crispier results and deeper flavour. Only two jowls per pig.',
  preparation_tips_no = 'Tørrsalt med grovt salt, pepper og rosmarin i 2–3 uker for klassisk guanciale. Eller skjær i tynne skiver og stek sprøtt på middels varme — bruk det utsmeltede fettet som base for pasta-saus. Aldri kast fettet.',
  preparation_tips_en = 'Dry-cure with coarse salt, pepper and rosemary for 2–3 weeks for classic guanciale. Or slice thin and fry crispy on medium heat — use the rendered fat as base for pasta sauce. Never discard the fat.',
  updated_at = NOW()
WHERE slug = 'extra-guanciale';

-- 2. COPPA (Nakkekam)
UPDATE extras_catalog SET
  description_no = 'Nakkekam sitter i overgangen mellom hodet og ryggen — den øvre delen av nakken, bak øret. Dette er en av de mest marmorerte musklene på grisen, med fettårer som løper gjennom hele stykket. Mangalitsa-nakke har ekstraordinær marmorering som minner om wagyu-storfe. Ca. 1,2–2,0 kg per stykk.',
  description_en = 'The neck collar sits in the transition between head and back — the upper neck, behind the ear. This is one of the most marbled muscles on the pig, with fat veins running throughout. Mangalitsa neck has extraordinary marbling reminiscent of wagyu beef. Approx. 1.2–2.0 kg per piece.',
  description_premium_no = 'Nakkekam fra Mangalitsa er perfekt for to ting: tørrspeking til coppa (italiensk spekekjøtt som modnes i 3–6 måneder), eller tykke biffer på grill. Fettkappen smelter nedover kjøttet under steking og holder alt saftig. Nakken tåler høy varme uten å bli tørr — det er umulig å ødelegge dette stykket.',
  description_premium_en = 'Mangalitsa neck collar is perfect for two things: dry-curing into coppa (Italian charcuterie aged 3–6 months), or thick steaks on the grill. The fat cap melts down over the meat during cooking, keeping everything juicy. The neck tolerates high heat without drying out — it is impossible to ruin this cut.',
  preparation_tips_no = 'Til speking: bein ut, saltes 1 dag per kg, krydres med pepper og fennikel, rulles og henges i 3–6 mnd. Til grilling: skjær 3–4 cm tykke biffer, grill 4–5 min per side på direkte varme. Hvil 5 minutter. Servér med grov salt.',
  preparation_tips_en = 'For curing: bone out, salt 1 day per kg, season with pepper and fennel, roll and hang 3–6 months. For grilling: cut 3–4 cm thick steaks, grill 4–5 min per side on direct heat. Rest 5 minutes. Serve with coarse salt.',
  updated_at = NOW()
WHERE slug = 'extra-coppa';

-- 3. SLAKTERENS HEMMELIGHET (Secreto/Presa/Pluma)
UPDATE extras_catalog SET
  description_no = 'Tre skjulte spesialstykker som krever en slakter som vet hva han leter etter. Secreto er en flat, vifteformet muskel gjemt mellom bogbladet og ryggen — navnet betyr «hemmeligheten» fordi den er usynlig utenfra. Presa sitter like under nakken, en oval muskel med perfekt balanse mellom fett og kjøtt. Pluma er den lille trekantstykket ytterst på kammen, der indrefileten begynner. Ca. 0,7–1,2 kg samlet per pakke.',
  description_en = 'Three hidden specialty cuts that require a butcher who knows what to look for. Secreto is a flat, fan-shaped muscle hidden between the shoulder blade and back — the name means "the secret" because it is invisible from the outside. Presa sits just below the neck, an oval muscle with perfect balance of fat and meat. Pluma is the small triangular piece at the far end of the loin where the tenderloin begins. Approx. 0.7–1.2 kg combined per package.',
  description_premium_no = 'Disse stykkene har den høyeste andelen intramuskulært fett på hele grisen — på Mangalitsa er marmoreringen så intens at kjøttet nesten ser ut som wagyu. De er berømte fra iberisk gris i Spania, men fungerer like godt fra norsk ullgris. Kun to sett per dyr. Stykker som dette er grunnen til at kokker velger Mangalitsa.',
  description_premium_en = 'These cuts have the highest proportion of intramuscular fat on the entire pig — on Mangalitsa, the marbling is so intense the meat almost resembles wagyu. Famous from Iberian pigs in Spain, they work equally well from Norwegian woolly pig. Only two sets per animal. Cuts like these are why chefs choose Mangalitsa.',
  preparation_tips_no = 'Alle tre stykkene stekes raskt på svært høy varme — 2–3 minutter per side, ikke mer. Tenk som en tynn biff. Kjøttet skal ha rosa kjerne. Hvil i 3 minutter og skjær i tynne skiver på skrå. Salt og litt god olivenolje er alt som trengs. Ikke overkok — fettet gjør jobben.',
  preparation_tips_en = 'All three cuts are cooked quickly over very high heat — 2–3 minutes per side, no more. Think of them as thin steaks. The meat should have a pink centre. Rest 3 minutes and slice thin on the bias. Salt and good olive oil is all you need. Do not overcook — the fat does the work.',
  updated_at = NOW()
WHERE slug = 'extra-secreto-presa-pluma';

-- 4. RYGGSPEKK (Lardo)
UPDATE extras_catalog SET
  description_no = 'Ryggspekk er det tykke, rene fettlaget som sitter langs ryggraden på grisen. På Mangalitsa er dette laget ofte 3–8 cm tykt — mye tykkere enn vanlig gris. Fettet er kremhvitt, fast i konsistens og har en mild, ren smak uten den «talg»-følelsen mange forbinder med dyrefett.',
  description_en = 'Back fat is the thick, pure fat layer running along the pig''s spine. On Mangalitsa, this layer is often 3–8 cm thick — much thicker than conventional pigs. The fat is cream-white, firm in texture and has a mild, clean taste without the tallowy feel many associate with animal fat.',
  description_premium_no = 'Mangalitsa-ryggspekk har en unik fettsyresammensetning med over 60 % enumettede fettsyrer — sammenlignbart med olivenolje. Dette gjør at det smelter i munnen, ikke klistrer seg til ganen. Tynne skiver på varmt brød er en opplevelse. Perfekt for klassisk italiensk lardo: saltet og modnet med urter i 3–6 uker.',
  description_premium_en = 'Mangalitsa back fat has a unique fatty acid composition with over 60% monounsaturated fatty acids — comparable to olive oil. This means it melts on the tongue rather than coating the palate. Thin slices on warm bread is an experience. Perfect for classic Italian lardo: cured with herbs for 3–6 weeks.',
  preparation_tips_no = 'Til lardo: gni inn med grovt salt, rosmarin, hvitløk og svart pepper. Legg i vakuum eller steinkar, kjøl i 3–6 uker. Skjær papiertynne skiver. Til stekefett: smelt på lav varme i 2–3 timer, sil og oppbevar på glass. Holder seg måneder i kjøleskap.',
  preparation_tips_en = 'For lardo: rub with coarse salt, rosemary, garlic and black pepper. Vacuum seal or place in stone crock, cure 3–6 weeks. Slice paper-thin. For cooking fat: render on low heat for 2–3 hours, strain and store in jars. Keeps for months in the fridge.',
  updated_at = NOW()
WHERE slug = 'extra-spekk';

-- 5. TOMAHAWK-KOTELETT
UPDATE extras_catalog SET
  description_no = 'Tomahawk er en tykk kotelett skåret fra kammen (svinekam/kotelettkam) med det lange ribbeinet sittende igjen — «french-trimmet» for dramatisk presentasjon. Kotelettkammen er ryggpartiet på grisen og inneholder ytrefilet med fettkappe. På Mangalitsa er marmoreringen gjennom hele kotelettkjøttet langt over vanlig gris.',
  description_en = 'Tomahawk is a thick chop cut from the rack (loin/rib section) with the long rib bone left attached — French-trimmed for dramatic presentation. The loin is the back section of the pig containing the eye of loin with fat cap. On Mangalitsa, the marbling throughout the chop meat far exceeds conventional pork.',
  description_premium_no = 'Dette er steakhouse-kuttet fra grisen. Beinet tilfører smak under steking og holder kjøttet saftig. Fettkappen spraker seg og blir sprø som svor. Mangalitsa-tomahawk er det nærmeste du kommer en ribeye-opplevelse fra svin — servér den på et skjærebrett ved bordet for full effekt.',
  description_premium_en = 'This is the steakhouse cut of pork. The bone adds flavour during cooking and keeps the meat juicy. The fat cap crackles and crisps like crackling. Mangalitsa tomahawk is the closest you get to a ribeye experience from pork — serve it on a cutting board at the table for full effect.',
  preparation_tips_no = 'Omvendt steking: Start i ovn på 120 °C til kjernetemperatur 55 °C, stek deretter hardt i jernpanne eller på grill 2 min per side. Eller grill direkte: hard varme først for skorpe, deretter indirekte til 60–63 °C i kjernen. Hvil 5–10 min. Servér med rosa kjerne.',
  preparation_tips_en = 'Reverse sear: Start in oven at 120°C until internal temp 55°C, then sear hard in cast iron or on grill 2 min per side. Or grill direct: high heat first for crust, then indirect to 60–63°C core. Rest 5–10 min. Serve with pink centre.',
  updated_at = NOW()
WHERE slug = 'extra-tomahawk';

-- 6. SVINE-ENTRECÔTE (Ribeye)
UPDATE extras_catalog SET
  description_no = 'Svine-entrecôte er benfri koteletter skåret fra kammen — samme området som tomahawk, men uten bein. Kotelettkammen sitter på ryggen av grisen og inneholder ytrefileten, som er en av de møreste musklene. På vanlig gris kan koteletter bli tørre, men Mangalitsa sin marmorering gjør at dette stykket holder seg saftig selv ved litt for lang steketid.',
  description_en = 'Pork ribeye is a boneless chop cut from the loin — the same area as tomahawk, but without bone. The loin sits on the pig''s back and contains the eye of loin, one of the most tender muscles. On conventional pork, chops can dry out, but Mangalitsa marbling keeps this cut juicy even if slightly overcooked.',
  description_premium_no = 'Tenk på dette som en biff-opplevelse fra gris. Der vanlige koteletter krever presisjon for ikke å bli tørre, gir Mangalitsa-marmoreringen en trygg margin. Stekes best til rosa kjerne (60–63 °C) — noe som er uvant for mange med svin, men helt trygt og gir enorm forskjell i smak og tekstur.',
  description_premium_en = 'Think of this as a steak experience from pork. Where conventional chops demand precision to avoid dryness, Mangalitsa marbling provides a safe margin. Best cooked to pink centre (60–63°C) — unusual for many with pork, but perfectly safe and makes an enormous difference in flavour and texture.',
  preparation_tips_no = 'Stek i varm jernpanne med smør: 3–4 min per side til gyllen skorpe. Kjernetemperatur 60–63 °C for rosa kjerne. Hvil like lenge som steketiden. Alternativt: marinér i soya, honning og hvitløk, grill på middels varme. Skjær i skiver på skrå.',
  preparation_tips_en = 'Sear in hot cast iron with butter: 3–4 min per side until golden crust. Internal temp 60–63°C for pink centre. Rest as long as you cooked. Alternatively: marinate in soy, honey and garlic, grill on medium heat. Slice on the bias.',
  updated_at = NOW()
WHERE slug = 'extra-svine-entrecote';

-- 7. BUKLIST (Pancetta)
UPDATE extras_catalog SET
  description_no = 'Buklist er den nederste, benfrie delen av siden på grisen — under ribbeina. Ifølge Matprat brukes den tradisjonelt til sylterull, ribberull og lettsaltet flesk. Buklisten har vekslende lag av fett og kjøtt, noe som gjør den perfekt for langsom tilberedning. På Mangalitsa er fettlagene tykkere og mer smaksrike.',
  description_en = 'Pork belly strip is the lower, boneless part of the pig''s side — below the ribs. Traditionally used for sylterull (rolled meat) and lightly salted pork. The belly has alternating layers of fat and meat, making it perfect for slow cooking. On Mangalitsa, the fat layers are thicker and more flavourful.',
  description_premium_no = 'Mangalitsa-buklist er råvaren for hjemmelaget pancetta — italiensk speket bukflesk. Salt, krydder med pepper og fennikel, rull og heng i 4–6 uker. Resultatet er en helt annen verden enn kjøpevariant. Kan også brukes fersk: langtidsstek ved lav temperatur til sprø overflate og smeltende fett inni.',
  description_premium_en = 'Mangalitsa belly is the raw material for homemade pancetta — Italian cured belly. Salt, season with pepper and fennel, roll and hang 4–6 weeks. The result is a world apart from store-bought. Can also be used fresh: slow-roast at low temperature until crispy surface and melting fat inside.',
  preparation_tips_no = 'Til pancetta: saltes 7 dager, krydres, rulles stramt og henges i 4–6 uker. Fersk: rits svoren, gni inn med salt og krydder, stek på 160 °C i 2,5–3 timer til sprø. Asiatisk variant: braisér i soya, stjerneanis og ingefær i 2 timer.',
  preparation_tips_en = 'For pancetta: salt 7 days, season, roll tight and hang 4–6 weeks. Fresh: score the skin, rub with salt and spices, roast at 160°C for 2.5–3 hours until crispy. Asian style: braise in soy, star anise and ginger for 2 hours.',
  updated_at = NOW()
WHERE slug = 'extra-pancetta';

-- 8. HEL SKINKE (Spekeskinke)
UPDATE extras_catalog SET
  description_no = 'Hel skinke er bakbenet på grisen — det største enkeltstykket. Ifølge Matprat kan skinken stykkes til flatbiff, steiker og schnitzel, men her selges den hel med fettkappe for speking eller langsteking. Mangalitsa-skinken har et tykt fettlag som beskytter kjøttet under lang modning og gir silkeaktig tekstur.',
  description_en = 'Whole ham is the hind leg of the pig — the largest single cut. Can be divided into steaks, schnitzel and cutlets, but here it is sold whole with fat cap for curing or slow roasting. Mangalitsa ham has a thick fat layer that protects the meat during long ageing and gives silky texture.',
  description_premium_no = 'Dette er hovedstykket for et spekeskinkeprosjekt. Mangalitsa sin høye fettandel gjør skinken ideell for langmodning — fettet beskytter mot uttørking og harskhet. Saltes 1 dag per kg, henges i 12–36 måneder. Resultatet er spekeskinke på nivå med italiensk prosciutto eller spansk jamón — laget i Norge.',
  description_premium_en = 'This is the centrepiece for a ham-curing project. Mangalitsa''s high fat content makes the ham ideal for long ageing — the fat protects against drying and rancidity. Salt 1 day per kg, hang 12–36 months. The result is cured ham on par with Italian prosciutto or Spanish jamón — made in Norway.',
  preparation_tips_no = 'Til speking: salt 1 dag per kg kjøtt, vask av, tørk og heng ved 13 °C og 75–80 % luftfuktighet i 12–36 mnd. Til langsteking: stek ved 120 °C til kjernetemperatur 74 °C. Skinkestek av Mangalitsa trenger ikke svor for å holde seg saftig — fettet gjør jobben.',
  preparation_tips_en = 'For curing: salt 1 day per kg meat, wash off, dry and hang at 13°C and 75–80% humidity for 12–36 months. For slow roasting: cook at 120°C to 74°C core. Mangalitsa ham roast doesn''t need crackling to stay juicy — the fat does the work.',
  updated_at = NOW()
WHERE slug = 'extra-skinke-speking';

-- 9. KNOKE
UPDATE extras_catalog SET
  description_no = 'Svineknoke er det nedre leggstykket — kneet med omkringliggende kjøtt, sener og kollagen. Ifølge Matprat er dette klassisk kokekjøtt som trekkes i 85–90 °C i ca. 3 timer til kjøttet løsner fra benet. Mangalitsa-knoke har mer kollagen og fett enn vanlig gris, noe som gir rikere kraft og mer gelatin.',
  description_en = 'Pork knuckle is the lower leg — the knee joint with surrounding meat, tendons and collagen. Classic simmering meat that is pulled at 85–90°C for about 3 hours until the meat falls off the bone. Mangalitsa knuckle has more collagen and fat than conventional pork, yielding richer stock and more gelatine.',
  description_premium_no = 'Knoken er undervurdert. Den gir Norges beste ertesuppe, kraftige buljonger og braisert kjøtt som faller fra beinet. Tradisjonelt servert med kålrotstappe og surkål. I tysk tradisjon stekes den som «Schweinshaxe» med sprø svor. Mangalitsa-knoke gir en dypere, rikere kraft enn noe annet kokekjøtt.',
  description_premium_en = 'The knuckle is underrated. It produces the best pea soup, rich broths and braised meat that falls off the bone. Traditionally served with swede mash and sauerkraut. In German tradition, roasted as Schweinshaxe with crispy crackling. Mangalitsa knuckle yields a deeper, richer stock than any other simmering meat.',
  preparation_tips_no = 'Til kraft/suppe: legg i kaldt vann med løk, gulrot, selleri og laurbær. Trekk ved 85–90 °C i 3–4 timer. Til braisering: brun først i panne, braiser i øl eller vin i 2,5 timer. Til ertesuppe: 1 knoke til fire porsjoner, bruk kokevannet som base.',
  preparation_tips_en = 'For stock/soup: place in cold water with onion, carrot, celery and bay leaf. Simmer at 85–90°C for 3–4 hours. For braising: brown first in pan, braise in beer or wine for 2.5 hours. For pea soup: 1 knuckle for four servings, use the cooking liquid as base.',
  updated_at = NOW()
WHERE slug = 'extra-knoke';

-- 10. SMULT (Ferdig utsmeltet)
UPDATE extras_catalog SET
  description_no = 'Ferdig utsmeltet fett fra Mangalitsa — klart til bruk rett fra glasset. Smeltes sakte fra nyrefett og ryggfett for den reneste smaken. Mangalitsa-smult har over 60 % enumettede fettsyrer, tåler høy varme og gir en ren, nøytral smak uten den «tallaktige» ettersmaken mange kjenner fra vanlig smult.',
  description_en = 'Ready-rendered fat from Mangalitsa — ready to use straight from the jar. Slowly rendered from kidney fat and back fat for the cleanest flavour. Mangalitsa lard has over 60% monounsaturated fatty acids, tolerates high heat and gives a clean, neutral taste without the tallowy aftertaste many know from regular lard.',
  description_premium_no = 'Norsk baketradisjon brukte alltid smult — til lefse, smultringer, krumkaker og paideig. Mangalitsa-smult er denne tradisjonen i sin fineste form. Gir flakere paideig enn smør, sprøere stekt mat enn olje, og en ren smak som løfter alt. Rik på vitamin D fra utegående gris.',
  description_premium_en = 'Norwegian baking tradition always used lard — for lefse, doughnuts, krumkaker and pie dough. Mangalitsa lard is this tradition in its finest form. Makes flakier pie dough than butter, crispier fried food than oil, and a clean flavour that elevates everything. Rich in vitamin D from outdoor-raised pigs.',
  preparation_tips_no = 'Bruk som stekefett til koteletter, biffer og poteter — tåler høyere varme enn smør. Erstatt smør med smult i paideig for flakere resultat. Perfekt til sprøsteking av grønnsaker. Oppbevares i kjøleskap, holder i flere måneder.',
  preparation_tips_en = 'Use as cooking fat for chops, steaks and potatoes — tolerates higher heat than butter. Replace butter with lard in pie dough for flakier results. Perfect for crisping vegetables. Store in fridge, keeps for months.',
  updated_at = NOW()
WHERE slug = 'extra-smult';
