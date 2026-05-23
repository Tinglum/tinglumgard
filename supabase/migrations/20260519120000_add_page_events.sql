CREATE TABLE IF NOT EXISTS page_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  customer_id text,
  customer_email text,
  vipps_sub text,
  page text,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS page_events_event_type_idx ON page_events(event_type);
CREATE INDEX IF NOT EXISTS page_events_created_at_idx ON page_events(created_at DESC);
CREATE INDEX IF NOT EXISTS page_events_customer_id_idx ON page_events(customer_id);

-- Composite index for deduplication lookups (event_type + customer_id + time)
CREATE INDEX IF NOT EXISTS page_events_dedup_idx
  ON page_events(event_type, customer_id, created_at);
