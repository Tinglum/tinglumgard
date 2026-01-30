-- Box Configurations Table
-- Stores the items and pricing for each box size

CREATE TABLE IF NOT EXISTS box_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  box_size INTEGER NOT NULL UNIQUE,
  price INTEGER NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_box_configurations_box_size ON box_configurations(box_size);

-- Insert default configurations for pork boxes (gris = pork in Norwegian)
INSERT INTO box_configurations (box_size, price, items, description)
VALUES
  (8, 3500,
   '[
     {"id": "item_1", "name": "Ribbe", "quantity": 2, "unit": "kg", "description": "Tynnribbe, Familieribbe, Porchetta eller Slakterens valg"},
     {"id": "item_2", "name": "Koteletter", "quantity": 1, "unit": "kg"},
     {"id": "item_3", "name": "Grillkoteletter", "quantity": 1, "unit": "kg"},
     {"id": "item_4", "name": "Svinesteik", "quantity": 1, "unit": "kg"},
     {"id": "item_5", "name": "Kjøttdeig", "quantity": 1, "unit": "kg"},
     {"id": "item_6", "name": "Pølser", "quantity": 0.5, "unit": "kg"},
     {"id": "item_7", "name": "Slakterens valg", "quantity": 1.5, "unit": "kg", "description": "Variert utvalg fra slakteren"}
   ]'::jsonb,
   'Perfekt for mindre husstander (2-3 personer). Inneholder et variert utvalg av kvalitetsgris fra Tinglum Gård.'
  ),
  (12, 4800,
   '[
     {"id": "item_1", "name": "Ribbe", "quantity": 3, "unit": "kg", "description": "Tynnribbe, Familieribbe, Porchetta eller Slakterens valg"},
     {"id": "item_2", "name": "Koteletter", "quantity": 1.5, "unit": "kg"},
     {"id": "item_3", "name": "Grillkoteletter", "quantity": 1.5, "unit": "kg"},
     {"id": "item_4", "name": "Svinesteik", "quantity": 1.5, "unit": "kg"},
     {"id": "item_5", "name": "Kjøttdeig", "quantity": 1.5, "unit": "kg"},
     {"id": "item_6", "name": "Pølser", "quantity": 1, "unit": "kg"},
     {"id": "item_7", "name": "Bacon/Sideflesk", "quantity": 0.5, "unit": "kg"},
     {"id": "item_8", "name": "Slakterens valg", "quantity": 1.5, "unit": "kg", "description": "Variert utvalg fra slakteren"}
   ]'::jsonb,
   'Ideell for større familier (4-6 personer). Mer kjøtt og større variasjon av kvalitetsgris fra Tinglum Gård.'
  )
ON CONFLICT (box_size) DO NOTHING;

-- Add comment
COMMENT ON TABLE box_configurations IS 'Stores box contents and pricing configuration for each box size';
