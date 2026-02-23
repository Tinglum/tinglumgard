-- ============================================================
-- Update presa recipe: add pomegranate and leek sauce
-- Date: 2026-02-23
-- ============================================================

UPDATE recipes
SET
  intro_no = 'Presa er det flate, rike stykket fra øvre skulderparti. Pannestekt med smør, urter, kremet purreløksaus og granateple for frisk syre og sødme.',
  intro_en = 'Presa is the flat, rich cut from the upper shoulder. Pan-seared with butter, herbs, creamy leek sauce, and pomegranate for fresh acidity and sweetness.',
  ingredients_no = '[
    {"amount": "2 stk", "item": "Mangalitsa-presa (ca. 200-250 g hver)"},
    {"amount": "2 ss", "item": "nøytral olje (solsikke eller rapsolje)"},
    {"amount": "50 g", "item": "smør"},
    {"amount": "4 stk", "item": "kvister fersk timian"},
    {"amount": "2 stk", "item": "kvister fersk rosmarin"},
    {"amount": "3 stk", "item": "fedd hvitløk, knust med skallet på"},
    {"amount": "1 stk", "item": "stor purreløk, finsnittet"},
    {"amount": "2 dl", "item": "kremfløte"},
    {"amount": "1 ts", "item": "Dijonsennep"},
    {"amount": "1 ts", "item": "sitronsaft"},
    {"amount": "1 stk", "item": "granateple, kjerner"},
    {"amount": "", "item": "flaksalt og ferskkvernet pepper"}
  ]'::jsonb,
  ingredients_en = '[
    {"amount": "2", "item": "Mangalitsa presa (about 200-250 g each)"},
    {"amount": "2 tbsp", "item": "neutral oil (sunflower or rapeseed)"},
    {"amount": "50 g", "item": "butter"},
    {"amount": "4", "item": "sprigs fresh thyme"},
    {"amount": "2", "item": "sprigs fresh rosemary"},
    {"amount": "3", "item": "garlic cloves, crushed with skin on"},
    {"amount": "1", "item": "large leek, finely sliced"},
    {"amount": "200 ml", "item": "heavy cream"},
    {"amount": "1 tsp", "item": "Dijon mustard"},
    {"amount": "1 tsp", "item": "lemon juice"},
    {"amount": "1", "item": "pomegranate, seeds"},
    {"amount": "", "item": "flaky salt and freshly cracked pepper"}
  ]'::jsonb,
  steps_no = '[
    "Ta presaen ut av kjøleskapet 30 minutter i forveien. Tørk grundig med kjøkkenpapir og krydre godt med salt og pepper på begge sider.",
    "Varm en tung jernpanne (eller stekepanne med tykk bunn) til den ryker lett. Tilsett olje.",
    "Legg presaen i pannen og stek uten å røre i 3-4 minutter til den har en mørk, gyllen skorpe.",
    "Snu kjøttet. Tilsett smør, timian, rosmarin og knust hvitløk. Når smøret skummer, vipp pannen og øs det aromatiske smøret over kjøttet med en skje. Gjenta i 2-3 minutter.",
    "Sjekk kjernetemperaturen: 58-60°C for medium rare, 62-63°C for medium. Presaen er tynn, så den går fort. Ta ut kjøttet og la det hvile 4-5 minutter på et skjærebrett.",
    "Mens kjøttet hviler: senk varmen til middels, tilsett finsnittet purreløk i samme panne og la den bli myk i 2-3 minutter. Rør inn kremfløte og Dijonsennep, og la sausen småkoke i 3-4 minutter til den tykner lett. Smak til med sitronsaft, salt og pepper.",
    "Skjær presa i 1 cm tykke skiver på skrå mot fibrene. Legg på fat, skje over purreløksausen, og topp med granateplekjerner rett før servering."
  ]'::jsonb,
  steps_en = '[
    "Remove the presa from the fridge 30 minutes ahead. Dry thoroughly with paper towels and season generously with salt and pepper on both sides.",
    "Heat a heavy cast iron pan (or thick-bottomed skillet) until lightly smoking. Add oil.",
    "Place the presa in the pan and cook without touching for 3-4 minutes until it has a dark, golden crust.",
    "Flip the meat. Add butter, thyme, rosemary, and crushed garlic. When the butter foams, tilt the pan and baste the meat with the aromatic butter using a spoon. Repeat for 2-3 minutes.",
    "Check core temperature: 58-60°C for medium rare, 62-63°C for medium. Presa is thin, so it cooks fast. Remove the meat and rest for 4-5 minutes on a cutting board.",
    "While the meat rests: reduce to medium heat, add the sliced leek to the same pan, and soften for 2-3 minutes. Stir in heavy cream and Dijon mustard, then simmer for 3-4 minutes until slightly thickened. Season with lemon juice, salt, and pepper.",
    "Slice the presa into 1 cm thick slices on the bias against the grain. Spoon over the leek sauce and finish with pomegranate seeds just before serving."
  ]'::jsonb,
  tips_no = 'Bruk steketermometer for perfekt resultat, og la kjøttet alltid hvile før oppskjæring. Granateple tilsettes helt til slutt for frisk tekstur og syre.',
  tips_en = 'Use a meat thermometer for precision, and always rest the meat before slicing. Add pomegranate at the end for fresh texture and acidity.',
  prep_time_minutes = 12,
  cook_time_minutes = 12,
  updated_at = NOW()
WHERE slug = 'presa-herbs';

