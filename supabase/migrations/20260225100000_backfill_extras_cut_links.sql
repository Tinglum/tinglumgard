-- ============================================================================
-- Backfill extras -> cuts links for part mapping on oppdelingsplan
-- Date: 2026-02-25
-- Purpose: ensure "Fra del av grisen" resolves correctly for legacy/new extras.
-- Safe to run multiple times.
-- ============================================================================

WITH mapping(extra_slug, cut_slug) AS (
  VALUES
    -- Nakke
    ('extra-guanciale', 'guanciale'),
    ('extra-coppa', 'nakkekam-coppa'),
    ('extra-secreto-presa-pluma', 'secreto-presa-pluma'),

    -- Kotelettkam
    ('indrefilet', 'indrefilet'),
    ('ytrefilet', 'ytrefilet-ryggfilet'),
    ('extra-tomahawk', 'tomahawk-kotelett'),
    ('extra-svine-entrecote', 'svine-entrecote'),
    ('koteletter', 'svinekoteletter'),
    ('svinekam', 'svinekam'),
    ('extra-spekk', 'ryggspekk-lardo'),
    ('kamsteik', 'kamsteik'),

    -- Ribbeside
    ('ekstra_ribbe', 'ekstra-ribbe'),
    ('bacon', 'bacon-sideflesk'),
    ('pinnekjott', 'pinnekjott'),
    ('pinnekjÃ¸tt', 'pinnekjott'),
    ('extra-pancetta', 'bacon-sideflesk'),
    ('extra-smult', 'kokkefett-smult'),

    -- Svinebog
    ('bogsteik', 'bogstek'),
    ('kjottdeig', 'kjottdeig-grov'),
    ('kjottbiter', 'gryte-stekekjott'),
    ('polser', 'premium-polse'),
    ('medisterpolse', 'medisterpolser'),
    ('medisterpÃ¸lse', 'medisterpolser'),

    -- Knoke
    ('svinelabb', 'labb'),
    ('extra-knoke', 'knoke'),

    -- Skinke
    ('spekeskinke', 'skinke-speking'),
    ('extra-skinke-speking', 'skinke-speking')
)
UPDATE extras_catalog e
SET cut_id = c.id
FROM mapping m
JOIN cuts_catalog c ON c.slug = m.cut_slug
WHERE e.slug = m.extra_slug
  AND (e.cut_id IS NULL OR e.cut_id <> c.id);
