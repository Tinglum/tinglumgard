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

-- Insert default configurations
INSERT INTO box_configurations (box_size, price, items, description)
VALUES
  (8, 6490,
   '[
     {"id": "item_1", "name": "Entrecôte", "quantity": 1.5, "unit": "kg"},
     {"id": "item_2", "name": "Indrefilet", "quantity": 1, "unit": "kg"},
     {"id": "item_3", "name": "Oksebiff", "quantity": 1.5, "unit": "kg"},
     {"id": "item_4", "name": "Flatbiff", "quantity": 1, "unit": "kg"},
     {"id": "item_5", "name": "Kjøttdeig", "quantity": 2, "unit": "kg"},
     {"id": "item_6", "name": "Gryte", "quantity": 1, "unit": "kg"}
   ]'::jsonb,
   'Perfekt for mindre husstander. Inneholder et variert utvalg av kvalitetsokse.'
  ),
  (12, 8990,
   '[
     {"id": "item_1", "name": "Entrecôte", "quantity": 2, "unit": "kg"},
     {"id": "item_2", "name": "Indrefilet", "quantity": 1.5, "unit": "kg"},
     {"id": "item_3", "name": "Oksebiff", "quantity": 2, "unit": "kg"},
     {"id": "item_4", "name": "Flatbiff", "quantity": 1.5, "unit": "kg"},
     {"id": "item_5", "name": "Kjøttdeig", "quantity": 3, "unit": "kg"},
     {"id": "item_6", "name": "Gryte", "quantity": 1.5, "unit": "kg"},
     {"id": "item_7", "name": "Mørbrad", "quantity": 0.5, "unit": "kg"}
   ]'::jsonb,
   'Ideell for større familier. Mer kjøtt og større variasjon.'
  )
ON CONFLICT (box_size) DO NOTHING;

-- Add comment
COMMENT ON TABLE box_configurations IS 'Stores box contents and pricing configuration for each box size';
