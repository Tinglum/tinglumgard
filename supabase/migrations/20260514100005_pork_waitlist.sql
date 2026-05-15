CREATE TABLE IF NOT EXISTS pork_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  box_size_preference integer,
  notes text,
  notify_attempts integer NOT NULL DEFAULT 0,
  notified_at timestamptz,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'converted', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pork_waitlist_status_idx ON pork_waitlist(status);
CREATE INDEX IF NOT EXISTS pork_waitlist_email_idx ON pork_waitlist(email);
