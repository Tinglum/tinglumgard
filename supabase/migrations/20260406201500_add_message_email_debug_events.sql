CREATE TABLE IF NOT EXISTS message_email_debug_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES customer_messages(id) ON DELETE SET NULL,
  email_thread_id TEXT,
  customer_email TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  event_type TEXT NOT NULL,
  match_status TEXT CHECK (match_status IN ('matched', 'unmatched', 'error')),
  match_strategy TEXT,
  sender_email TEXT,
  recipient_email TEXT,
  email_subject TEXT,
  normalized_subject TEXT,
  provider_message_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_email_debug_events_message
ON message_email_debug_events(message_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_email_debug_events_thread
ON message_email_debug_events(email_thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_email_debug_events_customer_subject
ON message_email_debug_events(customer_email, normalized_subject, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_email_debug_events_provider_message
ON message_email_debug_events(provider_message_id);

COMMENT ON TABLE message_email_debug_events IS
  'Debug trail for support-thread email matching and outbound support email threading.';

COMMENT ON COLUMN message_email_debug_events.match_strategy IS
  'How an inbound email was matched to a support thread, e.g. provider_reference, header_thread_id, subject_thread_token, sender_subject_fallback.';

COMMENT ON COLUMN message_email_debug_events.details IS
  'Additional structured diagnostics such as references, candidate ids, dispatch queue ids, and failure reasons.';
