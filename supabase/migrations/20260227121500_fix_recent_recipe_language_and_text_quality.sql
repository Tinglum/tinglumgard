-- ============================================================================
-- Fix language quality for recently added recipes
-- Date: 2026-02-27
-- ============================================================================

CREATE OR REPLACE FUNCTION public._fix_mojibake_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN input IS NULL THEN NULL
    ELSE replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(
                      input,
                      'Ã¦', 'æ'
                    ),
                    'Ã¸', 'ø'
                  ),
                  'Ã¥', 'å'
                ),
                'Ã†', 'Æ'
              ),
              'Ã˜', 'Ø'
            ),
            'Ã…', 'Å'
          ),
          'Â°C', '°C'
        ),
        'Â°', '°'
      ),
      'Ã©', 'é'
    )
  END;
$$;

UPDATE recipes
SET
  title_no = public._fix_mojibake_text(title_no),
  title_en = public._fix_mojibake_text(title_en),
  intro_no = public._fix_mojibake_text(intro_no),
  intro_en = public._fix_mojibake_text(intro_en),
  ingredients_no = public._fix_mojibake_text(ingredients_no::text)::jsonb,
  ingredients_en = public._fix_mojibake_text(ingredients_en::text)::jsonb,
  steps_no = public._fix_mojibake_text(steps_no::text)::jsonb,
  steps_en = public._fix_mojibake_text(steps_en::text)::jsonb,
  tips_no = public._fix_mojibake_text(tips_no),
  tips_en = public._fix_mojibake_text(tips_en),
  mangalitsa_tip_no = public._fix_mojibake_text(mangalitsa_tip_no),
  mangalitsa_tip_en = public._fix_mojibake_text(mangalitsa_tip_en),
  updated_at = NOW()
WHERE slug IN (
  'ullgris-ribbe-langstekt',
  'ullgris-ribbe-rask',
  'asiatisk-ribbe-glaze',
  'indrefilet-smor',
  'ytrefilet-medaljonger',
  'koteletter-panne',
  'bog-langtid',
  'karbonader-husmann',
  'lapskaus-kjottbiter',
  'ullgris-polser-lok',
  'kamsteik-eple',
  'knoke-kraft',
  'tomahawk-chimichurri',
  'secreto-miso-sesam',
  'koteletter-harissa-yoghurt',
  'bog-carnitas-lime',
  'kjottdeig-kofta-tahini',
  'polser-currywurst-kimchi'
);

DROP FUNCTION public._fix_mojibake_text(text);

UPDATE recipes
SET
  title_no = 'Tomahawk av ullgris med chimichurri og grillet sitron',
  intro_no = 'En kraftig steak-opplevelse med urtefrisk chimichurri og sotet sitron. En helt annen profil enn klassisk norsk husmann.',
  ingredients_no = '[
    {"amount":"1,2 kg","item":"tomahawk av ullgris"},
    {"amount":"1 ss","item":"nøytral olje"},
    {"amount":"","item":"salt og sort pepper"},
    {"amount":"1 bunt","item":"bladpersille, finhakket"},
    {"amount":"1 ss","item":"oregano, finhakket"},
    {"amount":"2 fedd","item":"hvitløk, finhakket"},
    {"amount":"2 ss","item":"rødvinseddik"},
    {"amount":"1 dl","item":"olivenolje"},
    {"amount":"1 ts","item":"chiliflak"},
    {"amount":"1 stk","item":"sitron, delt i to"}
  ]'::jsonb,
  steps_no = '[
    "Temperer kjøttet i 30-45 minutter. Krydre godt med salt og pepper.",
    "Stek eller grill tomahawk på høy varme i 3-4 minutter per side for stekeskorpe.",
    "Flytt til indirekte varme eller 160 °C ovn til kjernetemperatur 58-60 °C.",
    "Bland persille, oregano, hvitløk, eddik, olivenolje og chiliflak til chimichurri.",
    "Grill sitronflatene raskt til lett sotet overflate.",
    "La kjøttet hvile i 10 minutter. Skjær i skiver og server med chimichurri og grillet sitron."
  ]'::jsonb,
  tips_no = 'Skjær alltid på tvers av fibrene, ellers mister du mørheten i skivene.',
  mangalitsa_tip_no = 'Tomahawk av ullgris har tydelig marmorering som holder stykket saftig selv med hard stekeskorpe.',
  updated_at = NOW()
WHERE slug = 'tomahawk-chimichurri';

UPDATE recipes
SET
  title_no = 'Secreto av ullgris med miso, sesam og lime',
  intro_no = 'Rask japansk-inspirert oppskrift der miso gir dyp umami og lime kutter gjennom fettet.',
  ingredients_no = '[
    {"amount":"900 g","item":"secreto av ullgris"},
    {"amount":"2 ss","item":"hvit miso"},
    {"amount":"2 ss","item":"soyasaus"},
    {"amount":"1 ss","item":"honning"},
    {"amount":"1 ss","item":"sesamolje"},
    {"amount":"1 ss","item":"revet ingefær"},
    {"amount":"1 stk","item":"lime, finrevet skall + saft"},
    {"amount":"1 ss","item":"ristede sesamfrø"},
    {"amount":"1 neve","item":"koriander"}
  ]'::jsonb,
  steps_no = '[
    "Rør sammen miso, soyasaus, honning, sesamolje, ingefær og halvparten av limesaften.",
    "Vend secreto i marinaden og la trekke i 20 minutter.",
    "Stek i glovarm panne i 2-3 minutter per side til tydelig stekeskorpe.",
    "Skru ned varmen siste minutt og pensle med restmarinaden.",
    "La hvile i 5-7 minutter, skjær i tynne skiver.",
    "Topp med sesamfrø, koriander og resten av limesaften."
  ]'::jsonb,
  tips_no = 'Bruk høy varme og kort tid. Secreto blir best når det fortsatt er saftig i kjernen.',
  mangalitsa_tip_no = 'Secreto fra ullgris har fettlag som smelter raskt og gir en nesten smøraktig munnfølelse.',
  updated_at = NOW()
WHERE slug = 'secreto-miso-sesam';

UPDATE recipes
SET
  title_no = 'Ullgris-koteletter med harissa, yoghurt og mynte',
  intro_no = 'Nord-afrikansk inspirert kotelettrett med varme krydder, frisk yoghurt og urter.',
  ingredients_no = '[
    {"amount":"4 stk","item":"koteletter av ullgris"},
    {"amount":"2 ss","item":"harissa"},
    {"amount":"2 ss","item":"olivenolje"},
    {"amount":"1 ts","item":"spisskummen"},
    {"amount":"300 g","item":"gresk yoghurt"},
    {"amount":"1 fedd","item":"hvitløk, finrevet"},
    {"amount":"1 ss","item":"sitronsaft"},
    {"amount":"1 neve","item":"mynte, grovhakket"},
    {"amount":"","item":"salt og sort pepper"}
  ]'::jsonb,
  steps_no = '[
    "Bland harissa, olivenolje, spisskummen, salt og pepper. Gni kotelettene inn.",
    "La kotelettene marinere i minst 20 minutter.",
    "Rør yoghurt med hvitløk, sitronsaft og halvparten av mynten.",
    "Stek kotelettene 3-4 minutter per side i varm panne til 62-64 °C kjernetemperatur.",
    "La hvile i 5 minutter.",
    "Server med yoghurtdressing og resten av mynten over."
  ]'::jsonb,
  tips_no = 'Ikke overstek. Koteletter med fettkant blir best når de får hvile og så skjæres med saften i behold.',
  mangalitsa_tip_no = 'Marmoreringen i ullgris-koteletter tar opp krydder godt og gir ekstra saftig resultat under sterk varme.',
  updated_at = NOW()
WHERE slug = 'koteletter-harissa-yoghurt';

UPDATE recipes
SET
  title_no = 'Sprø carnitas av ullgris-bog med lime og koriander',
  intro_no = 'Langtidsbakt bog som trekkes fra hverandre og stekes sprø i eget fett. Perfekt til tortilla, ris eller salat.',
  ingredients_no = '[
    {"amount":"1,8 kg","item":"bog av ullgris i store biter"},
    {"amount":"2 ts","item":"flaksalt"},
    {"amount":"1 ts","item":"sort pepper"},
    {"amount":"1 ts","item":"spisskummen"},
    {"amount":"1 ts","item":"tørket oregano"},
    {"amount":"1 ts","item":"røkt paprika"},
    {"amount":"3 dl","item":"appelsinjuice"},
    {"amount":"1 dl","item":"limesaft"},
    {"amount":"4 fedd","item":"hvitløk, knust"},
    {"amount":"1 neve","item":"koriander"}
  ]'::jsonb,
  steps_no = '[
    "Krydre bogbitene med salt, pepper, spisskummen, oregano og røkt paprika.",
    "Legg i ildfast form med hvitløk, appelsinjuice og halvparten av limesaften.",
    "Dekk tett og bak på 150 °C i 3-3,5 timer til kjøttet faller fra hverandre.",
    "Riv kjøttet med to gafler.",
    "Stek det revne kjøttet hardt i panne eller under grillfunksjon til kantene blir sprø.",
    "Vend inn resten av limesaften og topp med koriander."
  ]'::jsonb,
  tips_no = 'Stek alltid kjøttet sprø helt til slutt. Det gir stor kontrast mot den saftige kjernen.',
  mangalitsa_tip_no = 'Bog fra ullgris har kollagen og fett som gir silkemyk tekstur etter lang steketid, men kan fortsatt bli sprø i overflaten.',
  updated_at = NOW()
WHERE slug = 'bog-carnitas-lime';

UPDATE recipes
SET
  title_no = 'Ullgris-kofta med tahini, sitron og mynte',
  intro_no = 'Midtøstlig inspirert hverdagsrett med krydret kofta og kremet tahinisaus.',
  ingredients_no = '[
    {"amount":"800 g","item":"grov kjøttdeig av ullgris"},
    {"amount":"1 stk","item":"egg"},
    {"amount":"2 fedd","item":"hvitløk, finhakket"},
    {"amount":"1 ts","item":"spisskummen"},
    {"amount":"1 ts","item":"koriander, malt"},
    {"amount":"1 ts","item":"paprikapulver"},
    {"amount":"1 ss","item":"mynte, finhakket"},
    {"amount":"3 ss","item":"tahini"},
    {"amount":"2 ss","item":"gresk yoghurt"},
    {"amount":"1 ss","item":"sitronsaft"},
    {"amount":"","item":"salt og sort pepper"}
  ]'::jsonb,
  steps_no = '[
    "Bland kjøttdeig, egg, hvitløk, krydder og mynte. Form 10-12 avlange kofta.",
    "Stek kofta i medium varm panne med litt olje i 4-5 minutter per side.",
    "Rør sammen tahini, yoghurt, sitronsaft og en liten skvett vann til silkemyk saus.",
    "Smak sausen til med salt og pepper.",
    "Server kofta med tahinisaus, ekstra mynte og varme lefser eller ris."
  ]'::jsonb,
  tips_no = 'Hvis farsen kjennes løs, la den hvile 10 minutter i kjøleskap for bedre binding.',
  mangalitsa_tip_no = 'Fettet i ullgris-kjøttdeig gir saftige kofta uten behov for brødsmuler eller ekstra fettstoff.',
  updated_at = NOW()
WHERE slug = 'kjottdeig-kofta-tahini';

UPDATE recipes
SET
  title_no = 'Ullgris-pølser med currywurst-saus og kimchi',
  intro_no = 'Tysk street food møter koreansk syre: fyldig tomat-currysaus, sprø stekeskorpe og frisk kimchi.',
  ingredients_no = '[
    {"amount":"800 g","item":"ullgris-pølser"},
    {"amount":"2 ss","item":"tomatpure"},
    {"amount":"2 dl","item":"passata"},
    {"amount":"1 ss","item":"honning"},
    {"amount":"1 ss","item":"mild curry"},
    {"amount":"1 ts","item":"røkt paprika"},
    {"amount":"1 ts","item":"worcestershire saus"},
    {"amount":"1 ss","item":"rødvinseddik"},
    {"amount":"2 ss","item":"smør"},
    {"amount":"200 g","item":"kimchi"}
  ]'::jsonb,
  steps_no = '[
    "Stek pølsene i smør på medium varme til de er gjennomvarme og gylne.",
    "Ta pølsene ut av pannen. Tilsett tomatpure og stek i 1 minutt.",
    "Rør inn passata, honning, curry, paprika, worcestershire og eddik.",
    "La sausen småkoke i 6-8 minutter til den blir tykk og blank.",
    "Skjær pølsene i biter, vend i sausen og server med kimchi ved siden av."
  ]'::jsonb,
  tips_no = 'Vil du ha ekstra sprø overflate, trekk pølsene raskt under grill de siste 2 minuttene.',
  mangalitsa_tip_no = 'Ullgris-pølser beholder saftigheten selv ved dobbel varmebehandling, noe som passer perfekt til currywurst-stil.',
  updated_at = NOW()
WHERE slug = 'polser-currywurst-kimchi';
