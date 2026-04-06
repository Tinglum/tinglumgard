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
