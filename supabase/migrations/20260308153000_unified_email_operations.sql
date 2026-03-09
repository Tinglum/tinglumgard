-- =============================================================================
-- Unified Email Operations: templates, flows, queue, campaigns, suppression
-- =============================================================================

DO $$
BEGIN
  CREATE TYPE email_classification AS ENUM ('transactional', 'support', 'promotional', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE email_queue_status AS ENUM ('pending', 'processing', 'sent', 'failed', 'dead', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE email_campaign_status AS ENUM ('draft', 'ready_for_approval', 'approved', 'queued', 'sending', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE email_flow_mode AS ENUM ('shadow', 'active', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  classification email_classification NOT NULL,
  product_scope TEXT NOT NULL,
  subject_no TEXT NOT NULL,
  subject_en TEXT NOT NULL,
  body_no TEXT NOT NULL,
  body_en TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  subject_no TEXT NOT NULL,
  subject_en TEXT NOT NULL,
  body_no TEXT NOT NULL,
  body_en TEXT NOT NULL,
  change_note TEXT,
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, version)
);

CREATE TABLE IF NOT EXISTS email_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_key TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  product_scope TEXT NOT NULL,
  template_key TEXT NOT NULL REFERENCES email_templates(template_key),
  mode email_flow_mode NOT NULL DEFAULT 'shadow',
  send_offset_minutes INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  classification email_classification NOT NULL,
  status email_campaign_status NOT NULL DEFAULT 'draft',
  subject_no TEXT NOT NULL,
  subject_en TEXT NOT NULL,
  body_no TEXT NOT NULL,
  body_en TEXT NOT NULL,
  recipient_mode TEXT NOT NULL,
  recipient_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_dispatch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  classification email_classification NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  status email_queue_status NOT NULL DEFAULT 'pending',
  to_email TEXT NOT NULL,
  to_phone TEXT,
  locale TEXT NOT NULL DEFAULT 'no',
  template_key TEXT REFERENCES email_templates(template_key),
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_path TEXT,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  egg_order_id UUID REFERENCES egg_orders(id) ON DELETE SET NULL,
  chicken_order_id UUID REFERENCES chicken_orders(id) ON DELETE SET NULL,
  customer_message_id UUID REFERENCES customer_messages(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'mailgun',
  provider_message_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 6,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone TEXT,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  skip_reason TEXT,
  queue_id UUID REFERENCES email_dispatch_queue(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, email)
);

CREATE TABLE IF NOT EXISTS email_suppression_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES email_dispatch_queue(id) ON DELETE SET NULL,
  provider_event_id TEXT,
  event_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  payload JSONB NOT NULL,
  event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_email_templates_classification_active
  ON email_templates(classification, active, template_key);

CREATE INDEX IF NOT EXISTS idx_email_flows_mode_active
  ON email_flows(mode, active, event_type);

CREATE INDEX IF NOT EXISTS idx_email_dispatch_queue_status_next_attempt
  ON email_dispatch_queue(status, next_attempt_at, priority, created_at);

CREATE INDEX IF NOT EXISTS idx_email_dispatch_queue_campaign
  ON email_dispatch_queue(campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_email_dispatch_queue_created
  ON email_dispatch_queue(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_dispatch_queue_lower_email
  ON email_dispatch_queue(LOWER(to_email));

CREATE INDEX IF NOT EXISTS idx_email_dispatch_queue_provider_message
  ON email_dispatch_queue(provider_message_id);

CREATE INDEX IF NOT EXISTS idx_email_delivery_events_queue
  ON email_delivery_events(queue_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_delivery_events_recipient
  ON email_delivery_events(recipient, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status_scheduled
  ON email_campaigns(status, scheduled_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_status
  ON email_campaign_recipients(campaign_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_suppression_email_lower_unique
  ON email_suppression_list(LOWER(email));

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_flows_updated_at ON email_flows;
CREATE TRIGGER update_email_flows_updated_at
  BEFORE UPDATE ON email_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_dispatch_queue_updated_at ON email_dispatch_queue;
CREATE TRIGGER update_email_dispatch_queue_updated_at
  BEFORE UPDATE ON email_dispatch_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON email_campaigns;
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_campaign_recipients_updated_at ON email_campaign_recipients;
CREATE TRIGGER update_email_campaign_recipients_updated_at
  BEFORE UPDATE ON email_campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

INSERT INTO email_templates (
  template_key,
  classification,
  product_scope,
  subject_no,
  subject_en,
  body_no,
  body_en,
  variables,
  active,
  current_version
)
SELECT
  cft.slug,
  'system'::email_classification,
  CASE
    WHEN cft.product_type = 'mangalitsa' THEN 'pig'
    WHEN cft.product_type = 'eggs' THEN 'eggs'
    ELSE 'shared'
  END,
  cft.subject_no,
  cft.subject_en,
  cft.body_no,
  cft.body_en,
  '[]'::jsonb,
  cft.active,
  1
FROM communication_flow_templates cft
ON CONFLICT (template_key) DO UPDATE
SET
  subject_no = EXCLUDED.subject_no,
  subject_en = EXCLUDED.subject_en,
  body_no = EXCLUDED.body_no,
  body_en = EXCLUDED.body_en,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO email_template_versions (
  template_id,
  version,
  subject_no,
  subject_en,
  body_no,
  body_en,
  change_note,
  changed_by
)
SELECT
  t.id,
  1,
  t.subject_no,
  t.subject_en,
  t.body_no,
  t.body_en,
  'Backfilled from communication_flow_templates',
  'migration'
FROM email_templates t
LEFT JOIN email_template_versions v
  ON v.template_id = t.id AND v.version = 1
WHERE v.id IS NULL;

INSERT INTO email_flows (
  flow_key,
  event_type,
  product_scope,
  template_key,
  mode,
  send_offset_minutes,
  active
)
SELECT
  cft.slug,
  COALESCE(NULLIF(cft.trigger_event, ''), cft.flow_stage),
  CASE
    WHEN cft.product_type = 'mangalitsa' THEN 'pig'
    WHEN cft.product_type = 'eggs' THEN 'eggs'
    ELSE 'shared'
  END,
  cft.slug,
  'shadow'::email_flow_mode,
  COALESCE(cft.send_offset_days, 0) * 1440,
  cft.active
FROM communication_flow_templates cft
ON CONFLICT (flow_key) DO UPDATE
SET
  event_type = EXCLUDED.event_type,
  template_key = EXCLUDED.template_key,
  send_offset_minutes = EXCLUDED.send_offset_minutes,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO email_dispatch_queue (
  id,
  idempotency_key,
  classification,
  priority,
  status,
  to_email,
  locale,
  template_key,
  subject,
  html,
  metadata,
  source_path,
  order_id,
  provider,
  provider_message_id,
  attempts,
  max_attempts,
  next_attempt_at,
  sent_at,
  created_at,
  updated_at
)
SELECT
  el.id,
  'email:legacy:email_log:' || el.id::text || ':legacy:00000000',
  'system'::email_classification,
  50,
  'sent'::email_queue_status,
  LOWER(TRIM(el.recipient)),
  'no',
  NULL,
  el.subject,
  COALESCE(el.message, ''),
  jsonb_build_object('legacy_email_log_id', el.id::text),
  'legacy.email_log',
  el.order_id,
  'mailgun',
  NULL,
  1,
  6,
  COALESCE(el.sent_at, el.created_at, NOW()),
  COALESCE(el.sent_at, el.created_at, NOW()),
  COALESCE(el.created_at, NOW()),
  COALESCE(el.sent_at, el.created_at, NOW())
FROM email_log el
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_config (key, value)
VALUES
  ('email_dispatch_mode', to_jsonb('legacy'::text)),
  ('email_dispatch_paused', to_jsonb(false)),
  ('email_worker_batch_size', to_jsonb(50)),
  ('email_rate_limit_per_minute', to_jsonb(60)),
  ('email_default_from', to_jsonb('post@tinglum.com'::text)),
  ('email_default_reply_to', to_jsonb('post@tinglum.com'::text))
ON CONFLICT (key) DO NOTHING;
