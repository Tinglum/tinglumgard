-- Update box taglines in mangalitsa_box_presets
UPDATE mangalitsa_box_presets
SET short_pitch_no = 'Grill- og fest-mat',
    short_pitch_en = 'Grill & party food'
WHERE slug = 'bbq-steakhouse';

UPDATE mangalitsa_box_presets
SET short_pitch_no = 'Ribbe + medisterpakke',
    short_pitch_en = 'Ribs + sausage pack'
WHERE slug = 'julespesial';

UPDATE mangalitsa_box_presets
SET short_pitch_no = 'Gode middager for hele familien',
    short_pitch_en = 'Great dinners for the whole family'
WHERE slug = 'familieboks';

-- Update "Bogstek (pulled pork-emne)" in preset contents
UPDATE mangalitsa_preset_contents
SET content_name_no = 'Bogstek (perfekt for pulled pork)',
    content_name_en = 'Shoulder roast (perfect for pulled pork)'
WHERE content_name_no = 'Bogstek (pulled pork-emne)';
