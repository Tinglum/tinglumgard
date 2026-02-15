-- Link extras_catalog rows to the canonical cuts_catalog via cut_id.
-- This enables consistent mapping across:
-- - admin box contents (select cut once)
-- - checkout extras list (sellable extras)
-- - oppdelingsplan (pig-part mapping + "add to order")
--
-- Idempotent: safe to run multiple times.

-- 1) Add cut_id column (nullable, because not all extras are pig cuts)
ALTER TABLE extras_catalog
  ADD COLUMN IF NOT EXISTS cut_id UUID;

-- 2) Add FK constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'extras_catalog'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'extras_catalog_cut_id_fkey'
  ) THEN
    ALTER TABLE extras_catalog
      ADD CONSTRAINT extras_catalog_cut_id_fkey
      FOREIGN KEY (cut_id) REFERENCES cuts_catalog(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_extras_catalog_cut_id ON extras_catalog(cut_id);

-- 3) Direct slug matches
UPDATE extras_catalog e
SET cut_id = c.id
FROM cuts_catalog c
WHERE e.cut_id IS NULL
  AND e.slug = c.slug;

-- 4) Known slug mappings (legacy + special-cut extras)
WITH mapping(extra_slug, cut_slug) AS (
  VALUES
    -- Special-cut extras (checkout)
    ('extra-guanciale', 'guanciale'),
    ('extra-coppa', 'nakkekam-coppa'),
    ('extra-secreto-presa-pluma', 'secreto-presa-pluma'),
    ('extra-spekk', 'ryggspekk-lardo'),
    ('extra-tomahawk', 'tomahawk-kotelett'),
    ('extra-svine-entrecote', 'svine-entrecote'),
    ('extra-pancetta', 'bacon-sideflesk'),
    ('extra-skinke-speking', 'skinke-speking'),
    ('extra-knoke', 'knoke'),
    ('extra-smult', 'kokkefett-smult'),

    -- Legacy extras slugs
    ('ytrefilet', 'ytrefilet-ryggfilet'),
    ('koteletter', 'svinekoteletter'),
    ('ekstra_ribbe', 'ekstra-ribbe'),
    ('bogsteik', 'bogstek'),
    ('svinelabb', 'labb'),
    ('spekeskinke', 'skinke-speking'),
    ('kjottdeig', 'kjottdeig-grov'),
    ('kjottbiter', 'gryte-stekekjott'),
    ('polser', 'premium-polse'),

    -- Handle older encoding / variants (best-effort)
    ('medisterpølse', 'medisterpolser'),
    ('medisterpÃ¸lse', 'medisterpolser'),
    ('pinnekjøtt', 'pinnekjott'),
    ('pinnekjÃ¸tt', 'pinnekjott'),
    ('pinnekjott', 'pinnekjott')
)
UPDATE extras_catalog e
SET cut_id = c.id
FROM mapping m
JOIN cuts_catalog c ON c.slug = m.cut_slug
WHERE e.cut_id IS NULL
  AND e.slug = m.extra_slug;

