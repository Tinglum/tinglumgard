CREATE TABLE IF NOT EXISTS chicken_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  breed_id uuid REFERENCES chicken_breeds(id) ON DELETE SET NULL,
  hatch_id uuid REFERENCES chicken_hatches(id) ON DELETE SET NULL,
  quantity_hens integer NOT NULL DEFAULT 1,
  notify_attempts integer NOT NULL DEFAULT 0,
  notified_at timestamptz,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'converted', 'expired')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chicken_waitlist_breed_id_idx ON chicken_waitlist(breed_id);
CREATE INDEX IF NOT EXISTS chicken_waitlist_status_idx ON chicken_waitlist(status);
