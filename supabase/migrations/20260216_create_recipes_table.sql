-- ============================================================================
-- Migration: Create recipes table and seed 12 Mangalitsa-adapted recipes
-- Date: 2026-02-16
-- Description: Bilingual recipe content (NO/EN) for Mangalitsa premium pork
-- ============================================================================

-- Create the recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title_no TEXT NOT NULL,
  title_en TEXT NOT NULL,
  intro_no TEXT NOT NULL DEFAULT '',
  intro_en TEXT NOT NULL DEFAULT '',
  ingredients_no JSONB NOT NULL DEFAULT '[]',
  ingredients_en JSONB NOT NULL DEFAULT '[]',
  steps_no JSONB NOT NULL DEFAULT '[]',
  steps_en JSONB NOT NULL DEFAULT '[]',
  tips_no TEXT DEFAULT '',
  tips_en TEXT DEFAULT '',
  mangalitsa_tip_no TEXT DEFAULT '',
  mangalitsa_tip_en TEXT DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  prep_time_minutes INT NOT NULL DEFAULT 0,
  cook_time_minutes INT NOT NULL DEFAULT 0,
  servings INT NOT NULL DEFAULT 4,
  image_url TEXT DEFAULT '',
  related_extra_slugs TEXT[] DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_slug ON recipes(slug);
CREATE INDEX IF NOT EXISTS idx_recipes_active ON recipes(active);

-- ============================================================================
-- Seed 12 Mangalitsa recipes
-- ============================================================================

-- 1. Carbonara med Mangalitsa-guanciale
INSERT INTO recipes (
  slug, title_no, title_en,
  intro_no, intro_en,
  ingredients_no, ingredients_en,
  steps_no, steps_en,
  tips_no, tips_en,
  mangalitsa_tip_no, mangalitsa_tip_en,
  difficulty, prep_time_minutes, cook_time_minutes, servings,
  image_url, related_extra_slugs, display_order
) VALUES (
  'carbonara-guanciale',
  'Carbonara med Mangalitsa-guanciale',
  'Carbonara with Mangalitsa Guanciale',
  'Ekte romersk carbonara uten fløte — bare guanciale, eggeplommer, pecorino og pepper. Med Mangalitsa-guanciale får du en rikere, silkemykere saus enn du noen gang har smakt.',
  'Authentic Roman carbonara without cream — just guanciale, egg yolks, pecorino, and pepper. Mangalitsa guanciale delivers a richer, silkier sauce than you have ever tasted.',
  '[
    {"amount": "250 g", "item": "Mangalitsa-guanciale"},
    {"amount": "400 g", "item": "spaghetti eller rigatoni"},
    {"amount": "6 stk", "item": "eggeplommer"},
    {"amount": "100 g", "item": "pecorino romano, finrevet"},
    {"amount": "2 ts", "item": "ferskkvernet sort pepper"},
    {"amount": "", "item": "grovt salt til pastavannet"}
  ]',
  '[
    {"amount": "250 g", "item": "Mangalitsa guanciale"},
    {"amount": "400 g", "item": "spaghetti or rigatoni"},
    {"amount": "6", "item": "egg yolks"},
    {"amount": "100 g", "item": "pecorino romano, finely grated"},
    {"amount": "2 tsp", "item": "freshly cracked black pepper"},
    {"amount": "", "item": "coarse salt for the pasta water"}
  ]',
  '[
    "Skjær guanciale i 5 mm tykke strimler. Ikke terninger — strimler smelter bedre og gir sprøere tekstur.",
    "Legg guanciale i en kald panne og sett på middels lav varme. La fettet smelte sakte ut i 8-10 minutter til strimlene er gylne og sprø i kantene. Mangalitsa-guanciale gir mer fett enn vanlig, så ha tålmodighet.",
    "Kok pasta i rikelig godt saltet vann (det skal smake som havet). Kok til al dente, ca. 1 minutt kortere enn pakken sier.",
    "Mens pastaen koker: visp sammen eggeplommer, revet pecorino og pepper i en skål til en tykk, kremaktig masse.",
    "Ta pannen med guanciale av varmen. Sett til side og la den kjøle seg noen minutter — dette er kritisk for å unngå eggerøre.",
    "Bruk en tang til å flytte den ferdige pastaen rett fra kokevannet til guanciale-pannen. Ta med litt kokvann (2-3 ss). Vend raskt.",
    "Hell eggesmørret over pastaen mens du vender energisk. Restvarmen fra pasta og panne lager sausen. Tilsett litt kokvann om den er for tykk. Sausen skal være flytende og silkeglatt.",
    "Server umiddelbart med ekstra pecorino og pepper på toppen."
  ]',
  '[
    "Cut the guanciale into 5 mm thick strips. Not cubes — strips render better and crisp up more evenly.",
    "Place guanciale in a cold pan and set over medium-low heat. Let the fat render slowly for 8-10 minutes until the strips are golden and crispy at the edges. Mangalitsa guanciale releases more fat than regular, so be patient.",
    "Cook pasta in generously salted boiling water (it should taste like the sea). Cook to al dente, about 1 minute less than the package directions.",
    "While the pasta cooks: whisk together egg yolks, grated pecorino, and pepper in a bowl until thick and creamy.",
    "Remove the guanciale pan from heat. Set aside and let it cool for a couple of minutes — this is critical to avoid scrambling the eggs.",
    "Using tongs, transfer the cooked pasta directly from the pot into the guanciale pan. Bring along a splash of pasta water (2-3 tbsp). Toss quickly.",
    "Pour the egg mixture over the pasta while tossing vigorously. The residual heat from the pasta and pan creates the sauce. Add a little pasta water if it is too thick. The sauce should be fluid and silky.",
    "Serve immediately with extra pecorino and pepper on top."
  ]',
  'Hemmeligheten er temperaturkontroll. Aldri ha eggeblandingen i en varm panne — alltid ta pannen av varmen først. Bruk kokvann for å justere konsistensen.',
  'The secret is temperature control. Never add the egg mixture to a hot pan — always take the pan off the heat first. Use pasta water to adjust the consistency.',
  'Mangalitsa-guanciale har høyere fettinnhold enn vanlig guanciale, noe som gir en naturlig kremete saus helt uten fløte. Du trenger mindre guanciale enn i en standard oppskrift — det rike fettet gjør jobben. Rend sakte på lav varme for å få ut alt det gode.',
  'Mangalitsa guanciale has a higher fat content than regular guanciale, producing a naturally creamy sauce without any cream. You need less guanciale than a standard recipe — the rich fat does the work. Render slowly on low heat to extract all that goodness.',
  'medium', 10, 20, 4,
  '/recipes/carbonara-guanciale.jpg',
  ARRAY['extra-guanciale'],
  1
)
ON CONFLICT (slug) DO UPDATE SET
  title_no = EXCLUDED.title_no, title_en = EXCLUDED.title_en,
  intro_no = EXCLUDED.intro_no, intro_en = EXCLUDED.intro_en,
  ingredients_no = EXCLUDED.ingredients_no, ingredients_en = EXCLUDED.ingredients_en,
  steps_no = EXCLUDED.steps_no, steps_en = EXCLUDED.steps_en,
  tips_no = EXCLUDED.tips_no, tips_en = EXCLUDED.tips_en,
  mangalitsa_tip_no = EXCLUDED.mangalitsa_tip_no, mangalitsa_tip_en = EXCLUDED.mangalitsa_tip_en,
  difficulty = EXCLUDED.difficulty, prep_time_minutes = EXCLUDED.prep_time_minutes,
  cook_time_minutes = EXCLUDED.cook_time_minutes, servings = EXCLUDED.servings,
  image_url = EXCLUDED.image_url, related_extra_slugs = EXCLUDED.related_extra_slugs,
  display_order = EXCLUDED.display_order, updated_at = NOW();

-- 2. Amatriciana med Mangalitsa-guanciale
INSERT INTO recipes (
  slug, title_no, title_en,
  intro_no, intro_en,
  ingredients_no, ingredients_en,
  steps_no, steps_en,
  tips_no, tips_en,
  mangalitsa_tip_no, mangalitsa_tip_en,
  difficulty, prep_time_minutes, cook_time_minutes, servings,
  image_url, related_extra_slugs, display_order
) VALUES (
  'amatriciana',
  'Amatriciana med Mangalitsa-guanciale',
  'Amatriciana with Mangalitsa Guanciale',
  'Klassisk bucatini all''amatriciana med San Marzano-tomater, pecorino romano og chili. Mangalitsa-guanciale gir en dypere, rikere smak enn vanlig svinekjake.',
  'Classic bucatini all''amatriciana with San Marzano tomatoes, pecorino romano, and chili. Mangalitsa guanciale delivers a deeper, richer flavor than regular pork jowl.',
  '[
    {"amount": "200 g", "item": "Mangalitsa-guanciale"},
    {"amount": "400 g", "item": "bucatini eller spaghetti"},
    {"amount": "400 g", "item": "San Marzano-tomater, hermetiske, knuste for hånd"},
    {"amount": "80 g", "item": "pecorino romano, finrevet"},
    {"amount": "1 stk", "item": "liten tørr chili (peperoncino), knust"},
    {"amount": "1 dl", "item": "tørt hvitvin"},
    {"amount": "", "item": "grovt salt til pastavannet"}
  ]',
  '[
    {"amount": "200 g", "item": "Mangalitsa guanciale"},
    {"amount": "400 g", "item": "bucatini or spaghetti"},
    {"amount": "400 g", "item": "San Marzano tomatoes, canned, hand-crushed"},
    {"amount": "80 g", "item": "pecorino romano, finely grated"},
    {"amount": "1", "item": "small dried chili (peperoncino), crushed"},
    {"amount": "100 ml", "item": "dry white wine"},
    {"amount": "", "item": "coarse salt for the pasta water"}
  ]',
  '[
    "Skjær guanciale i 1 cm brede strimler. Du vil ha litt tykkere biter her enn til carbonara — de skal beholde litt tygg.",
    "Stek guanciale i en kald panne på middels varme til fettet er smeltet ut og strimlene er gylne, ca. 7-8 minutter. Ta ut guanciale med en hulslev og sett til side.",
    "Hell ut mesteparten av fettet, men la 2-3 ss bli igjen i pannen. Tilsett knust chili og la den surre i 30 sekunder til den dufter.",
    "Slukk med hvitvin og la det koke inn til halvparten, ca. 1 minutt.",
    "Tilsett de knuste tomatene. Krydre med litt salt (forsiktig — pecorino er salt). La sausen småkoke i 15 minutter til den har tyknet.",
    "Kok bucatini i godt saltet vann til al dente. Spar 1 dl kokvann.",
    "Legg guanciale tilbake i sausen. Vend pastaen inn i sausen med litt kokvann. Rør godt.",
    "Server i varme skåler med rikelig pecorino over."
  ]',
  '[
    "Cut guanciale into 1 cm wide strips. You want slightly thicker pieces here than for carbonara — they should retain some chew.",
    "Cook guanciale in a cold pan over medium heat until the fat has rendered and the strips are golden, about 7-8 minutes. Remove guanciale with a slotted spoon and set aside.",
    "Pour out most of the fat, leaving 2-3 tbsp in the pan. Add crushed chili and let it sizzle for 30 seconds until fragrant.",
    "Deglaze with white wine and reduce by half, about 1 minute.",
    "Add the crushed tomatoes. Season with a little salt (be careful — pecorino is salty). Let the sauce simmer for 15 minutes until thickened.",
    "Cook bucatini in well-salted water until al dente. Reserve 100 ml of pasta water.",
    "Return the guanciale to the sauce. Toss the pasta into the sauce with a splash of pasta water. Stir well.",
    "Serve in warm bowls with generous pecorino on top."
  ]',
  'Knuse tomatene for hånd i stedet for å bruke stavmikser — det gir bedre, ujevn tekstur. Ikke overkok sausen; den skal ha friskhet.',
  'Crush the tomatoes by hand instead of using a blender — it gives a better, irregular texture. Do not overcook the sauce; it should retain freshness.',
  'Det ekstra fettet fra Mangalitsa-guanciale løser seg inn i tomatsausen og gir den en silkemyk kropp som vanlig guanciale ikke kan matche. Fettet emulgerer med tomatene og skaper en glansete, sammenhengende saus som kler seg rundt pastaen.',
  'The extra fat from Mangalitsa guanciale dissolves into the tomato sauce, giving it a silky body that regular guanciale cannot match. The fat emulsifies with the tomatoes, creating a glossy, cohesive sauce that coats the pasta beautifully.',
  'easy', 10, 25, 4,
  '/recipes/amatriciana.jpg',
  ARRAY['extra-guanciale'],
  2
)
ON CONFLICT (slug) DO UPDATE SET
  title_no = EXCLUDED.title_no, title_en = EXCLUDED.title_en,
  intro_no = EXCLUDED.intro_no, intro_en = EXCLUDED.intro_en,
  ingredients_no = EXCLUDED.ingredients_no, ingredients_en = EXCLUDED.ingredients_en,
  steps_no = EXCLUDED.steps_no, steps_en = EXCLUDED.steps_en,
  tips_no = EXCLUDED.tips_no, tips_en = EXCLUDED.tips_en,
  mangalitsa_tip_no = EXCLUDED.mangalitsa_tip_no, mangalitsa_tip_en = EXCLUDED.mangalitsa_tip_en,
  difficulty = EXCLUDED.difficulty, prep_time_minutes = EXCLUDED.prep_time_minutes,
  cook_time_minutes = EXCLUDED.cook_time_minutes, servings = EXCLUDED.servings,
  image_url = EXCLUDED.image_url, related_extra_slugs = EXCLUDED.related_extra_slugs,
  display_order = EXCLUDED.display_order, updated_at = NOW();

-- 3. Lag din egen coppa
INSERT INTO recipes (
  slug, title_no, title_en,
  intro_no, intro_en,
  ingredients_no, ingredients_en,
  steps_no, steps_en,
  tips_no, tips_en,
  mangalitsa_tip_no, mangalitsa_tip_en,
  difficulty, prep_time_minutes, cook_time_minutes, servings,
  image_url, related_extra_slugs, display_order
) VALUES (
  'coppa-project',
  'Lag din egen coppa',
  'Make Your Own Coppa',
  'Et spekeprosjekt for den tålmodige. Salt, krydre, rull inn i tarm og heng til modning i 3-6 måneder. Resultatet er hjemmelaget coppa av verdensklasse fra Mangalitsa-nakke.',
  'A curing project for the patient. Salt, season, roll into casing, and hang to mature for 3-6 months. The result is world-class homemade coppa from Mangalitsa neck.',
  '[
    {"amount": "1,5-2 kg", "item": "Mangalitsa-nakke (coppa-stykke), helt"},
    {"amount": "50 g", "item": "grovt havsalt per kg kjøtt"},
    {"amount": "3 g", "item": "kur-salt nr. 2 (nitrat) per kg kjøtt"},
    {"amount": "2 ss", "item": "ferskkvernet sort pepper"},
    {"amount": "1 ss", "item": "fennikelfrø, lett knust"},
    {"amount": "1 ss", "item": "tørket oregano"},
    {"amount": "4 stk", "item": "fedd hvitløk, finhakket"},
    {"amount": "1 ts", "item": "chiliflak (valgfritt)"},
    {"amount": "1 stk", "item": "kollagen- eller naturlig tarm (90-100 mm diameter)"},
    {"amount": "", "item": "kjøkkenhyssing"}
  ]',
  '[
    {"amount": "1.5-2 kg", "item": "Mangalitsa neck (coppa cut), whole"},
    {"amount": "50 g", "item": "coarse sea salt per kg of meat"},
    {"amount": "3 g", "item": "curing salt #2 (nitrate) per kg of meat"},
    {"amount": "2 tbsp", "item": "freshly cracked black pepper"},
    {"amount": "1 tbsp", "item": "fennel seeds, lightly crushed"},
    {"amount": "1 tbsp", "item": "dried oregano"},
    {"amount": "4", "item": "garlic cloves, finely chopped"},
    {"amount": "1 tsp", "item": "chili flakes (optional)"},
    {"amount": "1", "item": "collagen or natural casing (90-100 mm diameter)"},
    {"amount": "", "item": "butcher''s twine"}
  ]',
  '[
    "Trimme nakken forsiktig — fjern eventuelle løse biter, men behold fettet. Mangalitsa-nakken har mer intramuskulært fett enn vanlig, og det er akkurat dette som gjør den perfekt til coppa.",
    "Bland salt, kur-salt, pepper, fennikelfrø, oregano, hvitløk og chiliflak til en kryddermiks. Gni blandingen grundig inn i kjøttet fra alle sider.",
    "Legg det inngnidde kjøttet i en vakuumpose eller ziplock-pose, press ut luften, og legg i kjøleskap. La det salte i 1 dag per kg (f.eks. 2 dager for 2 kg). Snu posen daglig.",
    "Etter saltingen: skyll av overflødig salt under kaldt vann og tørk grundig med kjøkkenpapir. La kjøttet lufttørke i kjøleskapet i 12-24 timer på en rist.",
    "Bløtlegg tarmen i lunkent vann i 30 minutter. Tre kjøttet inn i tarmen — press ut all luft. Bind igjen i endene.",
    "Bind med hyssing i et rutemønster med ca. 2 cm mellomrom. Dette gir coppaen sin karakteristiske form og sikrer jevn tørking.",
    "Heng coppaen på et kjølig, luftig sted (12-15°C, 70-80% luftfuktighet). En kjeller, garasje om vinteren, eller et modningsskap fungerer. Målet er et vekttap på 30-35% av startvekten.",
    "Etter 3-6 måneder er coppaen klar. Skjær papiretynne skiver med en skarp kniv eller kjøttskjærer. Den skal ha en dyp rosa farge med hvite fettårer gjennom."
  ]',
  '[
    "Trim the neck carefully — remove any loose bits but keep the fat. Mangalitsa neck has more intramuscular fat than regular pork, and that is exactly what makes it perfect for coppa.",
    "Mix salt, curing salt, pepper, fennel seeds, oregano, garlic, and chili flakes into a spice blend. Rub the mixture thoroughly into the meat from all sides.",
    "Place the rubbed meat in a vacuum bag or ziplock, press out the air, and refrigerate. Cure for 1 day per kg (e.g., 2 days for 2 kg). Flip the bag daily.",
    "After curing: rinse off excess salt under cold water and dry thoroughly with paper towels. Let the meat air-dry in the fridge on a rack for 12-24 hours.",
    "Soak the casing in lukewarm water for 30 minutes. Stuff the meat into the casing — push out all air. Tie off both ends.",
    "Tie with twine in a crosshatch pattern at about 2 cm intervals. This gives the coppa its characteristic shape and ensures even drying.",
    "Hang the coppa in a cool, airy place (12-15°C, 70-80% humidity). A cellar, winter garage, or curing chamber works. The target is a weight loss of 30-35% of starting weight.",
    "After 3-6 months the coppa is ready. Slice paper-thin with a sharp knife or meat slicer. It should have a deep rose color with white fat veins running through."
  ]',
  'Bruk et termometer/hygrometer for å overvåke temperatur og fuktighet. Hvis overflaten tørker for raskt, kan du pakke den i matpapir den første uken. Hvitt mugg på overflaten er normalt og ønskelig — grønt eller svart mugg skal tørkes av med eddik.',
  'Use a thermometer/hygrometer to monitor temperature and humidity. If the surface dries too quickly, wrap it in butcher paper for the first week. White mold on the surface is normal and desirable — green or black mold should be wiped off with vinegar.',
  'Mangalitsa-nakke har vesentlig mer intramuskulært fett enn vanlig gris, noe som betyr to ting: du trenger litt lenger tørketid (planlegg ekstra 2-4 uker), men resultatet er en silkemyk, smøraktig coppa som smelter på tungen. Det ekstra fettet beskytter også mot case hardening (at overflaten tørker mens kjernen er rå).',
  'Mangalitsa neck has significantly more intramuscular fat than regular pork, which means two things: you need slightly longer drying time (plan for an extra 2-4 weeks), but the result is a silky, buttery coppa that melts on the tongue. The extra fat also protects against case hardening (the surface drying while the core stays raw).',
  'hard', 30, 0, 20,
  '/recipes/coppa-project.jpg',
  ARRAY['extra-coppa'],
  3
)
ON CONFLICT (slug) DO UPDATE SET
  title_no = EXCLUDED.title_no, title_en = EXCLUDED.title_en,
  intro_no = EXCLUDED.intro_no, intro_en = EXCLUDED.intro_en,
  ingredients_no = EXCLUDED.ingredients_no, ingredients_en = EXCLUDED.ingredients_en,
  steps_no = EXCLUDED.steps_no, steps_en = EXCLUDED.steps_en,
  tips_no = EXCLUDED.tips_no, tips_en = EXCLUDED.tips_en,
  mangalitsa_tip_no = EXCLUDED.mangalitsa_tip_no, mangalitsa_tip_en = EXCLUDED.mangalitsa_tip_en,
  difficulty = EXCLUDED.difficulty, prep_time_minutes = EXCLUDED.prep_time_minutes,
  cook_time_minutes = EXCLUDED.cook_time_minutes, servings = EXCLUDED.servings,
  image_url = EXCLUDED.image_url, related_extra_slugs = EXCLUDED.related_extra_slugs,
  display_order = EXCLUDED.display_order, updated_at = NOW();

-- 4. Nakkebiff på grill
INSERT INTO recipes (
  slug, title_no, title_en,
  intro_no, intro_en,
  ingredients_no, ingredients_en,
  steps_no, steps_en,
  tips_no, tips_en,
  mangalitsa_tip_no, mangalitsa_tip_en,
  difficulty, prep_time_minutes, cook_time_minutes, servings,
  image_url, related_extra_slugs, display_order
) VALUES (
  'neck-steak',
  'Nakkebiff på grill',
  'Grilled Neck Steaks',
  'Tyktskårne nakkebiff på grillen — Mangalitsas mest marmorerte stykke. Enkel tilberedning, umulig å ødelegge.',
  'Thick-cut neck steaks on the grill — the most marbled cut from Mangalitsa. Simple preparation, impossible to ruin.',
  '[
    {"amount": "2 stk", "item": "Mangalitsa-nakkebiff, 3-4 cm tykke (ca. 300 g hver)"},
    {"amount": "2 ss", "item": "olivenolje"},
    {"amount": "", "item": "flaksalt"},
    {"amount": "", "item": "ferskkvernet sort pepper"},
    {"amount": "1 stk", "item": "sitron, i båter (til servering)"}
  ]',
  '[
    {"amount": "2", "item": "Mangalitsa neck steaks, 3-4 cm thick (about 300 g each)"},
    {"amount": "2 tbsp", "item": "olive oil"},
    {"amount": "", "item": "flaky salt"},
    {"amount": "", "item": "freshly cracked black pepper"},
    {"amount": "1", "item": "lemon, in wedges (for serving)"}
  ]',
  '[
    "Ta biffene ut av kjøleskapet 45 minutter før grilling. Tørk med kjøkkenpapir. Pensle med olivenolje og krydre med salt og pepper.",
    "Fyr opp grillen til høy varme (direkte grilling). Du skal ha glødende kull eller gassen på maks. Risten skal være ren og godt varm.",
    "Legg biffene på den varme risten. Ikke rør dem på 4-5 minutter. Du vil ha en skikkelig brunstekt skorpe.",
    "Snu én gang. Grill ytterligere 4-5 minutter for medium (rosa kjerne). Bruk gjerne et steketermometer — 60°C for medium rare, 63°C for medium.",
    "Ta av grillen og la hvile i 5 minutter på et skjærebrett. Dekk løst med folie.",
    "Server hele eller i tykke skiver med flaksalt, pepper og sitronbåter."
  ]',
  '[
    "Remove the steaks from the fridge 45 minutes before grilling. Pat dry with paper towels. Brush with olive oil and season with salt and pepper.",
    "Fire up the grill to high heat (direct grilling). You want glowing coals or gas on max. The grate should be clean and very hot.",
    "Place the steaks on the hot grate. Do not touch them for 4-5 minutes. You want a proper browned crust.",
    "Flip once. Grill for another 4-5 minutes for medium (pink center). Use a meat thermometer — 60°C for medium rare, 63°C for medium.",
    "Remove from the grill and let rest for 5 minutes on a cutting board. Cover loosely with foil.",
    "Serve whole or in thick slices with flaky salt, pepper, and lemon wedges."
  ]',
  'Ikke press på biffene med en stekespade — det presser ut all den deilige saften. La grillen gjøre jobben. En varm rist og tålmodighet er alt du trenger.',
  'Do not press down on the steaks with a spatula — it squeezes out all the delicious juices. Let the grill do the work. A hot grate and patience is all you need.',
  'Mangalitsa-nakke er kanskje den mest marmorerte delen av hele dyret. Der vanlig gris-nakke kan bli tørr på grillen, er det nærmest umulig å tørke ut en Mangalitsa-nakkebiff. Det intramuskulære fettet smelter innenfra og holder kjøttet saftig selv om du overskyter temperaturen litt.',
  'Mangalitsa neck is arguably the most marbled part of the entire animal. Where regular pork neck can dry out on the grill, it is nearly impossible to dry out a Mangalitsa neck steak. The intramuscular fat melts from within and keeps the meat juicy even if you slightly overshoot the temperature.',
  'easy', 5, 12, 2,
  '/recipes/neck-steak.jpg',
  ARRAY['extra-coppa'],
  4
)
ON CONFLICT (slug) DO UPDATE SET
  title_no = EXCLUDED.title_no, title_en = EXCLUDED.title_en,
  intro_no = EXCLUDED.intro_no, intro_en = EXCLUDED.intro_en,
  ingredients_no = EXCLUDED.ingredients_no, ingredients_en = EXCLUDED.ingredients_en,
  steps_no = EXCLUDED.steps_no, steps_en = EXCLUDED.steps_en,
  tips_no = EXCLUDED.tips_no, tips_en = EXCLUDED.tips_en,
  mangalitsa_tip_no = EXCLUDED.mangalitsa_tip_no, mangalitsa_tip_en = EXCLUDED.mangalitsa_tip_en,
  difficulty = EXCLUDED.difficulty, prep_time_minutes = EXCLUDED.prep_time_minutes,
  cook_time_minutes = EXCLUDED.cook_time_minutes, servings = EXCLUDED.servings,
  image_url = EXCLUDED.image_url, related_extra_slugs = EXCLUDED.related_extra_slugs,
  display_order = EXCLUDED.display_order, updated_at = NOW();

-- 5. Secreto på plancha
INSERT INTO recipes (
  slug, title_no, title_en,
  intro_no, intro_en,
  ingredients_no, ingredients_en,
  steps_no, steps_en,
  tips_no, tips_en,
  mangalitsa_tip_no, mangalitsa_tip_en,
  difficulty, prep_time_minutes, cook_time_minutes, servings,
  image_url, related_extra_slugs, display_order
) VALUES (
  'secreto-plancha',
  'Secreto på plancha',
  'Secreto a la Plancha',
  'Spansk inspirert — brennheit plancha, salt og olivenolje. Secreto (den skjulte biten bak skulderen) er Iberias best bevarte hemmelighet. Med Mangalitsa er den enda bedre.',
  'Spanish-inspired — screaming hot plancha, salt, and olive oil. Secreto (the hidden cut behind the shoulder) is Iberia''s best-kept secret. With Mangalitsa, it is even better.',
  '[
    {"amount": "2 stk", "item": "Mangalitsa-secreto (ca. 250-300 g hver)"},
    {"amount": "2 ss", "item": "god olivenolje"},
    {"amount": "", "item": "flaksalt (Maldon eller lignende)"},
    {"amount": "", "item": "ferskkvernet sort pepper"},
    {"amount": "1 stk", "item": "sitron"}
  ]',
  '[
    {"amount": "2", "item": "Mangalitsa secreto (about 250-300 g each)"},
    {"amount": "2 tbsp", "item": "good olive oil"},
    {"amount": "", "item": "flaky salt (Maldon or similar)"},
    {"amount": "", "item": "freshly cracked black pepper"},
    {"amount": "1", "item": "lemon"}
  ]',
  '[
    "Ta secreto ut av kjøleskapet 30 minutter før tilberedning. Tørk godt med kjøkkenpapir.",
    "Varm opp en plancha, stekepanne av støpejern eller grillrist til den ryker. Den skal være så varm at en vanndråpe fordamper umiddelbart. Pensle secretoen med olivenolje.",
    "Legg secretoen flat på den brennheite platen. Press den ned med en stekespade de første 30 sekundene for god kontakt. Stek i 2-3 minutter — du vil ha en mørk, karamellisert skorpe.",
    "Snu og stek 2-3 minutter til. Secreto er tynn og ujevn, så tynnere deler blir mer stekt og tykkere deler mer rosa — det er meningen.",
    "Ta av varmen og la hvile i 3-4 minutter.",
    "Skjær i tynne skiver på skrå mot fibrene. Dryss med flaksalt, pepper og en skvett sitron. Server umiddelbart."
  ]',
  '[
    "Remove the secreto from the fridge 30 minutes before cooking. Pat dry thoroughly with paper towels.",
    "Heat a plancha, cast iron skillet, or grill grate until smoking. It should be so hot that a drop of water evaporates instantly. Brush the secreto with olive oil.",
    "Lay the secreto flat on the screaming hot surface. Press it down with a spatula for the first 30 seconds for good contact. Cook for 2-3 minutes — you want a dark, caramelized crust.",
    "Flip and cook for another 2-3 minutes. Secreto is thin and uneven, so thinner parts will be more cooked and thicker parts more pink — that is intentional.",
    "Remove from heat and let rest for 3-4 minutes.",
    "Slice thin on the bias against the grain. Sprinkle with flaky salt, pepper, and a squeeze of lemon. Serve immediately."
  ]',
  'Ikke la secreto bli gjennomstekt — den er best med rosa kjerne. Skjær alltid på skrå mot fibrene for mørest resultat. Perfekt som tapas eller forrett.',
  'Do not cook the secreto all the way through — it is best with a pink center. Always slice on the bias against the grain for the most tender result. Perfect as tapas or a starter.',
  'Secreto fra Mangalitsa har et intrikat nett av intramuskulært fett som minner om japansk wagyu. Når den treffer en brennheit overflate, karamelliserer fettet og skaper en umami-bombe. Vanlig gris-secreto er god — Mangalitsa-secreto er eksepsjonell.',
  'Secreto from Mangalitsa has an intricate web of intramuscular fat reminiscent of Japanese wagyu. When it hits a screaming hot surface, the fat caramelizes and creates an umami bomb. Regular pork secreto is good — Mangalitsa secreto is exceptional.',
  'easy', 5, 6, 2,
  '/recipes/secreto-plancha.jpg',
  ARRAY['extra-secreto-presa-pluma'],
  5
)
ON CONFLICT (slug) DO UPDATE SET
  title_no = EXCLUDED.title_no, title_en = EXCLUDED.title_en,
  intro_no = EXCLUDED.intro_no, intro_en = EXCLUDED.intro_en,
  ingredients_no = EXCLUDED.ingredients_no, ingredients_en = EXCLUDED.ingredients_en,
  steps_no = EXCLUDED.steps_no, steps_en = EXCLUDED.steps_en,
  tips_no = EXCLUDED.tips_no, tips_en = EXCLUDED.tips_en,
  mangalitsa_tip_no = EXCLUDED.mangalitsa_tip_no, mangalitsa_tip_en = EXCLUDED.mangalitsa_tip_en,
  difficulty = EXCLUDED.difficulty, prep_time_minutes = EXCLUDED.prep_time_minutes,
  cook_time_minutes = EXCLUDED.cook_time_minutes, servings = EXCLUDED.servings,
  image_url = EXCLUDED.image_url, related_extra_slugs = EXCLUDED.related_extra_slugs,
  display_order = EXCLUDED.display_order, updated_at = NOW();

-- 6. Presa med urter og smør
INSERT INTO recipes (
  slug, title_no, title_en,
  intro_no, intro_en,
  ingredients_no, ingredients_en,
  steps_no, steps_en,
  tips_no, tips_en,
  mangalitsa_tip_no, mangalitsa_tip_en,
  difficulty, prep_time_minutes, cook_time_minutes, servings,
  image_url, related_extra_slugs, display_order
) VALUES (
  'presa-herbs',
  'Presa med urter og smør',
  'Presa with Herbs and Butter',
  'Presa er det flate, rike stykket fra øvre skulderparti. Pannestekt med smør, timian, rosmarin og hvitløk — en femminutters luksus.',
  'Presa is the flat, rich cut from the upper shoulder. Pan-seared with butter, thyme, rosemary, and garlic — a five-minute luxury.',
  '[
    {"amount": "2 stk", "item": "Mangalitsa-presa (ca. 200-250 g hver)"},
    {"amount": "2 ss", "item": "nøytral olje (solsikke eller rapsolje)"},
    {"amount": "50 g", "item": "smør"},
    {"amount": "4 stk", "item": "kvister fersk timian"},
    {"amount": "2 stk", "item": "kvister fersk rosmarin"},
    {"amount": "3 stk", "item": "fedd hvitløk, knust med skallet på"},
    {"amount": "", "item": "flaksalt og ferskkvernet pepper"}
  ]',
  '[
    {"amount": "2", "item": "Mangalitsa presa (about 200-250 g each)"},
    {"amount": "2 tbsp", "item": "neutral oil (sunflower or rapeseed)"},
    {"amount": "50 g", "item": "butter"},
    {"amount": "4", "item": "sprigs fresh thyme"},
    {"amount": "2", "item": "sprigs fresh rosemary"},
    {"amount": "3", "item": "garlic cloves, crushed with skin on"},
    {"amount": "", "item": "flaky salt and freshly cracked pepper"}
  ]',
  '[
    "Ta presaen ut av kjøleskapet 30 minutter i forveien. Tørk grundig med kjøkkenpapir og krydre godt med salt og pepper på begge sider.",
    "Varm en tung jernpanne (eller stekepanne med tykk bunn) til den ryker lett. Tilsett olje.",
    "Legg presaen i pannen og stek uten å røre i 3-4 minutter til den har en mørk, gyllen skorpe.",
    "Snu kjøttet. Tilsett smør, timian, rosmarin og knust hvitløk. Når smøret skummer, vipp pannen og øs det aromatiske smøret over kjøttet med en skje. Gjenta i 2-3 minutter.",
    "Sjekk kjernetemperaturen: 58-60°C for medium rare, 62-63°C for medium. Presaen er tynn, så den går fort.",
    "Ta av varmen og la hvile i 4-5 minutter på et skjærebrett.",
    "Skjær i 1 cm tykke skiver på skrå mot fibrene. Øs litt av urtesmøret fra pannen over skivene. Dryss med flaksalt."
  ]',
  '[
    "Remove the presa from the fridge 30 minutes ahead. Dry thoroughly with paper towels and season generously with salt and pepper on both sides.",
    "Heat a heavy cast iron pan (or thick-bottomed skillet) until lightly smoking. Add oil.",
    "Place the presa in the pan and cook without touching for 3-4 minutes until it has a dark, golden crust.",
    "Flip the meat. Add butter, thyme, rosemary, and crushed garlic. When the butter foams, tilt the pan and baste the meat with the aromatic butter using a spoon. Repeat for 2-3 minutes.",
    "Check the core temperature: 58-60°C for medium rare, 62-63°C for medium. Presa is thin, so it cooks fast.",
    "Remove from heat and rest for 4-5 minutes on a cutting board.",
    "Slice into 1 cm thick slices on the bias against the grain. Spoon some of the herb butter from the pan over the slices. Sprinkle with flaky salt."
  ]',
  'Ikke kutt i kjøttet for å sjekke om det er ferdig — bruk steketermometer. Hvert kutt slipper ut verdifull saft. Urtene skal bli mørke og sprø i smøret, ikke brent.',
  'Do not cut into the meat to check doneness — use a meat thermometer. Every cut releases precious juices. The herbs should become dark and crispy in the butter, not burnt.',
  'Presaens intramuskulære fett fungerer som en innebygd smøring under steking. Der vanlig presa kan bli seig hvis du bommer på temperaturen, tilgir Mangalitsa-presa deg. Fettet smelter innenfra og holder kjøttet saftig. Smørbastingen legger til ekstra rikdom oppå det som allerede er et utrolig rikt stykke.',
  'The presa''s intramuscular fat acts as built-in basting during cooking. Where regular presa can get tough if you miss the temperature, Mangalitsa presa forgives you. The fat melts from within and keeps the meat juicy. The butter basting adds extra richness on top of what is already an incredibly rich cut.',
  'easy', 10, 8, 2,
  '/recipes/presa-herbs.jpg',
  ARRAY['extra-secreto-presa-pluma'],
  6
)
ON CONFLICT (slug) DO UPDATE SET
  title_no = EXCLUDED.title_no, title_en = EXCLUDED.title_en,
  intro_no = EXCLUDED.intro_no, intro_en = EXCLUDED.intro_en,
  ingredients_no = EXCLUDED.ingredients_no, ingredients_en = EXCLUDED.ingredients_en,
  steps_no = EXCLUDED.steps_no, steps_en = EXCLUDED.steps_en,
  tips_no = EXCLUDED.tips_no, tips_en = EXCLUDED.tips_en,
  mangalitsa_tip_no = EXCLUDED.mangalitsa_tip_no, mangalitsa_tip_en = EXCLUDED.mangalitsa_tip_en,
  difficulty = EXCLUDED.difficulty, prep_time_minutes = EXCLUDED.prep_time_minutes,
  cook_time_minutes = EXCLUDED.cook_time_minutes, servings = EXCLUDED.servings,
  image_url = EXCLUDED.image_url, related_extra_slugs = EXCLUDED.related_extra_slugs,
  display_order = EXCLUDED.display_order, updated_at = NOW();

-- 7. Lardo crostini med honning og rosmarin
INSERT INTO recipes (
  slug, title_no, title_en,
  intro_no, intro_en,
  ingredients_no, ingredients_en,
  steps_no, steps_en,
  tips_no, tips_en,
  mangalitsa_tip_no, mangalitsa_tip_en,
  difficulty, prep_time_minutes, cook_time_minutes, servings,
  image_url, related_extra_slugs, display_order
) VALUES (
  'lardo-crostini',
  'Lardo crostini med honning og rosmarin',
  'Lardo Crostini with Honey and Rosemary',
  'Et spekkprosjekt som tar 3-6 uker: salt Mangalitsa-ryggspekk til silkemyk lardo, og server papiertynne skiver på varme crostini med honning og rosmarin. Forvandler fett til haute cuisine.',
  'A back fat curing project that takes 3-6 weeks: salt Mangalitsa back fat into silky lardo, and serve paper-thin slices on warm crostini with honey and rosemary. Transforms fat into haute cuisine.',
  '[
    {"amount": "1 kg", "item": "Mangalitsa-ryggspekk, i ett stykke med skinnet fjernet"},
    {"amount": "150 g", "item": "grovt havsalt"},
    {"amount": "2 ss", "item": "ferskkvernet sort pepper"},
    {"amount": "2 ss", "item": "frisk rosmarin, finhakket"},
    {"amount": "1 ss", "item": "frisk timian, finhakket"},
    {"amount": "4 stk", "item": "fedd hvitløk, finhakket"},
    {"amount": "1 ts", "item": "muskatnøtt, nyrevet"},
    {"amount": "3 stk", "item": "lauerbærblad"},
    {"amount": "1 stk", "item": "baguette, skåret i skiver"},
    {"amount": "", "item": "god honning til drypping"},
    {"amount": "", "item": "ferske rosmarinkvister til pynt"}
  ]',
  '[
    {"amount": "1 kg", "item": "Mangalitsa back fat, in one piece with skin removed"},
    {"amount": "150 g", "item": "coarse sea salt"},
    {"amount": "2 tbsp", "item": "freshly cracked black pepper"},
    {"amount": "2 tbsp", "item": "fresh rosemary, finely chopped"},
    {"amount": "1 tbsp", "item": "fresh thyme, finely chopped"},
    {"amount": "4", "item": "garlic cloves, finely chopped"},
    {"amount": "1 tsp", "item": "nutmeg, freshly grated"},
    {"amount": "3", "item": "bay leaves"},
    {"amount": "1", "item": "baguette, sliced"},
    {"amount": "", "item": "good honey for drizzling"},
    {"amount": "", "item": "fresh rosemary sprigs for garnish"}
  ]',
  '[
    "Bland salt, pepper, rosmarin, timian, hvitløk og muskatnøtt til en kryddersalt. Spekket skal være fast og kaldt — legg det i fryseren i 20 minutter først om det er for mykt å håndtere.",
    "Legg et tykt lag kryddersalt i bunnen av en keramisk eller glass-form. Legg spekket oppå og dekk fullstendig med resten av kryddersalten. Trykk lauerbærbladene ned i saltet.",
    "Dekk med plastfilm og legg et brett med tyngde (en murstein, bokser) oppå. Sett i kjøleskap.",
    "La det salte i 3-6 uker i kjøleskapet. Snu hver uke og skift ut saltet om det er blitt veldig vått. Spekket er klart når det føles fast gjennom hele tykkelsen.",
    "Når modningen er ferdig: skrap av saltet og tørk med kjøkkenpapir. Lardoen kan nå pakkes i vakuum og oppbevares i kjøleskap i flere måneder.",
    "For crostini: skjær baguetteskiver på skrå, pensle med olivenolje og rist i ovn på 200°C i 5-6 minutter til de er gylne og sprø.",
    "Skjær lardoen i papiertynne skiver med en skarp kniv. Legg på de varme crostiniene — varmen fra brødet smelter lardoen lett.",
    "Drypp med honning, topp med et lite rosmarinblad og server umiddelbart."
  ]',
  '[
    "Mix salt, pepper, rosemary, thyme, garlic, and nutmeg into a seasoned salt. The back fat should be firm and cold — place it in the freezer for 20 minutes first if it is too soft to handle.",
    "Layer a thick bed of the seasoned salt in the bottom of a ceramic or glass dish. Place the fat on top and cover completely with the remaining salt. Press the bay leaves into the salt.",
    "Cover with plastic wrap and place a board with weight (a brick, cans) on top. Refrigerate.",
    "Cure for 3-6 weeks in the fridge. Flip weekly and replace the salt if it has become very wet. The fat is ready when it feels firm throughout its entire thickness.",
    "When curing is complete: scrape off the salt and dry with paper towels. The lardo can now be vacuum-sealed and stored in the fridge for several months.",
    "For crostini: cut baguette slices on the bias, brush with olive oil, and toast in the oven at 200°C for 5-6 minutes until golden and crisp.",
    "Slice the lardo paper-thin with a sharp knife. Place on the warm crostini — the heat from the bread gently melts the lardo.",
    "Drizzle with honey, top with a small rosemary leaf, and serve immediately."
  ]',
  'Kald lardo er enklere å skjære. Legg den i fryseren i 15 minutter før skjæring for papiertynne skiver. En ostehøvel fungerer også godt. Lardo holder seg i månedsvis vakuumpakket i kjøleskapet.',
  'Cold lardo is easier to slice. Place it in the freezer for 15 minutes before slicing for paper-thin cuts. A cheese slicer also works well. Lardo keeps for months vacuum-sealed in the fridge.',
  'Mangalitsa-ryggspekk er tykkere og fastere enn vanlig gris, med en renere, nøtteaktig smak. Det gir en lardo som er silkemykere og har mer kompleksitet. Der vanlig lardo kan være kornete, blir Mangalitsa-lardo kremeaktig og smelter som smør. Det er rett og slett i en annen liga.',
  'Mangalitsa back fat is thicker and firmer than regular pork, with a cleaner, nuttier flavor. It produces a lardo that is silkier and has more complexity. Where regular lardo can be grainy, Mangalitsa lardo becomes creamy and melts like butter. It is simply in a different league.',
  'hard', 20, 5, 10,
  '/recipes/lardo-crostini.jpg',
  ARRAY['extra-spekk'],
  7
)
ON CONFLICT (slug) DO UPDATE SET
  title_no = EXCLUDED.title_no, title_en = EXCLUDED.title_en,
  intro_no = EXCLUDED.intro_no, intro_en = EXCLUDED.intro_en,
  ingredients_no = EXCLUDED.ingredients_no, ingredients_en = EXCLUDED.ingredients_en,
  steps_no = EXCLUDED.steps_no, steps_en = EXCLUDED.steps_en,
  tips_no = EXCLUDED.tips_no, tips_en = EXCLUDED.tips_en,
  mangalitsa_tip_no = EXCLUDED.mangalitsa_tip_no, mangalitsa_tip_en = EXCLUDED.mangalitsa_tip_en,
  difficulty = EXCLUDED.difficulty, prep_time_minutes = EXCLUDED.prep_time_minutes,
  cook_time_minutes = EXCLUDED.cook_time_minutes, servings = EXCLUDED.servings,
  image_url = EXCLUDED.image_url, related_extra_slugs = EXCLUDED.related_extra_slugs,
  display_order = EXCLUDED.display_order, updated_at = NOW();

-- 8. Hjemmelaget smult
INSERT INTO recipes (
  slug, title_no, title_en,
  intro_no, intro_en,
  ingredients_no, ingredients_en,
  steps_no, steps_en,
  tips_no, tips_en,
  mangalitsa_tip_no, mangalitsa_tip_en,
  difficulty, prep_time_minutes, cook_time_minutes, servings,
  image_url, related_extra_slugs, display_order
) VALUES (
  'rendered-lard',
  'Hjemmelaget smult',
  'Homemade Rendered Lard',
  'Slow-rendret Mangalitsa-fett til krystallhvitt smult. Bruk det til alt fra baking til steking — det er den ultimate matfett-oppgraderingen. 2-3 timers prosess med minimal innsats.',
  'Slow-rendered Mangalitsa fat into crystal-white lard. Use it for everything from baking to frying — it is the ultimate cooking fat upgrade. A 2-3 hour process with minimal effort.',
  '[
    {"amount": "2 kg", "item": "Mangalitsa-ryggspekk eller ister (nyrespekk gir hvitere smult)"},
    {"amount": "1 dl", "item": "vann"},
    {"amount": "", "item": "norgesglass eller konserveringsglass til oppbevaring"}
  ]',
  '[
    {"amount": "2 kg", "item": "Mangalitsa back fat or leaf lard (kidney fat yields whiter lard)"},
    {"amount": "100 ml", "item": "water"},
    {"amount": "", "item": "mason jars or preserving jars for storage"}
  ]',
  '[
    "Skjær spekket i 2-3 cm terninger. Jo mindre biter, desto raskere og mer effektiv rendring. Du kan også kjøre det raskt gjennom en kjøttkvern for enda jevnere resultat.",
    "Legg spekket i en tykk gryte (støpejern er ideelt) sammen med vannet. Vannet hindrer at bunnen brenner seg i starten.",
    "Sett på lav varme. Veldig lav. Du skal aldri la fettet koke — det skal smelte stille og rolig med kun små bobler. Start på 2 av 10 på komfyren.",
    "Rør forsiktig hver 20-30 minutter. Etter 1-1,5 timer ser du at klart, gyllent fett begynner å samle seg. De faste bitene (grever) synker til bunnen.",
    "Fortsett å rendre i totalt 2-3 timer. Grevene skal være gylne og sprø, og fettet skal være helt klart. Ikke la grevene bli mørke — det gir smak til smultet.",
    "Sil det smeltede fettet gjennom et finmasket dørslag med osteklut eller kjøkkenpapir over i rene glass. La det kjøle seg litt først slik at du ikke sprekker glassene.",
    "La smultet avkjøle seg til romtemperatur, sett deretter på lokk og oppbevar i kjøleskap. Det stivner til krystallhvitt smult.",
    "Grevene er en delikatesse i seg selv — dryss med flaksalt og spis som snacks, eller bruk i brød og salater."
  ]',
  '[
    "Cut the fat into 2-3 cm cubes. The smaller the pieces, the faster and more efficient the rendering. You can also run it quickly through a meat grinder for even more consistent results.",
    "Place the fat in a heavy pot (cast iron is ideal) along with the water. The water prevents the bottom from scorching at the start.",
    "Set on low heat. Very low. You should never let the fat boil — it should melt quietly with only tiny bubbles. Start at 2 out of 10 on the stove.",
    "Stir gently every 20-30 minutes. After 1-1.5 hours you will see clear, golden fat starting to collect. The solid bits (cracklings) sink to the bottom.",
    "Continue rendering for 2-3 hours total. The cracklings should be golden and crispy, and the fat should be completely clear. Do not let the cracklings darken — it will flavor the lard.",
    "Strain the melted fat through a fine-mesh sieve lined with cheesecloth or paper towels into clean jars. Let it cool slightly first so you do not crack the jars.",
    "Let the lard cool to room temperature, then cap and store in the fridge. It will solidify into crystal-white lard.",
    "The cracklings are a delicacy on their own — sprinkle with flaky salt and eat as snacks, or use in bread and salads."
  ]',
  'Aldri bruk høy varme — det gir gult smult med sterkere smak. Tålmodighet gir hvitere, mildere smult. Ister (nyrespekk) gir det aller hviteste smultet og er best til baking. Ryggspekk gir litt mer smak og er perfekt til steking.',
  'Never use high heat — it produces yellow lard with a stronger flavor. Patience yields whiter, milder lard. Leaf lard (kidney fat) produces the whitest lard and is best for baking. Back fat has a bit more flavor and is perfect for frying.',
  'Mangalitsa-smult er allerede berømt blant kokker som det aller beste matfettet. Det har et høyere innhold av enumettede fettsyrer (oljesyre) enn vanlig griseflott — lignende nivåer som olivenolje. Dette gir et smult som er mykere ved romtemperatur, smelter renere, og har en nøtteaktig rikhet som forvandler alt fra paideig til potetmos.',
  'Mangalitsa lard is already famous among chefs as the ultimate cooking fat. It has a higher content of monounsaturated fatty acids (oleic acid) than regular pork fat — similar levels to olive oil. This produces a lard that is softer at room temperature, melts cleaner, and has a nutty richness that transforms everything from pie crust to mashed potatoes.',
  'easy', 10, 180, 20,
  '/recipes/rendered-lard.jpg',
  ARRAY['extra-smult', 'extra-spekk'],
  8
)
ON CONFLICT (slug) DO UPDATE SET
  title_no = EXCLUDED.title_no, title_en = EXCLUDED.title_en,
  intro_no = EXCLUDED.intro_no, intro_en = EXCLUDED.intro_en,
  ingredients_no = EXCLUDED.ingredients_no, ingredients_en = EXCLUDED.ingredients_en,
  steps_no = EXCLUDED.steps_no, steps_en = EXCLUDED.steps_en,
  tips_no = EXCLUDED.tips_no, tips_en = EXCLUDED.tips_en,
  mangalitsa_tip_no = EXCLUDED.mangalitsa_tip_no, mangalitsa_tip_en = EXCLUDED.mangalitsa_tip_en,
  difficulty = EXCLUDED.difficulty, prep_time_minutes = EXCLUDED.prep_time_minutes,
  cook_time_minutes = EXCLUDED.cook_time_minutes, servings = EXCLUDED.servings,
  image_url = EXCLUDED.image_url, related_extra_slugs = EXCLUDED.related_extra_slugs,
  display_order = EXCLUDED.display_order, updated_at = NOW();

-- 9. Tomahawk-kotelett på grill
INSERT INTO recipes (
  slug, title_no, title_en,
  intro_no, intro_en,
  ingredients_no, ingredients_en,
  steps_no, steps_en,
  tips_no, tips_en,
  mangalitsa_tip_no, mangalitsa_tip_en,
  difficulty, prep_time_minutes, cook_time_minutes, servings,
  image_url, related_extra_slugs, display_order
) VALUES (
  'tomahawk-grill',
  'Tomahawk-kotelett på grill',
  'Grilled Tomahawk Chop',
  'Reverse sear: først indirekte varme til perfekt kjernetemperatur, så full blast over kull for sprø skorpe. En spektakulær Mangalitsa-kotelett med langt bein — den ultimate grillretten.',
  'Reverse sear: indirect heat first to perfect core temperature, then full blast over coals for a crispy crust. A spectacular Mangalitsa chop with the long bone — the ultimate grill dish.',
  '[
    {"amount": "2 stk", "item": "Mangalitsa tomahawk-koteletter (ca. 500-600 g hver, 4-5 cm tykke)"},
    {"amount": "2 ss", "item": "olivenolje"},
    {"amount": "", "item": "grovt havsalt"},
    {"amount": "", "item": "ferskkvernet sort pepper"},
    {"amount": "2 ss", "item": "smør (til avslutning, valgfritt)"},
    {"amount": "2 stk", "item": "kvister frisk rosmarin"}
  ]',
  '[
    {"amount": "2", "item": "Mangalitsa tomahawk chops (about 500-600 g each, 4-5 cm thick)"},
    {"amount": "2 tbsp", "item": "olive oil"},
    {"amount": "", "item": "coarse sea salt"},
    {"amount": "", "item": "freshly cracked black pepper"},
    {"amount": "2 tbsp", "item": "butter (for finishing, optional)"},
    {"amount": "2", "item": "sprigs fresh rosemary"}
  ]',
  '[
    "Ta kotelettene ut av kjøleskapet 1 time før grilling. Salt godt på alle sider og la stå. Saltet trekker ut fuktighet som så trekker tilbake inn og krydrer kjøttet dypt.",
    "Sett opp grillen for to-sone grilling: én side med indirekte varme (ingen kull/brennere), én side med direkte høy varme (glødende kull/maks brennere).",
    "Tørk kotelettene og pensle med olivenolje. Legg på den indirekte sonen med et trådløst steketermometer i tykkeste punkt.",
    "Lukk lokket og la kotelettene steke indirekte i 15-20 minutter til kjernetemperaturen er 50-52°C. Ikke skynd deg — dette steget gir jevn steking hele veien gjennom.",
    "Flytt kotelettene til den direkte, glødende sonen. Stek 1-2 minutter per side for en mørk, sprø skorpe. Pass beinet — vikle det i folie om nødvendig.",
    "Total kjernetemperatur ved avslutning: 55-58°C (den stiger 3-5 grader under hvile). Smør en klatt smør og en rosmarinkvist oppå om du vil.",
    "Hvil i 10 minutter på et skjærebrett. Dekk løst med folie.",
    "Server på et trebrett med grovt salt. La gjestene skjære selv. Beinet er håndtaket."
  ]',
  '[
    "Remove the chops from the fridge 1 hour before grilling. Salt generously on all sides and let stand. The salt draws out moisture that then gets reabsorbed, seasoning the meat deeply.",
    "Set up the grill for two-zone grilling: one side with indirect heat (no coals/burners), one side with direct high heat (glowing coals/max burners).",
    "Pat the chops dry and brush with olive oil. Place on the indirect zone with a wireless meat thermometer in the thickest part.",
    "Close the lid and let the chops cook indirectly for 15-20 minutes until the core temperature reaches 50-52°C. Do not rush — this step ensures even cooking throughout.",
    "Move the chops to the direct, glowing zone. Sear 1-2 minutes per side for a dark, crispy crust. Watch the bone — wrap it in foil if needed.",
    "Target core temperature at finish: 55-58°C (it will rise 3-5 degrees during rest). Place a knob of butter and a rosemary sprig on top if you like.",
    "Rest for 10 minutes on a cutting board. Cover loosely with foil.",
    "Serve on a wooden board with coarse salt. Let guests carve themselves. The bone is the handle."
  ]',
  'Reverse sear er nøkkelen for tykke koteletter — det gir rosa kjøtt fra kant til kant med bare en tynn brun skorpe ytterst. Tradisjonell metode (direkte først) gir en tykk grå sone under skorpen.',
  'Reverse sear is the key for thick chops — it gives pink meat from edge to edge with just a thin brown crust on the outside. The traditional method (direct first) creates a thick gray zone under the crust.',
  'En Mangalitsa tomahawk er en helt annen opplevelse enn vanlig svinekotelett. Det rike fettet smelter sakte under den indirekte stekingen og baster kjøttet innenfra. Resultatet er en kotelett som smaker nærmere en dyr biff enn vanlig svin. Fettmarmorering betyr også at du kan trekke kjernetemperaturen litt høyere uten å miste saftighet.',
  'A Mangalitsa tomahawk is an entirely different experience from a regular pork chop. The rich fat melts slowly during indirect cooking, basting the meat from within. The result is a chop that tastes closer to a premium steak than regular pork. The fat marbling also means you can push the core temperature slightly higher without losing juiciness.',
  'medium', 15, 25, 2,
  '/recipes/tomahawk-grill.jpg',
  ARRAY['extra-tomahawk'],
  9
)
ON CONFLICT (slug) DO UPDATE SET
  title_no = EXCLUDED.title_no, title_en = EXCLUDED.title_en,
  intro_no = EXCLUDED.intro_no, intro_en = EXCLUDED.intro_en,
  ingredients_no = EXCLUDED.ingredients_no, ingredients_en = EXCLUDED.ingredients_en,
  steps_no = EXCLUDED.steps_no, steps_en = EXCLUDED.steps_en,
  tips_no = EXCLUDED.tips_no, tips_en = EXCLUDED.tips_en,
  mangalitsa_tip_no = EXCLUDED.mangalitsa_tip_no, mangalitsa_tip_en = EXCLUDED.mangalitsa_tip_en,
  difficulty = EXCLUDED.difficulty, prep_time_minutes = EXCLUDED.prep_time_minutes,
  cook_time_minutes = EXCLUDED.cook_time_minutes, servings = EXCLUDED.servings,
  image_url = EXCLUDED.image_url, related_extra_slugs = EXCLUDED.related_extra_slugs,
  display_order = EXCLUDED.display_order, updated_at = NOW();

-- 10. Svine-entrecôte i jernpanne
INSERT INTO recipes (
  slug, title_no, title_en,
  intro_no, intro_en,
  ingredients_no, ingredients_en,
  steps_no, steps_en,
  tips_no, tips_en,
  mangalitsa_tip_no, mangalitsa_tip_en,
  difficulty, prep_time_minutes, cook_time_minutes, servings,
  image_url, related_extra_slugs, display_order
) VALUES (
  'pork-ribeye-pan',
  'Svine-entrecôte i jernpanne',
  'Pork Ribeye in Cast Iron',
  'Behandle denne som en dyr biff — varm jernpanne, smør, og konstant basting. Mangalitsa svine-entrecôte har en marmorering som minner om ekte entrecôte, og fortjener samme respekt.',
  'Treat this like an expensive steak — hot cast iron, butter, and constant basting. Mangalitsa pork ribeye has a marbling reminiscent of real ribeye, and deserves the same respect.',
  '[
    {"amount": "2 stk", "item": "Mangalitsa svine-entrecôte (ca. 250-300 g, 3 cm tykke)"},
    {"amount": "1 ss", "item": "nøytral olje med høyt røykpunkt"},
    {"amount": "40 g", "item": "smør"},
    {"amount": "2 stk", "item": "fedd hvitløk, knust"},
    {"amount": "3 stk", "item": "kvister fersk timian"},
    {"amount": "", "item": "flaksalt og ferskkvernet sort pepper"}
  ]',
  '[
    {"amount": "2", "item": "Mangalitsa pork ribeye steaks (about 250-300 g, 3 cm thick)"},
    {"amount": "1 tbsp", "item": "neutral oil with high smoke point"},
    {"amount": "40 g", "item": "butter"},
    {"amount": "2", "item": "garlic cloves, crushed"},
    {"amount": "3", "item": "sprigs fresh thyme"},
    {"amount": "", "item": "flaky salt and freshly cracked black pepper"}
  ]',
  '[
    "Ta biffene ut av kjøleskapet 30 minutter i forveien. Tørk godt med kjøkkenpapir — fuktighet er fienden til god bruning. Krydre med salt og pepper.",
    "Varm en jernpanne på høy varme til den akkurat begynner å ryke. Tilsett olje og fordel jevnt.",
    "Legg biffene forsiktig i pannen (bort fra deg for å unngå sprut). Stek i 3-4 minutter uten å røre — la Maillard-reaksjonen gjøre jobben.",
    "Snu biffene. Skru ned til middels varme. Tilsett smør, hvitløk og timian. Når smøret skummer, vipp pannen og øs det brunede smøret over biffene med en skje. Bast i 3-4 minutter.",
    "Sjekk kjernetemperaturen: 60-63°C for en rosa, saftig kjerne. Mangalitsa tåler litt mer enn vanlig svineentrecôte.",
    "Ta av varmen og la hvile i 5 minutter. Øs litt av pannesausen over.",
    "Skjær i 1 cm skiver og server med flaksalt og resten av urtesmøret fra pannen."
  ]',
  '[
    "Remove the steaks from the fridge 30 minutes ahead. Pat dry thoroughly with paper towels — moisture is the enemy of a good sear. Season with salt and pepper.",
    "Heat a cast iron pan on high heat until it just begins to smoke. Add oil and swirl to coat evenly.",
    "Carefully place the steaks in the pan (away from you to avoid splatter). Cook for 3-4 minutes without touching — let the Maillard reaction do its work.",
    "Flip the steaks. Reduce to medium heat. Add butter, garlic, and thyme. When the butter foams, tilt the pan and baste the steaks with the browned butter using a spoon. Baste for 3-4 minutes.",
    "Check the core temperature: 60-63°C for a pink, juicy center. Mangalitsa tolerates a bit more than regular pork ribeye.",
    "Remove from heat and rest for 5 minutes. Spoon some of the pan sauce over the top.",
    "Slice into 1 cm slices and serve with flaky salt and the remaining herb butter from the pan."
  ]',
  'Varm panne, tørt kjøtt, og tålmodighet — dette er de tre reglene for perfekt bruning. Aldri overbefolke pannen; stek én biff om gangen om pannen er liten.',
  'Hot pan, dry meat, and patience — these are the three rules for perfect browning. Never overcrowd the pan; cook one steak at a time if the pan is small.',
  'Mangalitsa svine-entrecôte har en fettmarmorering som ligner storfe-entrecôte mer enn noen annen svineras. Dette fettet smelter under steking og gir en selvbastende effekt som holder kjøttet utrolig saftigt. Selv om du ender opp på 65°C i kjernen, vil en Mangalitsa-entrecôte fremdeles være saftig der vanlig svineentrecôte ville vært tørr.',
  'Mangalitsa pork ribeye has a fat marbling that resembles beef ribeye more than any other pork cut. This fat melts during cooking, creating a self-basting effect that keeps the meat incredibly juicy. Even if you end up at 65°C core, a Mangalitsa ribeye will still be juicy where regular pork ribeye would be dry.',
  'easy', 5, 10, 2,
  '/recipes/pork-ribeye-pan.jpg',
  ARRAY['extra-svine-entrecote'],
  10
)
ON CONFLICT (slug) DO UPDATE SET
  title_no = EXCLUDED.title_no, title_en = EXCLUDED.title_en,
  intro_no = EXCLUDED.intro_no, intro_en = EXCLUDED.intro_en,
  ingredients_no = EXCLUDED.ingredients_no, ingredients_en = EXCLUDED.ingredients_en,
  steps_no = EXCLUDED.steps_no, steps_en = EXCLUDED.steps_en,
  tips_no = EXCLUDED.tips_no, tips_en = EXCLUDED.tips_en,
  mangalitsa_tip_no = EXCLUDED.mangalitsa_tip_no, mangalitsa_tip_en = EXCLUDED.mangalitsa_tip_en,
  difficulty = EXCLUDED.difficulty, prep_time_minutes = EXCLUDED.prep_time_minutes,
  cook_time_minutes = EXCLUDED.cook_time_minutes, servings = EXCLUDED.servings,
  image_url = EXCLUDED.image_url, related_extra_slugs = EXCLUDED.related_extra_slugs,
  display_order = EXCLUDED.display_order, updated_at = NOW();

-- 11. Lag din egen pancetta
INSERT INTO recipes (
  slug, title_no, title_en,
  intro_no, intro_en,
  ingredients_no, ingredients_en,
  steps_no, steps_en,
  tips_no, tips_en,
  mangalitsa_tip_no, mangalitsa_tip_en,
  difficulty, prep_time_minutes, cook_time_minutes, servings,
  image_url, related_extra_slugs, display_order
) VALUES (
  'pancetta-project',
  'Lag din egen pancetta',
  'Make Your Own Pancetta',
  'Hjemmelaget pancetta fra Mangalitsa-buken. Salt i 7 dager, krydre med pepper, fennikel og einebær, rull stramt og heng i 4-6 uker. Resultatet er en pancetta med tykkere, rikere fettlag enn noe du kan kjøpe.',
  'Homemade pancetta from Mangalitsa belly. Salt for 7 days, season with pepper, fennel, and juniper, roll tightly, and hang for 4-6 weeks. The result is a pancetta with thicker, richer fat layers than anything you can buy.',
  '[
    {"amount": "2 kg", "item": "Mangalitsa-svinebryst (buken), med svoren fjernet"},
    {"amount": "60 g", "item": "grovt havsalt"},
    {"amount": "3 g", "item": "kur-salt nr. 2 (nitrat)"},
    {"amount": "10 g", "item": "ferskkvernet sort pepper"},
    {"amount": "1 ss", "item": "fennikelfrø, lett knust"},
    {"amount": "1 ss", "item": "einebær, knust"},
    {"amount": "4 stk", "item": "lauerbærblad, knust"},
    {"amount": "4 stk", "item": "fedd hvitløk, finhakket"},
    {"amount": "1 ts", "item": "tørket timian"},
    {"amount": "1 ts", "item": "chiliflak (valgfritt)"},
    {"amount": "", "item": "kjøkkenhyssing"}
  ]',
  '[
    {"amount": "2 kg", "item": "Mangalitsa pork belly, skin removed"},
    {"amount": "60 g", "item": "coarse sea salt"},
    {"amount": "3 g", "item": "curing salt #2 (nitrate)"},
    {"amount": "10 g", "item": "freshly cracked black pepper"},
    {"amount": "1 tbsp", "item": "fennel seeds, lightly crushed"},
    {"amount": "1 tbsp", "item": "juniper berries, crushed"},
    {"amount": "4", "item": "bay leaves, crushed"},
    {"amount": "4", "item": "garlic cloves, finely chopped"},
    {"amount": "1 tsp", "item": "dried thyme"},
    {"amount": "1 tsp", "item": "chili flakes (optional)"},
    {"amount": "", "item": "butcher''s twine"}
  ]',
  '[
    "Legg svinebrystet med kjøttsiden opp på et rent skjærebrett. Trimme bort eventuelle løse biter og ujevnheter slik at du har et noenlunde rektangulært stykke.",
    "Bland salt, kur-salt, pepper, fennikelfrø, einebær, lauerbærblad, hvitløk, timian og chiliflak. Gni krydderblandingen inn i kjøttet på alle sider — vær grundig.",
    "Legg det krydrede kjøttet i en vakuumpose eller stor ziplock med luften presset ut. Legg i kjøleskapet i 7 dager. Snu posen hver dag.",
    "Etter 7 dager: ta ut kjøttet, skyll av saltet under kaldt rennende vann. Tørk grundig med kjøkkenpapir.",
    "Dryss ekstra pepper og fennikelfrø over kjøttsiden. Rull buken stramt, som en sveitsisk rull, med kjøttsiden inn. Rull så stramt du kan.",
    "Bind med hyssing i spiralmønster med ca. 2 cm mellomrom. Start i den ene enden og jobb deg systematisk til den andre. Bind ekstra knuter i begge ender.",
    "Heng pancettaen på et kjølig, luftig sted (12-15°C, 70-80% luftfuktighet) i 4-6 uker. Veie den ved start og mål vekttapet — den er klar ved 30% vekttap.",
    "Skjær i tynne skiver med en skarp kniv. Spis som den er på et spekebrett, eller bruk i matlaging — pannestekt pancetta er fantastisk i pasta, salater og på pizza."
  ]',
  '[
    "Place the pork belly meat-side up on a clean cutting board. Trim off any loose pieces and irregularities to get a roughly rectangular piece.",
    "Mix salt, curing salt, pepper, fennel seeds, juniper berries, bay leaves, garlic, thyme, and chili flakes. Rub the spice mixture into the meat on all sides — be thorough.",
    "Place the seasoned meat in a vacuum bag or large ziplock with the air pressed out. Refrigerate for 7 days. Flip the bag daily.",
    "After 7 days: remove the meat, rinse off the salt under cold running water. Dry thoroughly with paper towels.",
    "Sprinkle extra pepper and fennel seeds over the meat side. Roll the belly tightly, like a Swiss roll, with the meat side in. Roll as tightly as you can.",
    "Tie with twine in a spiral pattern at about 2 cm intervals. Start at one end and work systematically to the other. Tie extra knots at both ends.",
    "Hang the pancetta in a cool, airy place (12-15°C, 70-80% humidity) for 4-6 weeks. Weigh it at the start and track weight loss — it is ready at 30% weight loss.",
    "Slice thin with a sharp knife. Eat as-is on a charcuterie board, or use in cooking — pan-fried pancetta is fantastic in pasta, salads, and on pizza."
  ]',
  'Hyssingen er viktigere enn du tror — en løst bundet pancetta tørker ujevnt og kan få luftlommer der mugg kan vokse innvendig. Rull stramt og bind fast. Bruk en nål for å stikke hull i luftlommer om du ser dem.',
  'The twine is more important than you think — a loosely tied pancetta dries unevenly and can develop air pockets where mold can grow internally. Roll tight and tie securely. Use a needle to puncture air pockets if you spot them.',
  'Mangalitsa-buk har tykkere fettlag enn vanlig gris, ofte 3-4 cm ren hvit fett mellom kjøttlagene. Dette betyr en pancetta som er ekstra rik og smøraktig. Fettlagene tørker saktere og beskytter kjøttet mot for rask uttørking. Resultatet er en pancetta som smelter på tungen på en måte vanlig pancetta aldri kan.',
  'Mangalitsa belly has thicker fat layers than regular pork, often 3-4 cm of pure white fat between the meat layers. This means a pancetta that is extra rich and buttery. The fat layers dry more slowly and protect the meat from drying too quickly. The result is a pancetta that melts on the tongue in a way regular pancetta never can.',
  'hard', 30, 0, 20,
  '/recipes/pancetta-project.jpg',
  ARRAY['extra-pancetta'],
  11
)
ON CONFLICT (slug) DO UPDATE SET
  title_no = EXCLUDED.title_no, title_en = EXCLUDED.title_en,
  intro_no = EXCLUDED.intro_no, intro_en = EXCLUDED.intro_en,
  ingredients_no = EXCLUDED.ingredients_no, ingredients_en = EXCLUDED.ingredients_en,
  steps_no = EXCLUDED.steps_no, steps_en = EXCLUDED.steps_en,
  tips_no = EXCLUDED.tips_no, tips_en = EXCLUDED.tips_en,
  mangalitsa_tip_no = EXCLUDED.mangalitsa_tip_no, mangalitsa_tip_en = EXCLUDED.mangalitsa_tip_en,
  difficulty = EXCLUDED.difficulty, prep_time_minutes = EXCLUDED.prep_time_minutes,
  cook_time_minutes = EXCLUDED.cook_time_minutes, servings = EXCLUDED.servings,
  image_url = EXCLUDED.image_url, related_extra_slugs = EXCLUDED.related_extra_slugs,
  display_order = EXCLUDED.display_order, updated_at = NOW();

-- 12. Lag din egen spekeskinke
INSERT INTO recipes (
  slug, title_no, title_en,
  intro_no, intro_en,
  ingredients_no, ingredients_en,
  steps_no, steps_en,
  tips_no, tips_en,
  mangalitsa_tip_no, mangalitsa_tip_en,
  difficulty, prep_time_minutes, cook_time_minutes, servings,
  image_url, related_extra_slugs, display_order
) VALUES (
  'cure-ham',
  'Lag din egen spekeskinke',
  'Make Your Own Dry-Cured Ham',
  'Det ultimate spekkprosjektet: en hel Mangalitsa-skinke saltet, vasket, tørket og hengt i 12-36 måneder. Norges svar på prosciutto — men med Mangalitsas ekstraordinære fett som gir en silkemyk, kompleks skinke.',
  'The ultimate curing project: a whole Mangalitsa ham salted, washed, dried, and hung for 12-36 months. Norway''s answer to prosciutto — but with Mangalitsa''s extraordinary fat producing a silky, complex ham.',
  '[
    {"amount": "1 stk", "item": "Mangalitsa-skinke, hel med bein og klauv (8-12 kg)"},
    {"amount": "ca. 4 kg", "item": "grovt havsalt (ca. 500 g per kg kjøtt)"},
    {"amount": "", "item": "manteca (smult) til forsegning (valgfritt)"},
    {"amount": "", "item": "bomullspose eller osteklut til tildekking"}
  ]',
  '[
    {"amount": "1", "item": "Mangalitsa ham, whole with bone and trotter (8-12 kg)"},
    {"amount": "about 4 kg", "item": "coarse sea salt (about 500 g per kg of meat)"},
    {"amount": "", "item": "manteca (lard) for sealing (optional)"},
    {"amount": "", "item": "cotton bag or cheesecloth for covering"}
  ]',
  '[
    "Inspiser skinken nøye. Den skal være fri for kutt og skader i skinnet, som er den naturlige beskyttelsen under modning. Press ut eventuelt restblod fra blodårene ved å stryke langs beinet.",
    "Dekk bunnen av en stor plastboks eller treboks med et tykt lag havsalt (5 cm). Legg skinken med skinnsiden ned. Dekk fullstendig med salt — pakk ekstra rundt beinet og leddene. Vekten av saltet skal presse jevnt.",
    "Sett i kjøleskap eller kjølig rom (2-5°C). La salte i 1 dag per kg (f.eks. 10 dager for en 10 kg skinke). Snu halvveis og legg nytt salt over.",
    "Etter saltingen: børst av alt salt grundig. Vask skinken under kaldt rennende vann. Tørk med rene håndklær.",
    "Heng skinken i et kjølig, trekkfritt rom i 2-3 uker ved 3-5°C for å utjevne saltinnholdet. Saltet vil vandre fra de salteste delene (overflaten) til kjernen.",
    "Flytt til et modningsrom med 12-15°C og 70-80% luftfuktighet. Heng med klauen opp. Du kan smøre eksponert kjøtt (rundt beinet) med smult for å hindre for rask uttørking.",
    "La skinken henge i minimum 12 måneder. 18-24 måneder gir en mer kompleks smak. 36 måneder for den ultimate opplevelsen. Sjekk jevnlig for skadelig mugg. Hvitt mugg er bra.",
    "Test modenheten med en beinnål: stikk inn nær beinet, trekk ut og lukt. En søt, nøtteaktig aroma betyr at skinken er klar. Skjær papiertynne skiver med en lang, skarp kniv."
  ]',
  '[
    "Inspect the ham carefully. It should be free from cuts and damage to the skin, which is the natural protection during aging. Press out any residual blood from the veins by stroking along the bone.",
    "Cover the bottom of a large plastic or wooden box with a thick layer of sea salt (5 cm). Place the ham skin-side down. Cover completely with salt — pack extra around the bone and joints. The weight of the salt should press evenly.",
    "Place in the fridge or a cold room (2-5°C). Cure for 1 day per kg (e.g., 10 days for a 10 kg ham). Flip halfway through and add fresh salt on top.",
    "After curing: brush off all salt thoroughly. Wash the ham under cold running water. Dry with clean towels.",
    "Hang the ham in a cool, draft-free room for 2-3 weeks at 3-5°C to equalize the salt content. The salt will migrate from the saltiest parts (surface) to the core.",
    "Move to a curing room at 12-15°C and 70-80% humidity. Hang with the trotter facing up. You can rub exposed meat (around the bone) with lard to prevent excessive drying.",
    "Let the ham hang for a minimum of 12 months. 18-24 months gives more complex flavor. 36 months for the ultimate experience. Check regularly for harmful mold. White mold is good.",
    "Test ripeness with a bone needle: insert near the bone, pull out, and smell. A sweet, nutty aroma means the ham is ready. Slice paper-thin with a long, sharp knife."
  ]',
  'Temperatur- og fuktighetskontroll er alt. Invester i et hygrometer og termometer. Unngå trekk de første månedene. Hvis skinken tørker for raskt på overflaten, smør med smult. Tålmodighet er den viktigste ingrediensen.',
  'Temperature and humidity control is everything. Invest in a hygrometer and thermometer. Avoid drafts during the first months. If the ham dries too fast on the surface, coat with lard. Patience is the most important ingredient.',
  'Mangalitsa er den perfekte rasen for spekeskinke. Det tykke fettlaget på utsiden (ofte 4-6 cm) fungerer som en naturlig barriere mot uttørking og oksidasjon — akkurat som iberico-grisens fett gjør for jamón ibérico. Over 12-36 måneder trenger dette fettet sakte inn i kjøttet og skaper en smeltefrossen, kompleks smak som vanlig gris aldri kan oppnå. Mangalitsas høye andel oljesyre (en enumettet fettsyre) hindrer harskning og gir en søtere, renere smak over lang modning.',
  'Mangalitsa is the perfect breed for dry-cured ham. The thick outer fat layer (often 4-6 cm) acts as a natural barrier against drying and oxidation — just as iberico pig fat does for jamón ibérico. Over 12-36 months, this fat slowly penetrates the meat, creating a melt-in-your-mouth, complex flavor that regular pork can never achieve. Mangalitsa''s high oleic acid content (a monounsaturated fatty acid) prevents rancidity and produces a sweeter, cleaner flavor over long aging.',
  'hard', 60, 0, 40,
  '/recipes/cure-ham.jpg',
  ARRAY['extra-skinke-speking'],
  12
)
ON CONFLICT (slug) DO UPDATE SET
  title_no = EXCLUDED.title_no, title_en = EXCLUDED.title_en,
  intro_no = EXCLUDED.intro_no, intro_en = EXCLUDED.intro_en,
  ingredients_no = EXCLUDED.ingredients_no, ingredients_en = EXCLUDED.ingredients_en,
  steps_no = EXCLUDED.steps_no, steps_en = EXCLUDED.steps_en,
  tips_no = EXCLUDED.tips_no, tips_en = EXCLUDED.tips_en,
  mangalitsa_tip_no = EXCLUDED.mangalitsa_tip_no, mangalitsa_tip_en = EXCLUDED.mangalitsa_tip_en,
  difficulty = EXCLUDED.difficulty, prep_time_minutes = EXCLUDED.prep_time_minutes,
  cook_time_minutes = EXCLUDED.cook_time_minutes, servings = EXCLUDED.servings,
  image_url = EXCLUDED.image_url, related_extra_slugs = EXCLUDED.related_extra_slugs,
  display_order = EXCLUDED.display_order, updated_at = NOW();
