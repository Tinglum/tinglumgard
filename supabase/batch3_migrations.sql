-- BATCH 3: Migrations 9-18 (schema + email + fixes)

-- Migration 9: 20260331100000_add_app_notifications.sql
-- ============================================================
-- Admin notifications table for system alerts (deferred payments, etc.)
CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_unread ON app_notifications (read, created_at DESC) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_app_notifications_type ON app_notifications (type, created_at DESC);


-- Migration 10: 20260406130000_add_admin_initiated_customer_messages.sql
-- ============================================================
ALTER TABLE customer_messages
  ALTER COLUMN customer_phone DROP NOT NULL;

ALTER TABLE customer_messages
  ADD COLUMN IF NOT EXISTS initiated_by TEXT NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS initiated_by_admin_name TEXT,
  ADD COLUMN IF NOT EXISTS related_order_source TEXT,
  ADD COLUMN IF NOT EXISTS related_order_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customer_messages_initiated_by_check'
  ) THEN
    ALTER TABLE customer_messages
      ADD CONSTRAINT customer_messages_initiated_by_check
      CHECK (initiated_by IN ('customer', 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customer_messages_related_order_source_check'
  ) THEN
    ALTER TABLE customer_messages
      ADD CONSTRAINT customer_messages_related_order_source_check
      CHECK (
        related_order_source IS NULL
        OR related_order_source IN ('pig', 'egg', 'chicken')
      );
  END IF;
END $$;

UPDATE customer_messages
SET
  initiated_by = COALESCE(NULLIF(initiated_by, ''), 'customer'),
  related_order_source = COALESCE(related_order_source, CASE WHEN order_id IS NOT NULL THEN 'pig' END),
  related_order_id = COALESCE(related_order_id, order_id::text)
WHERE
  initiated_by IS NULL
  OR initiated_by = ''
  OR related_order_source IS NULL
  OR related_order_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_customer_messages_email
  ON customer_messages(customer_email);

CREATE INDEX IF NOT EXISTS idx_customer_messages_initiated_by
  ON customer_messages(initiated_by);

CREATE INDEX IF NOT EXISTS idx_customer_messages_related_order
  ON customer_messages(related_order_source, related_order_id);

COMMENT ON COLUMN customer_messages.initiated_by IS
  'Who started the support thread: customer or admin.';

COMMENT ON COLUMN customer_messages.initiated_by_admin_name IS
  'Admin display name used when the thread was initiated from the admin panel.';

COMMENT ON COLUMN customer_messages.related_order_source IS
  'Optional product family for a related order (pig, egg, chicken).';

COMMENT ON COLUMN customer_messages.related_order_id IS
  'Optional order identifier for related egg, chicken, or pig orders.';

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
VALUES (
  'support.message.customer.admin_initiated',
  'support',
  'shared',
  '[{{thread_id}}] Ny melding fra Tinglum Gård: {{subject_line}}',
  '[{{thread_id}}] New message from Tinglum Gard: {{subject_line}}',
  $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <p style="margin:0;font-size:16px;line-height:1.5;">Hei {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">{{admin_name}} har sendt deg en melding fra Tinglum Gård (sak {{thread_id}}).</p>

    {{order_block}}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
      <tr><td style="border-left:4px solid #2D6A4F;padding:12px 20px;font-size:14px;color:#6B5B4E;line-height:1.6;font-style:italic;">{{message_text}}</td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Du kan svare direkte på denne e-posten eller åpne saken i {{portal_label}}.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <a href="{{portal_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;">Åpne meldingen</a>
      </td></tr>
    </table>

  </td></tr>
</table>$$,
  $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <p style="margin:0;font-size:16px;line-height:1.5;">Hi {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">{{admin_name}} has sent you a message from Tinglum Gard (case {{thread_id}}).</p>

    {{order_block}}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
      <tr><td style="border-left:4px solid #2D6A4F;padding:12px 20px;font-size:14px;color:#6B5B4E;line-height:1.6;font-style:italic;">{{message_text}}</td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">You can reply directly to this email or open the thread in {{portal_label}}.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <a href="{{portal_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;">Open message</a>
      </td></tr>
    </table>

  </td></tr>
</table>$$,
  '[
    "customer_name",
    "thread_id",
    "subject_line",
    "message_text",
    "admin_name",
    "portal_url",
    "portal_label",
    "order_block"
  ]'::jsonb,
  true,
  1
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


-- Migration 11: 20260406140000_drop_customer_messages_phone_fk.sql
-- ============================================================
-- Drop the foreign key constraint on customer_phone that requires the phone
-- to exist in vipps_users. Admin-initiated messages may target customers
-- who haven't completed Vipps login, or use different phone formats.
ALTER TABLE customer_messages
  DROP CONSTRAINT IF EXISTS msg_customer_fk;


-- Migration 12: 20260406201500_add_message_email_debug_events.sql
-- ============================================================
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


-- Migration 13: 20260409100000_update_reply_to_inbound_domain.sql
-- ============================================================
-- Update default reply-to address to use the inbound subdomain.
-- Root domain MX records are managed by Domeneshop for regular email;
-- inbound.tinglum.com MX records point to Mailgun EU for reply processing.
UPDATE app_config
SET value = to_jsonb('messages@inbound.tinglum.com'::text)
WHERE key = 'email_default_reply_to';


-- Migration 14: 20260409110000_remove_reference_numbers_from_customer_emails.sql
-- ============================================================
-- Remove thread_id / reference numbers from customer-facing email templates.
-- Admin-facing templates keep the thread_id for internal tracking.

-- 1. support.message.customer.confirmation — subject
UPDATE email_templates SET
  subject_no = 'Melding mottatt - {{subject_line}}',
  subject_en = 'Message received - {{subject_line}}'
WHERE template_key = 'support.message.customer.confirmation';

-- 2. support.message.customer.confirmation — body (remove "sak {{thread_id}}")
UPDATE email_templates SET
  body_no = REPLACE(body_no, ' (sak {{thread_id}})', ''),
  body_en = REPLACE(body_en, ' (case {{thread_id}})', '')
WHERE template_key = 'support.message.customer.confirmation';

-- 3. support.reply.customer.notification — subject
UPDATE email_templates SET
  subject_no = 'Svar på: {{subject_line}}',
  subject_en = 'Reply: {{subject_line}}'
WHERE template_key = 'support.reply.customer.notification';

-- 4. support.contact.customer.confirmation — remove order_number from subject
-- (This template doesn't have thread_id but uses order_number which is also a reference)
-- Keeping as-is since it refers to an actual order, not a ticket number.


-- Migration 15: 20260409153000_allow_addition_deposit_for_egg_payments.sql
-- ============================================================
ALTER TABLE egg_payments
DROP CONSTRAINT IF EXISTS egg_payments_payment_type_check;

ALTER TABLE egg_payments
ADD CONSTRAINT egg_payments_payment_type_check
CHECK (payment_type IN ('deposit', 'addition_deposit', 'remainder'));


-- Migration 16: 20260409183000_remove_support_case_wording_from_emails.sql
-- ============================================================
-- Remove visible case/thread wording from all support emails.
-- Hidden threading continues through headers and internal thread ids.

UPDATE email_templates
SET
  subject_no = 'Melding mottatt - {{subject_line}}',
  subject_en = 'Message received - {{subject_line}}',
  body_no = REPLACE(body_no, 'Vi har mottatt meldingen din (sak {{thread_id}}).', 'Vi har mottatt meldingen din.'),
  body_en = REPLACE(body_en, 'We have received your message (case {{thread_id}}).', 'We have received your message.')
WHERE template_key = 'support.message.customer.confirmation';

UPDATE email_templates
SET
  subject_no = 'Svar fra Tinglum Gård - {{subject_line}}',
  subject_en = 'Reply from Tinglum Gard - {{subject_line}}',
  body_no = REPLACE(body_no, '{{admin_name}} har svart p&aring; saken din ({{thread_id}}).', '{{admin_name}} har svart.'),
  body_en = REPLACE(body_en, '{{admin_name}} has replied to your case ({{thread_id}}).', '{{admin_name}} has replied.')
WHERE template_key = 'support.reply.customer.notification';

UPDATE email_templates
SET
  subject_no = REPLACE(subject_no, '[{{thread_id}}] ', ''),
  subject_en = REPLACE(subject_en, '[{{thread_id}}] ', ''),
  body_no = REPLACE(
    REPLACE(body_no, '{{admin_name}} har sendt deg en melding fra Tinglum Gård (sak {{thread_id}}).', '{{admin_name}} har sendt deg en melding fra Tinglum Gård.'),
    'åpne saken i {{portal_label}}',
    'åpne meldingen i {{portal_label}}'
  ),
  body_en = REPLACE(
    REPLACE(body_en, '{{admin_name}} has sent you a message from Tinglum Gard (case {{thread_id}}).', '{{admin_name}} has sent you a message from Tinglum Gard.'),
    'open the thread in {{portal_label}}',
    'open the message in {{portal_label}}'
  )
WHERE template_key = 'support.message.customer.admin_initiated';

UPDATE email_templates
SET
  subject_no = 'Ny melding fra {{customer_name}} - {{subject_line}}',
  subject_en = 'New message from {{customer_name}} - {{subject_line}}',
  body_no = REPLACE(body_no, 'Ny melding fra {{customer_name}} (sak {{thread_id}}).', 'Ny melding fra {{customer_name}}.'),
  body_en = REPLACE(body_en, 'New message from {{customer_name}} (case {{thread_id}}).', 'New message from {{customer_name}}.')
WHERE template_key = 'support.message.admin.new';

UPDATE email_templates
SET
  subject_no = 'Svar fra {{customer_name}} - {{subject_line}}',
  subject_en = 'Reply from {{customer_name}} - {{subject_line}}',
  body_no = REPLACE(body_no, 'Svar fra {{customer_name}} p&aring; sak {{thread_id}}.', 'Svar fra {{customer_name}}.'),
  body_en = REPLACE(body_en, 'Reply from {{customer_name}} on case {{thread_id}}.', 'Reply from {{customer_name}}.')
WHERE template_key = 'support.reply.admin.notification';


-- Migration 17: 20260409201500_disable_support_email_replies.sql
-- ============================================================
-- Support/message emails are notification-only by email.
-- Customers and admins should continue the conversation inside the app.

UPDATE email_templates
SET
  body_no = REPLACE(
    body_no,
    'Du kan svare direkte på denne e-posten, eller gå til <a href="{{portal_url}}">{{portal_label}}</a>.',
    'For å svare på meldingen, logg inn på <a href="{{portal_url}}">{{portal_label}}</a>.'
  ),
  body_en = REPLACE(
    body_en,
    'You can reply directly to this email, or visit <a href="{{portal_url}}">{{portal_label}}</a>.',
    'To reply to the message, sign in to <a href="{{portal_url}}">{{portal_label}}</a>.'
  )
WHERE template_key = 'support.message.customer.confirmation';

UPDATE email_templates
SET
  body_no = REPLACE(
    body_no,
    'Du kan svare direkte på denne e-posten, eller gå til <a href="{{portal_url}}">{{portal_label}}</a>.',
    'For å svare på meldingen, logg inn på <a href="{{portal_url}}">{{portal_label}}</a>.'
  ),
  body_en = REPLACE(
    body_en,
    'You can reply directly to this email, or visit <a href="{{portal_url}}">{{portal_label}}</a>.',
    'To reply to the message, sign in to <a href="{{portal_url}}">{{portal_label}}</a>.'
  )
WHERE template_key = 'support.reply.customer.notification';

UPDATE email_templates
SET
  body_no = REPLACE(
    body_no,
    'Svar på denne e-posten direkte for å svare kunden.',
    'Åpne kundemeldinger i admin for å svare kunden.'
  ),
  body_en = REPLACE(
    body_en,
    'Reply directly to this email to answer the customer.',
    'Open admin messages to reply to the customer.'
  )
WHERE template_key = 'support.reply.admin.notification';


-- Migration 18: 20260412100000_fix_chicken_order_payment_statuses.sql
-- ============================================================
-- Fix chicken orders that are incorrectly marked as 'fully_paid'
-- when total completed payments don't actually cover the full order amount.
--
-- Root cause: webhook used wrong column names (deposit_amount vs deposit_amount_nok)
-- and the admin status dropdown allowed manual status changes without payment validation.

-- 0. Ensure pickup_date and pickup_time columns exist
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS pickup_date DATE;
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS pickup_time TEXT;

-- 1. Fix specific order CHICK19072374: set pickup date/time for Sunday April 12 at 11:00
UPDATE chicken_orders
SET pickup_date = '2026-04-12',
    pickup_time = '11:00'
WHERE order_number = 'CHICK19072374';

-- 2. Fix all chicken orders where status = 'fully_paid' but actual completed payments
--    don't cover the total amount. Revert them to 'deposit_paid'.
UPDATE chicken_orders co
SET status = 'deposit_paid'
WHERE co.status = 'fully_paid'
  AND co.total_amount_nok > 0
  AND (
    SELECT COALESCE(SUM(cp.amount_nok), 0)
    FROM chicken_payments cp
    WHERE cp.chicken_order_id = co.id
      AND cp.status = 'completed'
  ) < co.total_amount_nok;


