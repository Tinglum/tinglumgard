-- ============================================================
-- Update pork ribeye cast iron recipe:
-- add rosemary in pan cooking step
-- Date: 2026-02-23
-- ============================================================

UPDATE recipes
SET
  ingredients_no = '[
    {"amount": "2 stk", "item": "Mangalitsa svine-entrec\\u00f4te (ca. 250-300 g, 3 cm tykke)"},
    {"amount": "1 ss", "item": "n\\u00f8ytral olje med h\\u00f8yt r\\u00f8ykpunkt"},
    {"amount": "40 g", "item": "sm\\u00f8r"},
    {"amount": "2 stk", "item": "fedd hvitl\\u00f8k, knust"},
    {"amount": "2 stk", "item": "kvister fersk rosmarin"},
    {"amount": "3 stk", "item": "kvister fersk timian"},
    {"amount": "", "item": "flaksalt og ferskkvernet sort pepper"}
  ]'::jsonb,
  ingredients_en = '[
    {"amount": "2", "item": "Mangalitsa pork ribeye steaks (about 250-300 g, 3 cm thick)"},
    {"amount": "1 tbsp", "item": "neutral oil with high smoke point"},
    {"amount": "40 g", "item": "butter"},
    {"amount": "2", "item": "garlic cloves, crushed"},
    {"amount": "2", "item": "sprigs fresh rosemary"},
    {"amount": "3", "item": "sprigs fresh thyme"},
    {"amount": "", "item": "flaky salt and freshly cracked black pepper"}
  ]'::jsonb,
  steps_no = '[
    "Ta biffene ut av kj\\u00f8leskapet 30 minutter i forveien. T\\u00f8rk godt med kj\\u00f8kkenpapir - fuktighet er fienden til god bruning. Krydre med salt og pepper.",
    "Varm en jernpanne p\\u00e5 h\\u00f8y varme til den akkurat begynner \\u00e5 ryke. Tilsett olje og fordel jevnt.",
    "Legg biffene forsiktig i pannen (bort fra deg for \\u00e5 unng\\u00e5 sprut). Stek i 3-4 minutter uten \\u00e5 r\\u00f8re - la Maillard-reaksjonen gj\\u00f8re jobben.",
    "Snu biffene. Skru ned til middels varme. Tilsett sm\\u00f8r, hvitl\\u00f8k, rosmarin og timian. N\\u00e5r sm\\u00f8ret skummer, vipp pannen og \\u00f8s det brunede sm\\u00f8ret over biffene med en skje. Bast i 3-4 minutter.",
    "Sjekk kjernetemperaturen: 60-63 C for en rosa, saftig kjerne. Mangalitsa t\\u00e5ler litt mer enn vanlig svineentrec\\u00f4te.",
    "Ta av varmen og la hvile i 5 minutter. \\u00d8s litt av pannesausen over.",
    "Skj\\u00e6r i 1 cm skiver og server med flaksalt og resten av urtesm\\u00f8ret fra pannen."
  ]'::jsonb,
  steps_en = '[
    "Remove the steaks from the fridge 30 minutes ahead. Pat dry thoroughly with paper towels - moisture is the enemy of a good sear. Season with salt and pepper.",
    "Heat a cast iron pan on high heat until it just begins to smoke. Add oil and swirl to coat evenly.",
    "Carefully place the steaks in the pan (away from you to avoid splatter). Cook for 3-4 minutes without touching - let the Maillard reaction do its work.",
    "Flip the steaks. Reduce to medium heat. Add butter, garlic, rosemary, and thyme. When the butter foams, tilt the pan and baste the steaks with the browned butter using a spoon. Baste for 3-4 minutes.",
    "Check the core temperature: 60-63 C for a pink, juicy center. Mangalitsa tolerates a bit more than regular pork ribeye.",
    "Remove from heat and rest for 5 minutes. Spoon some of the pan sauce over the top.",
    "Slice into 1 cm slices and serve with flaky salt and the remaining herb butter from the pan."
  ]'::jsonb,
  updated_at = NOW()
WHERE slug = 'pork-ribeye-pan';

