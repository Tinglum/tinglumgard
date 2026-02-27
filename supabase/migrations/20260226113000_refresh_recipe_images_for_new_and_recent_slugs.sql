-- ============================================================================
-- Refresh recipe images for recent recipe batches
-- Date: 2026-02-26
-- ============================================================================

UPDATE recipes
SET
  image_url = CASE slug
    -- Added in 2026-02-24 batch (and later adjusted)
    WHEN 'ullgris-ribbe-langstekt' THEN '/recipes/ullgris-ribbe-langstekt.jpg'
    WHEN 'ullgris-ribbe-rask' THEN '/recipes/ullgris-ribbe-rask.jpg'
    WHEN 'asiatisk-ribbe-glaze' THEN '/recipes/asiatisk-ribbe-glaze.jpg'
    WHEN 'indrefilet-smor' THEN '/recipes/indrefilet-smor.jpg'
    WHEN 'ytrefilet-medaljonger' THEN '/recipes/ytrefilet-medaljonger.jpg'
    WHEN 'koteletter-panne' THEN '/recipes/koteletter-panne.jpg'
    WHEN 'bog-langtid' THEN '/recipes/bog-langtid.jpg'
    WHEN 'karbonader-husmann' THEN '/recipes/karbonader-husmann.jpg'
    WHEN 'lapskaus-kjottbiter' THEN '/recipes/lapskaus-kjottbiter.jpg'
    WHEN 'ullgris-polser-lok' THEN '/recipes/ullgris-polser-lok.jpg'
    WHEN 'kamsteik-eple' THEN '/recipes/kamsteik-eple.jpg'
    WHEN 'knoke-kraft' THEN '/recipes/knoke-kraft.jpg'

    -- Added in 2026-02-26 batch
    WHEN 'tomahawk-chimichurri' THEN '/recipes/tomahawk-chimichurri.jpg'
    WHEN 'secreto-miso-sesam' THEN '/recipes/secreto-miso-sesam.jpg'
    WHEN 'koteletter-harissa-yoghurt' THEN '/recipes/koteletter-harissa-yoghurt.jpg'
    WHEN 'bog-carnitas-lime' THEN '/recipes/bog-carnitas-lime.jpg'
    WHEN 'kjottdeig-kofta-tahini' THEN '/recipes/kjottdeig-kofta-tahini.jpg'
    WHEN 'polser-currywurst-kimchi' THEN '/recipes/polser-currywurst-kimchi.jpg'

    ELSE image_url
  END,
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
