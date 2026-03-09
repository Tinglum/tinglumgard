-- Align egg breed copy with hatching-focused breeding messaging.
-- Removes wording that implies table-egg sales and clarifies Ayam Cemani egg color.

UPDATE egg_breeds
SET
  description = 'Sjelden indonesisk rase med helsvart uttrykk. Eggene er kremfarget til lysebrune (ikke mørke/svarte).',
  detailed_description = 'Ayam Cemani er verdsatt for sitt helsvarte uttrykk og er en rase mange entusiaster har venteliste på. Eggfargen er kremfarget til lys brun, ikke svart. Vi avler selektivt for stabil type, god eggstørrelse og sterke kyllinger som ligger nært rasestandarden. Rasen kan være mer krevende i ruging enn flere andre raser, så stabil temperatur og fuktighet er ekstra viktig.',
  egg_color = 'Kremfarget til lys brun (ikke svart)'
WHERE slug = 'ayam-cemani';

UPDATE egg_breeds
SET
  description = 'Stor og rolig rase som legger store brune egg.',
  detailed_description = 'Jersey Giant er en robust rase med rolig temperament og god størrelse på eggene. Vi prioriterer avlsdyr som gir god eggstørrelse, jevn kvalitet og høner som ligger nært rasestandarden. Målet er sterke og funksjonelle kyllinger med et stabilt uttrykk over tid.',
  egg_color = 'Brun'
WHERE slug = 'jersey-giant';

UPDATE egg_breeds
SET
  description = 'Svensk rase kjent for grønne til olivengrønne egg.',
  detailed_description = 'Silverudd''s Blå er en aktiv og hardfør rase med karakteristiske grønn-toner i eggene. Vi avler for tydelig eggfarge, god eggstørrelse og høner som ligger nært standarden. Genetikken bak eggfarge er kompleks, så nyanse og intensitet kan variere noe mellom individer og sesonger.',
  egg_color = 'Grønn til oliven'
WHERE slug = 'silverudds-bla';

UPDATE egg_breeds
SET
  description = 'Autosexing-rase med lyseblå egg og tydelig kjønnsvisning ved klekking.',
  detailed_description = 'Cream Legbar er populær fordi kyllingene ofte kan kjønnsbestemmes tidlig (autosexing), samtidig som rasen legger lyseblå egg. I vårt avlsarbeid prioriterer vi tydelig kjønnsvisning, jevn eggfarge og god eggstørrelse. Rasen er ettertraktet blant hobbyavlere som vil bygge flokk med mest mulig forutsigbarhet.',
  egg_color = 'Lyseblå / turkis'
WHERE slug = 'cream-legbar';

UPDATE egg_breeds
SET
  description = 'Fransk rase kjent for mørkebrune egg og klassisk kobberhalset uttrykk.',
  detailed_description = 'Kobberhalset Maran er verdsatt for dype bruntoner i eggene og et elegant rasepreg. Vi avler for jevn eggfarge, god eggstørrelse og høner som ligger nært rasestandarden. Mørkhetsgrad i eggfargen kan variere mellom sesonger og enkeltindivider.',
  egg_color = 'Mørkebrun til rødlig'
WHERE slug = 'maran';
