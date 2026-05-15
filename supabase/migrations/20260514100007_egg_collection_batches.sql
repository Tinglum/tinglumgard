CREATE TABLE IF NOT EXISTS egg_collection_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES egg_inventory(id) ON DELETE CASCADE,
  collected_date date NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  notes text,
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS egg_collection_batches_inventory_id_idx ON egg_collection_batches(inventory_id);
CREATE INDEX IF NOT EXISTS egg_collection_batches_collected_date_idx ON egg_collection_batches(collected_date);
