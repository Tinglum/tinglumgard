-- =============================================================================
-- Repair unified email schema for environments with partial/failed migrations
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
  ALTER TYPE email_campaign_status ADD VALUE IF NOT EXISTS 'ready';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE email_flow_mode AS ENUM ('shadow', 'active', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE email_flow_instance_status AS ENUM (
    'scheduled',
    'enqueued',
    'skipped',
    'cancelled',
    'failed',
    'completed'
  );
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

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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

ALTER TABLE email_flows
  ADD COLUMN IF NOT EXISTS mode email_flow_mode NOT NULL DEFAULT 'shadow',
  ADD COLUMN IF NOT EXISTS send_offset_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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

ALTER TABLE email_campaigns
  ADD COLUMN IF NOT EXISTS recipient_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS total_recipients INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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

ALTER TABLE email_dispatch_queue
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_path TEXT,
  ADD COLUMN IF NOT EXISTS campaign_id UUID,
  ADD COLUMN IF NOT EXISTS order_id UUID,
  ADD COLUMN IF NOT EXISTS egg_order_id UUID,
  ADD COLUMN IF NOT EXISTS chicken_order_id UUID,
  ADD COLUMN IF NOT EXISTS customer_message_id UUID,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'mailgun',
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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

ALTER TABLE email_campaign_recipients
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS skip_reason TEXT,
  ADD COLUMN IF NOT EXISTS queue_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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

CREATE TABLE IF NOT EXISTS email_flow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID REFERENCES email_flows(id) ON DELETE SET NULL,
  flow_key TEXT NOT NULL,
  product_scope TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  trigger_date_key TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status email_flow_instance_status NOT NULL DEFAULT 'scheduled',
  locale TEXT NOT NULL DEFAULT 'no',
  to_email TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT,
  queue_id UUID REFERENCES email_dispatch_queue(id) ON DELETE SET NULL,
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(flow_key, entity_type, entity_id, trigger_date_key)
);

ALTER TABLE email_flow_instances
  ADD COLUMN IF NOT EXISTS flow_id UUID,
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'no',
  ADD COLUMN IF NOT EXISTS to_email TEXT,
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS queue_id UUID,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS email_flow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_key TEXT NOT NULL DEFAULT 'email-flow-runner',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  scanned_count INTEGER NOT NULL DEFAULT 0,
  due_count INTEGER NOT NULL DEFAULT 0,
  enqueued_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  campaigns_queued_count INTEGER NOT NULL DEFAULT 0,
  missing_email_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

CREATE INDEX IF NOT EXISTS idx_email_flow_instances_due
  ON email_flow_instances(status, scheduled_for, flow_key);

CREATE INDEX IF NOT EXISTS idx_email_flow_instances_entity
  ON email_flow_instances(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_flow_instances_queue
  ON email_flow_instances(queue_id);

CREATE INDEX IF NOT EXISTS idx_email_flow_runs_started
  ON email_flow_runs(started_at DESC);

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

DROP TRIGGER IF EXISTS update_email_flow_instances_updated_at ON email_flow_instances;
CREATE TRIGGER update_email_flow_instances_updated_at
  BEFORE UPDATE ON email_flow_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
  IF to_regclass('public.communication_flow_templates') IS NOT NULL THEN
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
        WHEN cft.product_type = 'chickens' THEN 'chickens'
        ELSE 'shared'
      END,
      COALESCE(cft.subject_no, ''),
      COALESCE(cft.subject_en, ''),
      COALESCE(cft.body_no, ''),
      COALESCE(cft.body_en, ''),
      '[]'::jsonb,
      COALESCE(cft.active, true),
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
      COALESCE(NULLIF(cft.trigger_event, ''), cft.flow_stage, cft.slug),
      CASE
        WHEN cft.product_type = 'mangalitsa' THEN 'pig'
        WHEN cft.product_type = 'eggs' THEN 'eggs'
        WHEN cft.product_type = 'chickens' THEN 'chickens'
        ELSE 'shared'
      END,
      cft.slug,
      CASE WHEN COALESCE(cft.active, true) THEN 'active'::email_flow_mode ELSE 'disabled'::email_flow_mode END,
      COALESCE(cft.send_offset_days, 0) * 1440,
      COALESCE(cft.active, true)
    FROM communication_flow_templates cft
    ON CONFLICT (flow_key) DO UPDATE
    SET
      event_type = EXCLUDED.event_type,
      product_scope = EXCLUDED.product_scope,
      template_key = EXCLUDED.template_key,
      active = EXCLUDED.active,
      updated_at = NOW();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.email_log') IS NOT NULL THEN
    INSERT INTO email_dispatch_queue (
      id,
      idempotency_key,
      classification,
      priority,
      status,
      to_email,
      locale,
      subject,
      html,
      metadata,
      source_path,
      order_id,
      provider,
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
      COALESCE(el.subject, ''),
      COALESCE(el.message, ''),
      jsonb_build_object('legacy_email_log_id', el.id::text),
      'legacy.email_log',
      el.order_id,
      'mailgun',
      1,
      6,
      COALESCE(el.sent_at, el.created_at, NOW()),
      COALESCE(el.sent_at, el.created_at, NOW()),
      COALESCE(el.created_at, NOW()),
      COALESCE(el.sent_at, el.created_at, NOW())
    FROM email_log el
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

INSERT INTO app_config (key, value)
VALUES
  ('email_dispatch_mode', to_jsonb('legacy'::text)),
  ('email_dispatch_paused', to_jsonb(false)),
  ('email_worker_batch_size', to_jsonb(50)),
  ('email_rate_limit_per_minute', to_jsonb(60)),
  ('email_default_from', to_jsonb('post@tinglum.com'::text)),
  ('email_default_reply_to', to_jsonb('post@tinglum.com'::text)),
  ('email_trigger_timezone', to_jsonb('Europe/Oslo'::text)),
  ('pig_remainder_due_date', to_jsonb('2026-11-16'::text)),
  ('pig_remainder_reminder_days', to_jsonb(ARRAY[30, 21, 14, 7, 3, 1])),
  ('pig_post_order_explainer_delay_days', to_jsonb(10)),
  ('egg_remainder_reminder_days', to_jsonb(ARRAY[11, 9, 7, 6])),
  ('egg_overdue_grace_hours', to_jsonb(48)),
  ('chicken_pickup_reminder_days', to_jsonb(ARRAY[3, 1])),
  ('chicken_auto_ready_days_before', to_jsonb(4)),
  ('campaign_send_via_api_cron_only', to_jsonb(true))
ON CONFLICT (key) DO NOTHING;
