-- =============================================================================
-- Email lifecycle runner, trigger config, and chicken manual remainder handling
-- =============================================================================

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

DO $$
BEGIN
  ALTER TYPE email_campaign_status ADD VALUE IF NOT EXISTS 'ready';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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

CREATE INDEX IF NOT EXISTS idx_email_flow_instances_due
  ON email_flow_instances(status, scheduled_for, flow_key);

CREATE INDEX IF NOT EXISTS idx_email_flow_instances_entity
  ON email_flow_instances(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_flow_instances_queue
  ON email_flow_instances(queue_id);

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

CREATE INDEX IF NOT EXISTS idx_email_flow_runs_started
  ON email_flow_runs(started_at DESC);

DROP TRIGGER IF EXISTS update_email_flow_instances_updated_at ON email_flow_instances;
CREATE TRIGGER update_email_flow_instances_updated_at
  BEFORE UPDATE ON email_flow_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE chicken_orders
  ADD COLUMN IF NOT EXISTS remainder_collected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS remainder_collected_by TEXT,
  ADD COLUMN IF NOT EXISTS remainder_collection_note TEXT;

INSERT INTO app_config (key, value, description)
VALUES
  ('email_trigger_timezone', to_jsonb('Europe/Oslo'::text), 'Timezone for all email flow trigger calculations'),
  ('pig_remainder_due_date', to_jsonb('2026-11-16'::text), 'Global seasonal due date (ISO date) for pig remainder payment'),
  ('pig_remainder_reminder_days', to_jsonb(ARRAY[30, 21, 14, 7, 3, 1]), 'Days before pig seasonal due date for remainder reminders'),
  ('pig_post_order_explainer_delay_days', to_jsonb(10), 'Days after pig order creation to send remainder explainer email'),
  ('egg_remainder_reminder_days', to_jsonb(ARRAY[11, 9, 7, 6]), 'Days before egg delivery for remainder reminders'),
  ('egg_overdue_grace_hours', to_jsonb(48), 'Grace period after egg due date end-of-day before forfeiture'),
  ('chicken_pickup_reminder_days', to_jsonb(ARRAY[3, 1]), 'Days before pickup date for chicken pickup reminders'),
  ('chicken_auto_ready_days_before', to_jsonb(4), 'Days before pickup date to auto-set chicken order ready for pickup'),
  ('campaign_send_via_api_cron_only', to_jsonb(true), 'When true, campaigns are only sent by cron or internal API calls')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_config (key, value)
VALUES
  ('email_dispatch_mode', to_jsonb('active'::text)),
  ('email_dispatch_paused', to_jsonb(false))
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

INSERT INTO email_templates (
  template_key,
  classification,
  product_scope,
  subject_no,
  subject_en,
  body_no,
  body_en,
  variables,
  active
)
VALUES
  (
    'pig.remainder.explainer.full',
    'transactional',
    'pig',
    'Slik fungerer restbetalingen for ordre {{order_number}}',
    'How remainder payment works for order {{order_number}}',
    '<p>Hei {{customer_name}},</p><p>Dette er en kort forklaring på restbetalingen for bestillingen din <strong>{{order_number}}</strong>.</p><p>Restbeløpet er <strong>{{remainder_amount_nok}}</strong> og forfaller <strong>{{due_date}}</strong>.</p><p>Du kan følge bestillingen og neste steg på Min side.</p><p><a href="{{order_url}}">Gå til Min side</a></p>',
    '<p>Hi {{customer_name}},</p><p>This is a short explanation of the remainder payment for your order <strong>{{order_number}}</strong>.</p><p>The remainder amount is <strong>{{remainder_amount_nok}}</strong> and is due on <strong>{{due_date}}</strong>.</p><p>You can follow your order and next steps on My Page.</p><p><a href="{{order_url}}">Go to My Page</a></p>',
    '["customer_name","order_number","remainder_amount_nok","due_date","order_url"]'::jsonb,
    true
  ),
  (
    'pig.remainder.explainer.reduced',
    'transactional',
    'pig',
    'Oppdatering om bestilling {{order_number}}',
    'Order update for {{order_number}}',
    '<p>Hei {{customer_name}},</p><p>Vi ser at restbetalingen allerede er registrert for <strong>{{order_number}}</strong>.</p><p>Du trenger ikke gjøre noe nå. Neste steg og oppdateringer finner du på Min side.</p><p><a href="{{order_url}}">Gå til Min side</a></p>',
    '<p>Hi {{customer_name}},</p><p>We can see that the remainder payment is already registered for <strong>{{order_number}}</strong>.</p><p>You do not need to do anything now. You can find next steps and updates on My Page.</p><p><a href="{{order_url}}">Go to My Page</a></p>',
    '["customer_name","order_number","order_url"]'::jsonb,
    true
  ),
  (
    'pig.remainder.reminder',
    'transactional',
    'pig',
    'Påminnelse om restbetaling ({{days_left}} dager) - {{order_number}}',
    'Remainder reminder ({{days_left}} days) - {{order_number}}',
    '<p>Hei {{customer_name}},</p><p>Dette er en påminnelse om restbetalingen for <strong>{{order_number}}</strong>.</p><p>Beløp: <strong>{{remainder_amount_nok}}</strong><br/>Forfall: <strong>{{due_date}}</strong></p><p>Antall dager igjen: <strong>{{days_left}}</strong></p><p><a href="{{order_url}}">Gå til Min side</a></p>',
    '<p>Hi {{customer_name}},</p><p>This is a reminder about the remainder payment for <strong>{{order_number}}</strong>.</p><p>Amount: <strong>{{remainder_amount_nok}}</strong><br/>Due date: <strong>{{due_date}}</strong></p><p>Days left: <strong>{{days_left}}</strong></p><p><a href="{{order_url}}">Go to My Page</a></p>',
    '["customer_name","order_number","remainder_amount_nok","due_date","days_left","order_url"]'::jsonb,
    true
  ),
  (
    'egg.remainder.reminder',
    'transactional',
    'eggs',
    'Påminnelse om restbetaling ({{days_left}} dager) - {{order_number}}',
    'Remainder reminder ({{days_left}} days) - {{order_number}}',
    '<p>Hei {{customer_name}},</p><p>Restbetaling for rugeegg-ordre <strong>{{order_number}}</strong> gjenstår.</p><p>Beløp: <strong>{{remainder_amount_nok}}</strong><br/>Forfall: <strong>{{due_date}}</strong></p><p><a href="{{order_url}}">Åpne bestillingen på Min side</a></p>',
    '<p>Hi {{customer_name}},</p><p>The remainder payment for your hatching egg order <strong>{{order_number}}</strong> is still outstanding.</p><p>Amount: <strong>{{remainder_amount_nok}}</strong><br/>Due date: <strong>{{due_date}}</strong></p><p><a href="{{order_url}}">Open your order on My Page</a></p>',
    '["customer_name","order_number","remainder_amount_nok","due_date","days_left","order_url"]'::jsonb,
    true
  ),
  (
    'egg.delivery.day_before',
    'transactional',
    'eggs',
    'Levering i morgen - {{order_number}}',
    'Delivery tomorrow - {{order_number}}',
    '<p>Hei {{customer_name}},</p><p>Rugeegg-bestillingen din <strong>{{order_number}}</strong> sendes i morgen.</p><p>Du kan legge til ekstra egg i dag så lenge lageret rekker.</p><p><a href="{{upsell_url}}">Legg til ekstra i dag</a></p>',
    '<p>Hi {{customer_name}},</p><p>Your hatching egg order <strong>{{order_number}}</strong> ships tomorrow.</p><p>You can still add extras today while stock is available.</p><p><a href="{{upsell_url}}">Add extras today</a></p>',
    '["customer_name","order_number","upsell_url"]'::jsonb,
    true
  ),
  (
    'egg.order.forfeited',
    'transactional',
    'eggs',
    'Bestillingen er kansellert - {{order_number}}',
    'Order cancelled - {{order_number}}',
    '<p>Hei {{customer_name}},</p><p>Bestillingen <strong>{{order_number}}</strong> er kansellert fordi restbetalingen ikke ble registrert innen fristen.</p><p>Eggene er nå frigitt tilbake til lager.</p><p><a href="{{order_url}}">Se detaljer på Min side</a></p>',
    '<p>Hi {{customer_name}},</p><p>Your order <strong>{{order_number}}</strong> was cancelled because the remainder payment was not received within the deadline.</p><p>The eggs are now released back to inventory.</p><p><a href="{{order_url}}">View details on My Page</a></p>',
    '["customer_name","order_number","order_url"]'::jsonb,
    true
  ),
  (
    'chicken.ready_for_pickup',
    'transactional',
    'chickens',
    'Kyllingene er klare for henting - {{order_number}}',
    'Chickens ready for pickup - {{order_number}}',
    '<p>Hei {{customer_name}},</p><p>Bestillingen <strong>{{order_number}}</strong> er nå klar for henting.</p><p>Eventuell restbetaling gjøres ved utlevering.</p><p><a href="{{order_url}}">Se detaljer på Min side</a></p>',
    '<p>Hi {{customer_name}},</p><p>Your order <strong>{{order_number}}</strong> is now ready for pickup.</p><p>Any remaining balance is paid physically at pickup.</p><p><a href="{{order_url}}">View details on My Page</a></p>',
    '["customer_name","order_number","order_url"]'::jsonb,
    true
  ),
  (
    'chicken.pickup.reminder',
    'transactional',
    'chickens',
    'Påminnelse om henting ({{days_left}} dager) - {{order_number}}',
    'Pickup reminder ({{days_left}} days) - {{order_number}}',
    '<p>Hei {{customer_name}},</p><p>Dette er en hentepåminnelse for <strong>{{order_number}}</strong>.</p><p>Hentedato: <strong>{{pickup_date}}</strong><br/>Dager igjen: <strong>{{days_left}}</strong></p><p><a href="{{order_url}}">Se detaljer på Min side</a></p>',
    '<p>Hi {{customer_name}},</p><p>This is a pickup reminder for <strong>{{order_number}}</strong>.</p><p>Pickup date: <strong>{{pickup_date}}</strong><br/>Days left: <strong>{{days_left}}</strong></p><p><a href="{{order_url}}">View details on My Page</a></p>',
    '["customer_name","order_number","pickup_date","days_left","order_url"]'::jsonb,
    true
  ),
  (
    'chicken.remainder.collected',
    'transactional',
    'chickens',
    'Kvittering for restbetaling - {{order_number}}',
    'Receipt for remainder payment - {{order_number}}',
    '<p>Hei {{customer_name}},</p><p>Restbetaling for <strong>{{order_number}}</strong> er registrert ved utlevering.</p><p>Beløp registrert: <strong>{{remainder_amount_nok}}</strong>.</p><p><a href="{{order_url}}">Se bestillingen på Min side</a></p>',
    '<p>Hi {{customer_name}},</p><p>The remainder payment for <strong>{{order_number}}</strong> was recorded at pickup.</p><p>Recorded amount: <strong>{{remainder_amount_nok}}</strong>.</p><p><a href="{{order_url}}">View your order on My Page</a></p>',
    '["customer_name","order_number","remainder_amount_nok","order_url"]'::jsonb,
    true
  )
ON CONFLICT (template_key) DO UPDATE
SET
  classification = EXCLUDED.classification,
  product_scope = EXCLUDED.product_scope,
  subject_no = EXCLUDED.subject_no,
  subject_en = EXCLUDED.subject_en,
  body_no = EXCLUDED.body_no,
  body_en = EXCLUDED.body_en,
  variables = EXCLUDED.variables,
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
VALUES
  ('pig.remainder.explainer', 'pig.deposit_paid', 'pig', 'pig.remainder.explainer.full', 'active', 0, true),
  ('pig.remainder.reminder', 'pig.deposit_paid', 'pig', 'pig.remainder.reminder', 'active', 0, true),
  ('egg.remainder.reminder', 'egg.deposit_paid', 'eggs', 'egg.remainder.reminder', 'active', 0, true),
  ('egg.delivery.day_before', 'egg.delivery_upcoming', 'eggs', 'egg.delivery.day_before', 'active', 0, true),
  ('egg.order.forfeited', 'egg.overdue_forfeit', 'eggs', 'egg.order.forfeited', 'active', 0, true),
  ('chicken.ready_for_pickup', 'chicken.auto_ready_for_pickup', 'chickens', 'chicken.ready_for_pickup', 'active', 0, true),
  ('chicken.pickup.reminder', 'chicken.pickup_reminder', 'chickens', 'chicken.pickup.reminder', 'active', 0, true),
  ('chicken.remainder.collected', 'chicken.remainder_collected', 'chickens', 'chicken.remainder.collected', 'active', 0, true)
ON CONFLICT (flow_key) DO UPDATE
SET
  event_type = EXCLUDED.event_type,
  product_scope = EXCLUDED.product_scope,
  template_key = EXCLUDED.template_key,
  mode = EXCLUDED.mode,
  send_offset_minutes = EXCLUDED.send_offset_minutes,
  active = EXCLUDED.active,
  updated_at = NOW();
