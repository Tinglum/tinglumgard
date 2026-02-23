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
