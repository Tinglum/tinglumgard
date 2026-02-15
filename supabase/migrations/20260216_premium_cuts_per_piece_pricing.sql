-- Convert 3 premium cuts to per-piece (per_unit) pricing with fixed prices.
-- Rename secreto/presa/pluma bundle to "Slakterens hemmelighet".
-- Weight ranges reflect 85–105 kg live weight Mangalitsa pigs.

-- 1. Guanciale: 869 kr/stk, ca. 0.8–1.4 kg
UPDATE extras_catalog SET
  pricing_type = 'per_unit',
  price_nok = 869,
  default_quantity = 1.0,
  kg_per_unit = 1.1,
  description_no = 'Kun to kinn per gris. Dyp smak og sterk marmorering. Ca. 0,8–1,4 kg per stykk.',
  description_en = 'Only two jowls per pig. Deep flavor and heavy marbling. Approx. 0.8–1.4 kg per piece.',
  updated_at = NOW()
WHERE slug = 'extra-guanciale';

-- 2. Coppa: 872 kr/stk, ca. 1.2–2.0 kg
UPDATE extras_catalog SET
  pricing_type = 'per_unit',
  price_nok = 872,
  default_quantity = 1.0,
  kg_per_unit = 1.6,
  description_no = 'Nakkekam med dyp marmorering. Ca. 1,2–2,0 kg per stykk.',
  description_en = 'Neck collar with deep marbling. Approx. 1.2–2.0 kg per piece.',
  updated_at = NOW()
WHERE slug = 'extra-coppa';

-- 3. Secreto/Presa/Pluma → "Slakterens hemmelighet": 799 kr/stk, ca. 0.7–1.2 kg
UPDATE extras_catalog SET
  name_no = 'Slakterens hemmelighet',
  name_en = 'The Butcher''s Secret',
  pricing_type = 'per_unit',
  price_nok = 799,
  default_quantity = 1.0,
  kg_per_unit = 0.9,
  chef_term_no = 'Secreto / Presa / Pluma',
  chef_term_en = 'Secreto / Presa / Pluma',
  description_no = 'Tre skjulte spesialstykker samlet: secreto, presa og pluma. Smaksintense muskler med mye intramuskulært fett. Ca. 0,7–1,2 kg per pakke.',
  description_en = 'Three hidden specialty cuts bundled: secreto, presa and pluma. Flavour-intense muscles with rich intramuscular fat. Approx. 0.7–1.2 kg per package.',
  description_premium_no = 'De mest ettertraktede stykkene på grisen — kun to sett per dyr. Skjult bak bogbladet, der de beste hemmelighetene ligger.',
  description_premium_en = 'The most sought-after cuts on the pig — only two sets per animal. Hidden behind the shoulder blade, where the best secrets lie.',
  updated_at = NOW()
WHERE slug = 'extra-secreto-presa-pluma';
