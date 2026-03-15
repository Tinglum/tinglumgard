-- Customer benefits: account-based discounts granted by egg/chicken orders
-- Replaces the HATCH10 rebate code approach with automatic account-level discounts

CREATE TABLE IF NOT EXISTS customer_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_phone TEXT,
  benefit_type TEXT NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
  used BOOLEAN NOT NULL DEFAULT false,
  used_on_order_id TEXT,
  granted_by_order_id TEXT NOT NULL,
  granted_by_order_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One benefit per order (prevent duplicates if checkout is retried)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_benefits_unique_grant
  ON customer_benefits (user_email, benefit_type, granted_by_order_id);

-- Fast lookup at pork checkout
CREATE INDEX IF NOT EXISTS idx_customer_benefits_lookup
  ON customer_benefits (user_email, benefit_type, used)
  WHERE used = false;

-- Disable RLS (admin-only table, accessed via supabaseAdmin)
ALTER TABLE customer_benefits ENABLE ROW LEVEL SECURITY;

-- Update egg hatch followup email template: remove HATCH10, mention auto-discount
UPDATE email_templates
SET
  body_no = E'Hei {{customer_name}},\n\nVi håper klekkingen går fint for <strong>{{order_number}}</strong>.\n\nHar du spørsmål underveis, send oss gjerne en melding via nettsiden.\n\n<a href="{{message_url}}">Send melding på Min side</a>\n\n---\n\n<strong>Tilbud fra Tinglum Gård:</strong> Som rugeegg-kunde har du <strong>10% rabatt på forskuddet</strong> på din første Mangalitsa-kasse. Rabatten legges til automatisk ved bestilling.\n\n<a href="{{pork_url}}">Besøk tinglumgård.no</a>\n\n<strong>Vennerabatt:</strong> Del vennerabattkoden din. Venner får rabatt, og du kan tjene kreditt tilsvarende opptil <strong>50% av forskuddet</strong> når de bestiller.',
  body_en = E'Hi {{customer_name}},\n\nWe hope hatching is going well for <strong>{{order_number}}</strong>.\n\nIf you have any questions along the way, feel free to send us a message on the website.\n\n<a href="{{message_url}}">Send a message on My Page</a>\n\n---\n\n<strong>Offer from Tinglum Gård:</strong> As a hatching egg customer, you get <strong>10% off the deposit</strong> on your first Mangalitsa box. The discount is applied automatically at checkout.\n\n<a href="{{pork_url}}">Visit tinglumgård.no</a>\n\n<strong>Referral bonus:</strong> Share your referral code. Friends get a discount, and you can earn credit worth up to <strong>50% of the deposit</strong> when they order.'
WHERE template_key = 'egg.hatch.followup'
  AND active = true;

-- Add chicken order followup template (cross-sell pork to chicken customers)
INSERT INTO email_templates (template_key, locale, subject_no, subject_en, body_no, body_en, classification, active, variables)
VALUES (
  'chicken.order.followup',
  'no',
  'Takk for kyllingbestillingen - {{order_number}}',
  'Thanks for your chicken order - {{order_number}}',
  E'Hei {{customer_name}},\n\nTakk for bestillingen av kyllinger fra Tinglum Gård! Vi gleder oss til du henter dem.\n\nHar du spørsmål, send oss gjerne en melding via nettsiden.\n\n<a href="{{message_url}}">Send melding på Min side</a>\n\n---\n\n<strong>Tilbud fra Tinglum Gård:</strong> Som kyllingkunde har du <strong>10% rabatt på forskuddet</strong> på din første Mangalitsa-kasse. Rabatten legges til automatisk ved bestilling.\n\n<a href="{{pork_url}}">Besøk tinglumgård.no</a>\n\n<strong>Vennerabatt:</strong> Del vennerabattkoden din. Venner får rabatt, og du kan tjene kreditt tilsvarende opptil <strong>50% av forskuddet</strong> når de bestiller.',
  E'Hi {{customer_name}},\n\nThank you for your chicken order from Tinglum Gård! We look forward to your pickup.\n\nIf you have any questions, feel free to send us a message on the website.\n\n<a href="{{message_url}}">Send a message on My Page</a>\n\n---\n\n<strong>Offer from Tinglum Gård:</strong> As a chicken customer, you get <strong>10% off the deposit</strong> on your first Mangalitsa box. The discount is applied automatically at checkout.\n\n<a href="{{pork_url}}">Visit tinglumgård.no</a>\n\n<strong>Referral bonus:</strong> Share your referral code. Friends get a discount, and you can earn credit worth up to <strong>50% of the deposit</strong> when they order.',
  'transactional',
  true,
  '["customer_name", "order_number", "message_url", "pork_url", "order_url"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Add chicken followup flow
INSERT INTO email_flows (flow_key, event_type, product_scope, template_key, mode, active, send_offset_minutes)
VALUES (
  'chicken.order.followup',
  'chicken.remainder_collected',
  'chickens',
  'chicken.order.followup',
  'active',
  true,
  0
)
ON CONFLICT DO NOTHING;
