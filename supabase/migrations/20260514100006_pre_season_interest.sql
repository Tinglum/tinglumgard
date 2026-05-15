CREATE TABLE IF NOT EXISTS chicken_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  breed_id uuid REFERENCES chicken_breeds(id) ON DELETE SET NULL,
  quantity_hens integer NOT NULL DEFAULT 1,
  quantity_roosters integer NOT NULL DEFAULT 0,
  season_year integer,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chicken_interest_status_idx ON chicken_interest(status);
CREATE INDEX IF NOT EXISTS chicken_interest_breed_id_idx ON chicken_interest(breed_id);

CREATE TABLE IF NOT EXISTS pork_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  box_size_preference integer,
  season_year integer,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pork_interest_status_idx ON pork_interest(status);
