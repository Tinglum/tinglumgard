-- ============================================================
-- COMBINED MIGRATIONS: 18 unapplied migrations (20260319 - 20260412)
-- Run in Supabase SQL Editor against PRODUCTION
-- ============================================================

-- ============================================================
-- Migration 1/18: 20260319091500_soften_egg_remainder_early_reminders.sql
-- ============================================================
BEGIN;

UPDATE email_templates
SET
  body_no = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">{{reminder_badge_label}}</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hei {{customer_first_name}},</p>
  {{reminder_intro_html}}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:0 8px 8px 0;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:6px 0;font-size:14px;color:#6B5B4E;">Bestilling</td><td style="padding:6px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{order_number}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6B5B4E;">Restbel&oslash;p</td><td style="padding:6px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{remainder_amount_nok}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6B5B4E;">Betalingsfrist</td><td style="padding:6px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{due_date}} ({{days_left}} dager igjen)</td></tr>
      </table>
    </td></tr>
  </table>
  {{reminder_support_html}}
  {{reminder_consequence_html}}
  <p style="font-size:13px;color:#9B8E82;text-align:center;margin:0 0 24px;">P&aring;minnelse {{reminder_number}} av {{total_reminders}}</p>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{payment_url}}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Betal rest n&aring;</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{payment_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Betal rest n&aring;</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$,
  body_en = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">{{reminder_badge_label}}</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{customer_first_name}},</p>
  {{reminder_intro_html}}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:0 8px 8px 0;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:6px 0;font-size:14px;color:#6B5B4E;">Order</td><td style="padding:6px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{order_number}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6B5B4E;">Remaining balance</td><td style="padding:6px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{remainder_amount_nok}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6B5B4E;">Payment deadline</td><td style="padding:6px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{due_date}} ({{days_left}} days left)</td></tr>
      </table>
    </td></tr>
  </table>
  {{reminder_support_html}}
  {{reminder_consequence_html}}
  <p style="font-size:13px;color:#9B8E82;text-align:center;margin:0 0 24px;">Reminder {{reminder_number}} of {{total_reminders}}</p>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{payment_url}}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Pay remainder now</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{payment_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Pay remainder now</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$,
  variables = '[
    "customer_name",
    "customer_first_name",
    "order_number",
    "remainder_amount_nok",
    "due_date",
    "days_left",
    "payment_url",
    "order_url",
    "reminder_number",
    "total_reminders",
    "tip_html",
    "reminder_badge_label",
    "reminder_intro_html",
    "reminder_support_html",
    "reminder_consequence_html"
  ]'::jsonb
WHERE template_key = 'egg.remainder.reminder';

COMMIT;


-- ============================================================
-- Migration 2/18: 20260319113000_rework_egg_shipment_followup.sql
-- ============================================================
-- Align egg shipment follow-up with actual shipment timing.
-- This replaces the legacy "delivery tomorrow" wording with an "on the way" follow-up
-- and cancels old pre-shipment scheduled instances.

UPDATE email_templates
SET
  subject_no = 'Rugeeggene dine er på vei - {{order_number}}',
  subject_en = 'Your hatching eggs are on the way - {{order_number}}',
  body_no = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#ECFDF5;color:#2D6A4F;border:1px solid #BBF7D0;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Bestillingen er sendt</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hei {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Rugeegg-bestilling <strong>{{order_number}}</strong> er nå på vei til deg.</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Nå er det lurt å gjøre klart rugemaskinen slik at alt er klart når pakken kommer frem.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Sporingsnummer</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{tracking_number}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Forventet levering</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{delivery_date}}</td></tr>
      </table>
    </td></tr>
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">1</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Sjekk at rugemaskinen holder 37.5&deg;C</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">2</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">La eggene temperere i romtemperatur i 12 timer før ruging</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">3</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Legg eggene forsiktig i maskinen med spissen ned</td>
        </tr>
      </table>
    </td></tr>
  </table>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{tracking_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Spor pakken hos Posten</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{tracking_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Spor pakken hos Posten</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$,
  body_en = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#ECFDF5;color:#2D6A4F;border:1px solid #BBF7D0;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Order shipped</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Your hatching egg order <strong>{{order_number}}</strong> is on the way to you.</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Now is a good time to prepare the incubator so everything is ready when the package arrives.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Tracking number</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{tracking_number}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Expected delivery</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{delivery_date}}</td></tr>
      </table>
    </td></tr>
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">1</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Check that the incubator holds 37.5&deg;C</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">2</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Let the eggs acclimate at room temperature for 12 hours before incubation</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">3</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Place the eggs carefully in the incubator with the pointed end down</td>
        </tr>
      </table>
    </td></tr>
  </table>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{tracking_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Track with Posten</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{tracking_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Track with Posten</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$
WHERE template_key = 'egg.delivery.day_before';

UPDATE email_flows
SET event_type = 'egg.order.shipped_followup'
WHERE flow_key = 'egg.delivery.day_before';

UPDATE email_flow_instances
SET
  status = 'cancelled',
  last_error = 'legacy_delivery_day_before_replaced',
  processed_at = NOW()
WHERE flow_key = 'egg.delivery.day_before'
  AND status = 'scheduled'
  AND trigger_date_key NOT LIKE 'shipped-followup:%';


-- ============================================================
-- Migration 3/18: 20260319150000_add_chicken_pickup_date.sql
-- ============================================================
-- Allow customers to choose a specific pickup day within their pickup week
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS pickup_date DATE;


-- ============================================================
-- Migration 4/18: 20260322113000_add_chicken_remainder_payment_enabled.sql
-- ============================================================
ALTER TABLE chicken_orders
  ADD COLUMN IF NOT EXISTS remainder_payment_enabled BOOLEAN NOT NULL DEFAULT FALSE;


-- ============================================================
-- Migration 5/18: 20260322163000_add_chicken_remainder_enabled_email_template.sql
-- ============================================================
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
VALUES (
  'chicken.order.remainder.enabled.customer',
  'transactional',
  'chickens',
  'Restbetaling er klar - {{order_number}}',
  'Remainder payment is ready - {{order_number}}',
  '<h2>Restbetaling er klar</h2><p>Hei {{customer_name}},</p><p>Restbetalingen for bestilling <strong>{{order_number}}</strong> er nå aktivert.</p><p>Du kan logge inn på Min side og betale med Vipps med en gang.</p>{{order_lines_html}}<p><strong>Restbeløp:</strong> {{remainder_amount_nok}}<br/><strong>Hentedato:</strong> {{pickup_date}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Åpne Min side</a></p><p>Hvis noe er uklart, er det bare å svare på denne e-posten.</p>',
  '<h2>Remainder payment is ready</h2><p>Hi {{customer_name}},</p><p>The remainder payment for order <strong>{{order_number}}</strong> has now been enabled.</p><p>You can log in to My Page and pay with Vipps right away.</p>{{order_lines_html_en}}<p><strong>Remaining amount:</strong> {{remainder_amount_nok}}<br/><strong>Pickup date:</strong> {{pickup_date}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Open My Page</a></p><p>If anything is unclear, just reply to this email.</p>',
  '["customer_name","order_number","breed_name","breed_name_en","total_birds_label","total_birds_label_en","order_lines_html","order_lines_html_en","pickup_date","remainder_amount_nok","order_url"]'::jsonb,
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
  'Seed chicken remainder enabled template',
  'migration'
FROM email_templates t
LEFT JOIN email_template_versions v
  ON v.template_id = t.id AND v.version = 1
WHERE t.template_key = 'chicken.order.remainder.enabled.customer'
  AND v.id IS NULL;


-- ============================================================
-- Migration 6/18: 20260322190000_refresh_chicken_confirmation_template.sql
-- ============================================================
BEGIN;

UPDATE email_templates
SET
  subject_no = 'Bestilling bekreftet - {{order_number}}',
  subject_en = 'Order confirmed - {{order_number}}',
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <span style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:#ECFDF5;color:#2D6A4F;font-size:13px;font-weight:600;">Bestilling bekreftet</span>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hei {{customer_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;">Vi har mottatt forskuddet for kyllingbestilling <strong>{{order_number}}</strong>. Kyllingene dine er nå reservert.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Ordre</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{order_number}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Hentedato</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{pickup_date}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Levering</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{delivery_label}}</td></tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:24px 0 8px;font-size:15px;line-height:1.6;font-weight:700;color:#1C1210;">Bestilte linjer</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#6B5B4E;">Her ser du hver rase, alder ved henting, antall og pris per linje.</p>

    {{order_lines_html}}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border:1px solid #E8DFD5;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:12px 20px;font-size:14px;color:#6B5B4E;">Forskudd betalt</td><td style="padding:12px 20px;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
      <tr><td style="padding:12px 20px;font-size:14px;color:#6B5B4E;">Rest ved henting</td><td style="padding:12px 20px;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
      <tr><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;background-color:#FFF9E6;">Totalt</td><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;text-align:right;background-color:#FFF9E6;">{{total_amount_nok}}</td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#1C1210;"><strong>Hva skjer nå?</strong></p>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#1C1210;">Vi sender oppdateringer når hentedatoen nærmer seg. Du kan når som helst åpne Min side for å se bestillingen din.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:44px;width:220px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">Åpne Min side</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{order_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">Åpne Min side</a>
      </td></tr>
    </table>

  </td></tr>
</table>$$,
  body_en = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <span style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:#ECFDF5;color:#2D6A4F;font-size:13px;font-weight:600;">Order confirmed</span>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hi {{customer_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;">We have received the deposit for chicken order <strong>{{order_number}}</strong>. Your chickens are now reserved.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Order</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{order_number}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Pickup date</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{pickup_date}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Delivery</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{delivery_label}}</td></tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:24px 0 8px;font-size:15px;line-height:1.6;font-weight:700;color:#1C1210;">Order lines</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#6B5B4E;">Each line shows the breed, age at pickup, quantity, and price.</p>

    {{order_lines_html_en}}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border:1px solid #E8DFD5;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:12px 20px;font-size:14px;color:#6B5B4E;">Deposit paid</td><td style="padding:12px 20px;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
      <tr><td style="padding:12px 20px;font-size:14px;color:#6B5B4E;">Remainder at pickup</td><td style="padding:12px 20px;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
      <tr><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;background-color:#FFF9E6;">Total</td><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;text-align:right;background-color:#FFF9E6;">{{total_amount_nok}}</td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#1C1210;"><strong>What happens next?</strong></p>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#1C1210;">We will send updates as the pickup date gets closer. You can open My Page at any time to review your order.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:44px;width:220px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">Open My Page</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{order_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">Open My Page</a>
      </td></tr>
    </table>

  </td></tr>
</table>$$,
  variables = '["customer_name","order_number","breed_name","breed_name_en","breed_name_plain","quantity_hens","quantity_roosters","total_birds_label","total_birds_label_en","order_lines_html","order_lines_html_en","pickup_date","delivery_label","total_amount_nok","deposit_amount_nok","remainder_amount_nok","order_url"]'::jsonb,
  updated_at = now()
WHERE template_key = 'chicken.order.deposit.confirmed.customer';

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
  et.id,
  et.current_version + 1,
  et.subject_no,
  et.subject_en,
  et.body_no,
  et.body_en,
  'Clarify chicken confirmation copy and emphasize detailed line items',
  'codex'
FROM email_templates et
WHERE et.template_key = 'chicken.order.deposit.confirmed.customer';

UPDATE email_templates
SET current_version = current_version + 1
WHERE template_key = 'chicken.order.deposit.confirmed.customer';

COMMIT;


-- ============================================================
-- Migration 7/18: 20260322200000_add_chicken_pickup_time.sql
-- ============================================================
-- Allow customers to choose a pickup time slot
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS pickup_time TEXT;


-- ============================================================
-- Migration 8/18: 20260323000500_refresh_post_order_customer_email_copy.sql
-- ============================================================
﻿BEGIN;

CREATE OR REPLACE FUNCTION refresh_email_template(
  p_template_key text,
  p_classification email_classification,
  p_product_scope text,
  p_subject_no text,
  p_subject_en text,
  p_body_no text,
  p_body_en text,
  p_variables text[],
  p_change_note text
) RETURNS void
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_template_id uuid;
  v_version int;
BEGIN
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
    p_template_key,
    p_classification,
    p_product_scope,
    p_subject_no,
    p_subject_en,
    p_body_no,
    p_body_en,
    to_jsonb(p_variables),
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
    active = true,
    current_version = email_templates.current_version + 1,
    updated_at = now()
  RETURNING id, current_version INTO v_template_id, v_version;

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
  VALUES (
    v_template_id,
    v_version,
    p_subject_no,
    p_subject_en,
    p_body_no,
    p_body_en,
    p_change_note,
    'codex'
  )
  ON CONFLICT (template_id, version) DO NOTHING;
END;
$fn$;

SELECT refresh_email_template(
  'pig.order.deposit.confirmed.customer',
  'transactional',
  'pig',
  'Bestillingen er bekreftet – {{order_number}}',
  'Order confirmed – {{order_number}}',
  $pig_dep_no$
<p>Hei {{customer_first_name}},</p>
<p>Takk for bestillingen din. Vi har registrert forskuddet for <strong>{{order_number}}</strong>.</p>
<p>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</p>
<p><strong>Bestillingen din</strong></p>
<p><strong>Kasse:</strong> {{box_label}}<br/><strong>Levering eller henting:</strong> {{delivery_label}}</p>
{{extras_html}}
{{discount_html}}
<p><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Forskudd betalt:</strong> {{deposit_amount_nok}}<br/><strong>Restbetaling:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Bestillingen ligger klar på Min side.</li>
    <li>Vi sender egen informasjon om restbetalingen når den nærmer seg.</li>
    <li>Du får nye oppdateringer når det nærmer seg slakt, levering og henting.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$pig_dep_no$,
  $pig_dep_en$
<p>Hi {{customer_first_name}},</p>
<p>Thank you for your order. We have registered the deposit for <strong>{{order_number}}</strong>.</p>
<p>You will always find the latest status on My Page when you log in with Vipps.</p>
<p><strong>Your order</strong></p>
<p><strong>Box:</strong> {{box_label}}<br/><strong>Delivery or pickup:</strong> {{delivery_label}}</p>
{{extras_html}}
{{discount_html}}
<p><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Deposit paid:</strong> {{deposit_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order is now available on My Page.</li>
    <li>We will send separate information about the remainder payment when it gets closer.</li>
    <li>You will receive new updates as slaughter, delivery, and pickup get closer.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$pig_dep_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'box_label', 'ribbe_choice', 'delivery_label', 'extras_html', 'discount_html', 'total_amount_nok', 'deposit_amount_nok', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'pig.remainder.explainer.full',
  'transactional',
  'pig',
  'Slik fungerer restbetalingen – {{order_number}}',
  'How the remainder payment works – {{order_number}}',
  $pig_full_no$
<p>Hei {{customer_first_name}},</p>
<p>Her kommer en rolig oversikt over restbetalingen for <strong>{{order_number}}</strong>.</p>
<p><strong>Restbeløp:</strong> {{remainder_amount_nok}}<br/><strong>Betalingsfrist:</strong> {{due_date}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Du kan når som helst åpne bestillingen på Min side.</li>
    <li>Vi sender vennlige påminnelser før fristen dersom restbetalingen ikke er registrert.</li>
    <li>Når restbetalingen er inne, er bestillingen klar videre mot levering eller henting.</li>
  </ol>
</div>
<p>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</p>
<p><a href="{{order_url}}">Åpne Min side</a></p>
$pig_full_no$,
  $pig_full_en$
<p>Hi {{customer_first_name}},</p>
<p>Here is a simple overview of the remainder payment for <strong>{{order_number}}</strong>.</p>
<p><strong>Remainder:</strong> {{remainder_amount_nok}}<br/><strong>Due date:</strong> {{due_date}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>You can open the order on My Page at any time.</li>
    <li>We will send friendly reminders before the deadline if the remainder has not been registered.</li>
    <li>Once the remainder is paid, the order is ready to move on to delivery or pickup.</li>
  </ol>
</div>
<p>You will always find the latest status on My Page when you log in with Vipps.</p>
<p><a href="{{order_url}}">Open My Page</a></p>
$pig_full_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'remainder_amount_nok', 'due_date', 'order_url'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'pig.remainder.explainer.reduced',
  'transactional',
  'pig',
  'Restbetalingen er registrert – {{order_number}}',
  'Remainder payment registered – {{order_number}}',
  $pig_red_no$
<p>Hei {{customer_first_name}},</p>
<p>Vi har registrert restbetalingen for <strong>{{order_number}}</strong>.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Bestillingen din ligger oppdatert på Min side.</li>
    <li>Vi følger opp videre med informasjon om levering eller henting.</li>
    <li>Du trenger ikke gjøre noe mer akkurat nå.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
$pig_red_no$,
  $pig_red_en$
<p>Hi {{customer_first_name}},</p>
<p>We have registered the remainder payment for <strong>{{order_number}}</strong>.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order has been updated on My Page.</li>
    <li>We will follow up with delivery or pickup information later.</li>
    <li>You do not need to do anything else right now.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
$pig_red_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'order_url'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'pig.remainder.reminder',
  'transactional',
  'pig',
  'Påminnelse om restbetaling ({{days_left}} dager) – {{order_number}}',
  'Remainder payment reminder ({{days_left}} days) – {{order_number}}',
  $pig_rem_no$
<p>Hei {{customer_first_name}},</p>
<p>Dette er en vennlig påminnelse om restbetalingen for <strong>{{order_number}}</strong>.</p>
<p><strong>Restbeløp:</strong> {{remainder_amount_nok}}<br/><strong>Betalingsfrist:</strong> {{due_date}} ({{days_left}} dager igjen)</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Registrer restbetalingen innen fristen.</li>
    <li>Når betalingen er inne, er bestillingen klar videre mot levering eller henting.</li>
    <li>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
$pig_rem_no$,
  $pig_rem_en$
<p>Hi {{customer_first_name}},</p>
<p>This is a friendly reminder about the remainder payment for <strong>{{order_number}}</strong>.</p>
<p><strong>Remainder:</strong> {{remainder_amount_nok}}<br/><strong>Due date:</strong> {{due_date}} ({{days_left}} days left)</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Register the remainder payment before the deadline.</li>
    <li>Once the payment is in, the order is ready to move on to delivery or pickup.</li>
    <li>You will always find the latest status on My Page when you log in with Vipps.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
$pig_rem_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'remainder_amount_nok', 'due_date', 'days_left', 'order_url'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'pig.order.remainder.paid.customer',
  'transactional',
  'pig',
  'Restbetalingen er mottatt – {{order_number}}',
  'Remainder payment received – {{order_number}}',
  $pig_paid_no$
<p>Hei {{customer_first_name}},</p>
<p>Takk. Vi har registrert restbetalingen for <strong>{{order_number}}</strong>.</p>
<p><strong>Kasse:</strong> {{box_label}}<br/><strong>Levering eller henting:</strong> {{delivery_label}}<br/><strong>Totalt betalt:</strong> {{total_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Bestillingen er nå fullt betalt.</li>
    <li>Vi sender neste oppdatering når levering eller henting nærmer seg.</li>
    <li>Du finner ordren på Min side når som helst.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$pig_paid_no$,
  $pig_paid_en$
<p>Hi {{customer_first_name}},</p>
<p>Thank you. We have registered the remainder payment for <strong>{{order_number}}</strong>.</p>
<p><strong>Box:</strong> {{box_label}}<br/><strong>Delivery or pickup:</strong> {{delivery_label}}<br/><strong>Total paid:</strong> {{total_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order is now fully paid.</li>
    <li>We will send the next update when delivery or pickup gets closer.</li>
    <li>You can always find the order on My Page.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$pig_paid_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'box_label', 'delivery_label', 'total_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'egg.order.deposit.confirmed.customer',
  'transactional',
  'eggs',
  'Bestillingen er bekreftet – {{order_number}}',
  'Order confirmed – {{order_number}}',
  $egg_dep_no$
<p>Hei {{customer_first_name}},</p>
<p>Takk for bestillingen din. Vi har registrert forskuddet for <strong>{{order_number}}</strong>.</p>
<p>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Leveringsuke:</strong> Uke {{week_number}}<br/><strong>Totalt antall:</strong> {{total_quantity}} egg<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Forskudd betalt:</strong> {{deposit_amount_nok}}<br/><strong>Restbeløp:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Bestillingen ligger klar på Min side.</li>
    <li>Vi sender vennlige påminnelser om restbetalingen før fristen.</li>
    <li>Når ordren er fullt betalt og sendt, får du sporingsinformasjon på e-post.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$egg_dep_no$,
  $egg_dep_en$
<p>Hi {{customer_first_name}},</p>
<p>Thank you for your order. We have registered the deposit for <strong>{{order_number}}</strong>.</p>
<p>You will always find the latest status on My Page when you log in with Vipps.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Delivery week:</strong> Week {{week_number}}<br/><strong>Total quantity:</strong> {{total_quantity}} eggs<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Deposit paid:</strong> {{deposit_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order is now available on My Page.</li>
    <li>We will send friendly remainder reminders before the deadline.</li>
    <li>Once the order is fully paid and shipped, you will receive tracking by email.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$egg_dep_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'breed_name', 'week_number', 'base_quantity', 'additions_quantity', 'total_quantity', 'order_lines_html', 'order_lines_html_en', 'total_amount_nok', 'deposit_amount_nok', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'egg.remainder.reminder',
  'transactional',
  'eggs',
  'Påminnelse om restbetaling ({{days_left}} dager) – {{order_number}}',
  'Remainder payment reminder ({{days_left}} days) – {{order_number}}',
  $egg_rem_no$
<p>{{reminder_intro_html}}</p>
<p>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">Bestilling</td>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>{{order_number}}</strong></td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">Restbeløp</td>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>{{remainder_amount_nok}}</strong></td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">Betalingsfrist</td>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>{{due_date}} ({{days_left}} dager igjen)</strong></td>
  </tr>
</table>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p>{{reminder_support_html}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fde68a;border-radius:14px;background:#fffbeb;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Betal restbeløpet på Min side før fristen.</li>
    <li>Når betalingen er registrert, er ordren klar videre mot utsending.</li>
    <li>Vi sender ny oppdatering når pakken er sendt.</li>
  </ol>
</div>
<p>{{reminder_consequence_html}}</p>
<p style="color:#6b7280;">Påminnelse {{reminder_number}} av {{total_reminders}}</p>
<p><a href="{{order_url}}">Betal rest nå</a></p>
{{tip_html}}
$egg_rem_no$,
  $egg_rem_en$
<p>{{reminder_intro_html}}</p>
<p>You will always find the latest status on My Page when you log in with Vipps.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">Order</td>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>{{order_number}}</strong></td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">Remaining amount</td>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>{{remainder_amount_nok}}</strong></td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">Payment deadline</td>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>{{due_date}} ({{days_left}} days left)</strong></td>
  </tr>
</table>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p>{{reminder_support_html}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fde68a;border-radius:14px;background:#fffbeb;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Pay the remaining amount on My Page before the deadline.</li>
    <li>Once the payment is registered, the order is ready to move on to shipping.</li>
    <li>We will send a new update when the parcel has been shipped.</li>
  </ol>
</div>
<p>{{reminder_consequence_html}}</p>
<p style="color:#6b7280;">Reminder {{reminder_number}} of {{total_reminders}}</p>
<p><a href="{{order_url}}">Pay remainder now</a></p>
{{tip_html}}
$egg_rem_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'remainder_amount_nok', 'due_date', 'days_left', 'reminder_number', 'total_reminders', 'order_lines_html', 'order_lines_html_en', 'order_url', 'reminder_intro_html', 'reminder_support_html', 'reminder_consequence_html', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'egg.order.remainder.paid.customer',
  'transactional',
  'eggs',
  'Restbetalingen er mottatt – {{order_number}}',
  'Remainder payment received – {{order_number}}',
  $egg_paid_no$
<p>Hei {{customer_first_name}},</p>
<p>Takk. Vi har registrert restbetalingen for <strong>{{order_number}}</strong>.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_quantity}} egg<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Restbetaling registrert:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Ordren er nå fullt betalt.</li>
    <li>Vi sender ny e-post når pakken er sendt.</li>
    <li>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$egg_paid_no$,
  $egg_paid_en$
<p>Hi {{customer_first_name}},</p>
<p>Thank you. We have registered the remainder payment for <strong>{{order_number}}</strong>.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total quantity:</strong> {{total_quantity}} eggs<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Remainder registered:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order is now fully paid.</li>
    <li>We will send another email when the parcel has been shipped.</li>
    <li>You will always find the latest status on My Page when you log in with Vipps.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$egg_paid_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'breed_name', 'base_quantity', 'additions_quantity', 'total_quantity', 'order_lines_html', 'order_lines_html_en', 'total_amount_nok', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'egg.order.shipped.customer',
  'transactional',
  'eggs',
  'Rugeeggene er sendt – {{order_number}}',
  'Your hatching eggs are on the way – {{order_number}}',
  $egg_ship_no$
<p>Hei {{customer_first_name}},</p>
<p>Bestilling <strong>{{order_number}}</strong> er sendt, og pakken er nå på vei til deg.</p>
<p>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</p>
<p><strong>Sporingsnummer:</strong> {{tracking_number}}<br/><a href="{{tracking_url}}">Spor pakken hos Posten</a></p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_quantity}} egg<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Forskudd:</strong> {{deposit_amount_nok}}<br/><strong>Restbeløp:</strong> {{remainder_amount_nok}}<br/><strong>Levering:</strong> Uke {{delivery_week}} ({{delivery_date}})</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Følg sporingen hos Posten.</li>
    <li>Når pakken kommer frem, sjekk innholdet rolig og forsiktig.</li>
    <li>La eggene hvile og temperere før du legger dem i rugemaskinen.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$egg_ship_no$,
  $egg_ship_en$
<p>Hi {{customer_first_name}},</p>
<p>Your order <strong>{{order_number}}</strong> has been shipped and is now on its way to you.</p>
<p>You will always find the latest status on My Page when you log in with Vipps.</p>
<p><strong>Tracking number:</strong> {{tracking_number}}<br/><a href="{{tracking_url}}">Track the parcel with Posten</a></p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total quantity:</strong> {{total_quantity}} eggs<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Deposit:</strong> {{deposit_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}<br/><strong>Delivery:</strong> Week {{delivery_week}} ({{delivery_date}})</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Track the parcel with Posten.</li>
    <li>Check the contents carefully when the parcel arrives.</li>
    <li>Let the eggs rest and warm up gently before putting them in the incubator.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$egg_ship_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'tracking_number', 'tracking_url', 'order_lines_html', 'order_lines_html_en', 'total_quantity', 'total_amount_nok', 'deposit_amount_nok', 'remainder_amount_nok', 'delivery_week', 'delivery_date', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'egg.delivery.day_before',
  'transactional',
  'eggs',
  'Rugeeggene er på vei – {{order_number}}',
  'Your hatching eggs are on the way – {{order_number}}',
  $egg_way_no$
<p>Hei {{customer_first_name}},</p>
<p>En liten oppfølging fra oss: bestilling <strong>{{order_number}}</strong> er på vei, og det er lurt å gjøre klart til mottak og ruging nå.</p>
<p><strong>Sporingsnummer:</strong> {{tracking_number}}<br/><a href="{{tracking_url}}">Spor pakken hos Posten</a></p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_quantity}} egg<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Levering:</strong> Uke {{delivery_week}} ({{delivery_date}})</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Følg med på sporingen.</li>
    <li>Gjør rugemaskinen klar.</li>
    <li>La eggene hvile og temperere før oppstart.</li>
  </ol>
</div>
<p>Du finner alltid bestillingen på Min side når du logger inn med Vipps.</p>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$egg_way_no$,
  $egg_way_en$
<p>Hi {{customer_first_name}},</p>
<p>A quick follow-up from us: order <strong>{{order_number}}</strong> is on the way, so this is a good time to get ready for delivery and incubation.</p>
<p><strong>Tracking number:</strong> {{tracking_number}}<br/><a href="{{tracking_url}}">Track the parcel with Posten</a></p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total quantity:</strong> {{total_quantity}} eggs<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Delivery:</strong> Week {{delivery_week}} ({{delivery_date}})</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Keep an eye on the tracking.</li>
    <li>Prepare the incubator.</li>
    <li>Let the eggs rest and warm up gently before setting them.</li>
  </ol>
</div>
<p>You will always find the order on My Page when you log in with Vipps.</p>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$egg_way_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'tracking_number', 'tracking_url', 'order_lines_html', 'order_lines_html_en', 'total_quantity', 'total_amount_nok', 'delivery_week', 'delivery_date', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'egg.hatch.followup',
  'transactional',
  'eggs',
  'Lykke til med klekkingen – {{order_number}}',
  'Happy hatching – {{order_number}}',
  $egg_hatch_no$
<p>Hei {{customer_first_name}},</p>
<p>Vi håper klekkingen er godt i gang for <strong>{{order_number}}</strong>, og at du er fornøyd så langt.</p>
<p>Hvis du lurer på noe underveis, er det bare å sende oss en melding. Vi hjelper gjerne.</p>
<p><strong>Bestillingen din</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_quantity}} egg</p>
<p><a href="{{message_url}}">Send melding via Min side</a></p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Følg med på klekkingen og skriv ned det du observerer.</li>
    <li>Ta kontakt hvis du ønsker råd om temperatur, fuktighet eller videre oppfølging.</li>
    <li>Bestillingen din ligger fortsatt tilgjengelig på Min side.</li>
  </ol>
</div>
{{tip_html}}
<div style="margin:24px 0;padding:16px;border:1px solid #f3d4aa;border-radius:14px;background:#fff8ef;">
  <strong>Lyst til å prøve ullgris til jul?</strong>
  <p>Som rugeeggkunde får du <strong>10% rabatt på forskuddet</strong> på en Mangalitsa-kasse med koden <strong>{{deposit_discount_code}}</strong>.</p>
  <p>Del vennerabatten din videre: vennene dine får rabatt på forskuddet, og du kan bygge opp kreditt tilsvarende opptil <strong>50% av forskuddet</strong> på din egen kasse.</p>
  <p><a href="{{pork_url}}">Se ullgris-kasser</a></p>
</div>
$egg_hatch_no$,
  $egg_hatch_en$
<p>Hi {{customer_first_name}},</p>
<p>We hope the hatch is well underway for <strong>{{order_number}}</strong> and that you are happy with everything so far.</p>
<p>If you have any questions along the way, just send us a message. We are happy to help.</p>
<p><strong>Your order</strong></p>
{{order_lines_html_en}}
<p><strong>Total quantity:</strong> {{total_quantity}} eggs</p>
<p><a href="{{message_url}}">Send a message through My Page</a></p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Keep an eye on the hatch and note what you observe.</li>
    <li>Reach out if you want advice on temperature, humidity, or the next steps.</li>
    <li>Your order is still available on My Page.</li>
  </ol>
</div>
{{tip_html}}
<div style="margin:24px 0;padding:16px;border:1px solid #f3d4aa;border-radius:14px;background:#fff8ef;">
  <strong>Would you like to try Mangalitsa pork for Christmas?</strong>
  <p>As a hatching egg customer, you get <strong>10% off the deposit</strong> on a Mangalitsa box with the code <strong>{{deposit_discount_code}}</strong>.</p>
  <p>Share your referral code with friends: they get a discount on the deposit, and you can build up credit worth up to <strong>50% of the deposit</strong> on your own box.</p>
  <p><a href="{{pork_url}}">See Mangalitsa boxes</a></p>
</div>
$egg_hatch_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'total_quantity', 'order_lines_html', 'order_lines_html_en', 'message_url', 'pork_url', 'deposit_discount_code', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'egg.order.forfeited',
  'transactional',
  'eggs',
  'Bestillingen er kansellert – {{order_number}}',
  'Order cancelled – {{order_number}}',
  $egg_forfeit_no$
<p>Hei {{customer_first_name}},</p>
<p>Bestilling <strong>{{order_number}}</strong> er dessverre kansellert fordi restbetalingen ikke ble registrert innen fristen.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fee2e2;border-radius:14px;background:#fff5f5;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Ordren er lukket, og eggene frigjøres til andre kunder.</li>
    <li>Du kan fortsatt logge inn på Min side med Vipps for å se ordrehistorikken.</li>
    <li>Hvis du ønsker å bestille på nytt, hjelper vi deg gjerne med å finne en ny uke.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
$egg_forfeit_no$,
  $egg_forfeit_en$
<p>Hi {{customer_first_name}},</p>
<p>Your order <strong>{{order_number}}</strong> has unfortunately been cancelled because the remainder payment was not registered before the deadline.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fee2e2;border-radius:14px;background:#fff5f5;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>The order is now closed and the eggs are released to other customers.</li>
    <li>You can still log in with Vipps and view the order history on My Page.</li>
    <li>If you want to order again, we are happy to help you find a new delivery week.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
$egg_forfeit_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'order_url'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.order.deposit.confirmed.customer',
  'transactional',
  'chickens',
  'Bestillingen er bekreftet – {{order_number}}',
  'Order confirmed – {{order_number}}',
  $chk_dep_no$
<p>Hei {{customer_first_name}},</p>
<p>Takk for bestillingen din. Vi har registrert forskuddet for <strong>{{order_number}}</strong>.</p>
<p>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_birds_label}}<br/><strong>Levering eller henting:</strong> {{delivery_label}}<br/><strong>Henteuke eller dato:</strong> {{pickup_date}}<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Forskudd betalt:</strong> {{deposit_amount_nok}}<br/><strong>Restbeløp:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Bestillingen ligger klar på Min side.</li>
    <li>Vi sender ny oppdatering når henting eller levering nærmer seg.</li>
    <li>Hvis det blir aktuelt med restbetaling via Vipps, får du beskjed og kan betale fra Min side.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$chk_dep_no$,
  $chk_dep_en$
<p>Hi {{customer_first_name}},</p>
<p>Thank you for your order. We have registered the deposit for <strong>{{order_number}}</strong>.</p>
<p>You will always find the latest status on My Page when you log in with Vipps.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total birds:</strong> {{total_birds_label_en}}<br/><strong>Delivery or pickup:</strong> {{delivery_label}}<br/><strong>Pickup week or date:</strong> {{pickup_date}}<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Deposit paid:</strong> {{deposit_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order is now available on My Page.</li>
    <li>We will send another update when pickup or delivery gets closer.</li>
    <li>If Vipps remainder payment becomes relevant, you will be notified and can pay from My Page.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$chk_dep_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'breed_name', 'breed_name_en', 'quantity_hens', 'quantity_roosters', 'total_birds_label', 'total_birds_label_en', 'order_lines_html', 'order_lines_html_en', 'pickup_date', 'delivery_label', 'total_amount_nok', 'deposit_amount_nok', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.order.remainder.enabled.customer',
  'transactional',
  'chickens',
  'Restbetalingen er klar for betaling – {{order_number}}',
  'Remainder payment is now ready – {{order_number}}',
  $chk_en_no$
<p>Hei {{customer_first_name}},</p>
<p>Vi har nå åpnet restbetalingen for <strong>{{order_number}}</strong>.</p>
<p>Logg inn med Vipps på Min side for å fullføre betalingen med en gang.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_birds_label}}<br/><strong>Henteuke eller dato:</strong> {{pickup_date}}<br/><strong>Restbeløp:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fde68a;border-radius:14px;background:#fffbeb;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Åpne Min side og trykk <em>Betal rest</em>.</li>
    <li>Du blir sendt videre til Vipps på telefonen.</li>
    <li>Når betalingen er registrert, er ordren ferdig oppgjort.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$chk_en_no$,
  $chk_en_en$
<p>Hi {{customer_first_name}},</p>
<p>We have now enabled the remainder payment for <strong>{{order_number}}</strong>.</p>
<p>Log in with Vipps on My Page to complete the payment right away.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total birds:</strong> {{total_birds_label_en}}<br/><strong>Pickup week or date:</strong> {{pickup_date}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fde68a;border-radius:14px;background:#fffbeb;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Open My Page and click <em>Pay remainder</em>.</li>
    <li>You will be redirected to Vipps on your phone.</li>
    <li>Once the payment is registered, the order is fully settled.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$chk_en_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'breed_name', 'breed_name_en', 'total_birds_label', 'total_birds_label_en', 'order_lines_html', 'order_lines_html_en', 'pickup_date', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.order.remainder.paid.customer',
  'transactional',
  'chickens',
  'Restbetalingen er mottatt – {{order_number}}',
  'Remainder payment received – {{order_number}}',
  $chk_paid_no$
<p>Hei {{customer_first_name}},</p>
<p>Takk. Vi har registrert restbetalingen for <strong>{{order_number}}</strong>.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_birds_label}}<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Henteuke eller dato:</strong> {{pickup_date}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Ordren er nå fullt betalt.</li>
    <li>Du finner alltid status på Min side når du logger inn med Vipps.</li>
    <li>Hvis du trenger hjelp etter kjøpet, er det bare å kontakte oss.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$chk_paid_no$,
  $chk_paid_en$
<p>Hi {{customer_first_name}},</p>
<p>Thank you. We have registered the remainder payment for <strong>{{order_number}}</strong>.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total birds:</strong> {{total_birds_label_en}}<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Pickup week or date:</strong> {{pickup_date}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order is now fully paid.</li>
    <li>You will always find the latest status on My Page when you log in with Vipps.</li>
    <li>If you need help after the purchase, just get in touch.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$chk_paid_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'breed_name', 'breed_name_en', 'total_birds_label', 'total_birds_label_en', 'order_lines_html', 'order_lines_html_en', 'total_amount_nok', 'pickup_date', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.ready_for_pickup',
  'transactional',
  'chickens',
  'Kyllingene er klare for henting – {{order_number}}',
  'Your chickens are ready for pickup – {{order_number}}',
  $chk_ready_no$
<p>Hei {{customer_first_name}},</p>
<p>Kyllingene i bestilling <strong>{{order_number}}</strong> er nå klare for henting.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_birds_label}}<br/><strong>Levering eller henting:</strong> {{delivery_label}}<br/><strong>Hentedato:</strong> {{pickup_date}}<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Forskudd:</strong> {{deposit_amount_nok}}<br/><strong>Eventuelt restbeløp:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Sjekk detaljene på Min side.</li>
    <li>Ta gjerne med egnet transportkasse eller bur.</li>
    <li>Hvis restbetalingen åpnes i Vipps, får du egen e-post om det.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$chk_ready_no$,
  $chk_ready_en$
<p>Hi {{customer_first_name}},</p>
<p>The chickens in order <strong>{{order_number}}</strong> are now ready for pickup.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total birds:</strong> {{total_birds_label_en}}<br/><strong>Delivery or pickup:</strong> {{delivery_label_en}}<br/><strong>Pickup date:</strong> {{pickup_date_en}}<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Deposit:</strong> {{deposit_amount_nok}}<br/><strong>Any remaining amount:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Check the details on My Page.</li>
    <li>Please bring a suitable transport crate or box.</li>
    <li>If the remainder payment is enabled in Vipps, you will receive a separate email about it.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$chk_ready_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'total_birds_label', 'total_birds_label_en', 'order_lines_html', 'order_lines_html_en', 'pickup_date', 'pickup_date_en', 'delivery_label', 'delivery_label_en', 'total_amount_nok', 'deposit_amount_nok', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.pickup.reminder',
  'transactional',
  'chickens',
  'Påminnelse om henting ({{days_left}} dager) – {{order_number}}',
  'Pickup reminder ({{days_left}} days) – {{order_number}}',
  $chk_pick_no$
<p>Hei {{customer_first_name}},</p>
<p>Dette er en vennlig påminnelse om henting for <strong>{{order_number}}</strong>.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_birds_label}}<br/><strong>Hentedato:</strong> {{pickup_date}} ({{days_left}} dager igjen)<br/><strong>Levering eller henting:</strong> {{delivery_label}}<br/><strong>Eventuelt restbeløp:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Sjekk at hentedatoen passer.</li>
    <li>Gjør klart transportutstyr og oppstalling hjemme.</li>
    <li>Du finner alltid bestillingen på Min side når du logger inn med Vipps.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$chk_pick_no$,
  $chk_pick_en$
<p>Hi {{customer_first_name}},</p>
<p>This is a friendly pickup reminder for <strong>{{order_number}}</strong>.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total birds:</strong> {{total_birds_label_en}}<br/><strong>Pickup date:</strong> {{pickup_date_en}} ({{days_left}} days left)<br/><strong>Delivery or pickup:</strong> {{delivery_label_en}}<br/><strong>Any remaining amount:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Make sure the pickup date still works for you.</li>
    <li>Prepare transport and housing at home.</li>
    <li>You will always find the order on My Page when you log in with Vipps.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$chk_pick_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'total_birds_label', 'total_birds_label_en', 'order_lines_html', 'order_lines_html_en', 'pickup_date', 'pickup_date_en', 'days_left', 'delivery_label', 'delivery_label_en', 'total_amount_nok', 'deposit_amount_nok', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.choose_pickup_day',
  'transactional',
  'chickens',
  'Velg hentedag – {{order_number}}',
  'Choose your pickup day – {{order_number}}',
  $chk_choose_no$
<p>Hei {{customer_first_name}},</p>
<p>Henteuken for <strong>{{order_number}}</strong> nærmer seg, og vi trenger at du velger dag og tidspunkt.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_birds_label}}<br/><strong>Levering eller henting:</strong> {{delivery_label}}<br/><strong>Henteuke:</strong> {{pickup_week}}<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Restbeløp:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Åpne Min side med Vipps-login.</li>
    <li>Velg hentedag og tidspunkt.</li>
    <li>Da vet vi når vi skal ha kyllingene klare til deg.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Velg hentedag og tidspunkt</a></p>
{{tip_html}}
$chk_choose_no$,
  $chk_choose_en$
<p>Hi {{customer_first_name}},</p>
<p>The pickup week for <strong>{{order_number}}</strong> is getting closer, and we need you to choose a day and time.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total birds:</strong> {{total_birds_label_en}}<br/><strong>Delivery or pickup:</strong> {{delivery_label_en}}<br/><strong>Pickup week:</strong> {{pickup_week}}<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Open My Page with Vipps login.</li>
    <li>Choose your pickup day and time.</li>
    <li>That lets us have the chickens ready when you arrive.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Choose pickup day and time</a></p>
{{tip_html}}
$chk_choose_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'total_birds_label', 'total_birds_label_en', 'order_lines_html', 'order_lines_html_en', 'pickup_week', 'pickup_date', 'pickup_date_en', 'delivery_label', 'delivery_label_en', 'total_amount_nok', 'deposit_amount_nok', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.pickup.reminder.no_day',
  'transactional',
  'chickens',
  'Velg hentedag – påminnelse for {{order_number}}',
  'Choose your pickup day – reminder for {{order_number}}',
  $chk_noday_no$
<p>Hei {{customer_first_name}},</p>
<p>Henteuken for <strong>{{order_number}}</strong> nærmer seg, men vi mangler fortsatt valg av hentedag og tidspunkt.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fde68a;border-radius:14px;background:#fffbeb;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Åpne Min side med Vipps-login.</li>
    <li>Velg dag og tidspunkt så snart som mulig.</li>
    <li>Da kan vi planlegge henting på en trygg og ryddig måte.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Velg hentedag og tidspunkt</a></p>
{{tip_html}}
$chk_noday_no$,
  $chk_noday_en$
<p>Hi {{customer_first_name}},</p>
<p>The pickup week for <strong>{{order_number}}</strong> is getting closer, but we still need your pickup day and time.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fde68a;border-radius:14px;background:#fffbeb;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Open My Page with Vipps login.</li>
    <li>Choose your day and time as soon as possible.</li>
    <li>That lets us plan pickup in a safe and tidy way.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Choose pickup day and time</a></p>
{{tip_html}}
$chk_noday_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.pickup.reminder.final_warning',
  'transactional',
  'chickens',
  'Siste påminnelse om hentedag – {{order_number}}',
  'Final pickup reminder – {{order_number}}',
  $chk_final_no$
<p>Hei {{customer_first_name}},</p>
<p>Vi mangler fortsatt valg av hentedag for <strong>{{order_number}}</strong>.</p>
<p>For å kunne holde bestillingen aktiv må du velge dag og tidspunkt snarest.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fee2e2;border-radius:14px;background:#fff5f5;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Åpne Min side med Vipps-login.</li>
    <li>Velg hentedag og tidspunkt med en gang.</li>
    <li>Hvis du trenger hjelp, svar på e-posten eller kontakt oss direkte.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Velg hentedag og tidspunkt nå</a></p>
$chk_final_no$,
  $chk_final_en$
<p>Hi {{customer_first_name}},</p>
<p>We still need a pickup day for <strong>{{order_number}}</strong>.</p>
<p>To keep the order active, please choose your day and time as soon as possible.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fee2e2;border-radius:14px;background:#fff5f5;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Open My Page with Vipps login.</li>
    <li>Choose your pickup day and time right away.</li>
    <li>If you need help, reply to the email or contact us directly.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Choose pickup day and time now</a></p>
$chk_final_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'order_url'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.remainder.collected',
  'transactional',
  'chickens',
  'Kvittering for restbetaling – {{order_number}}',
  'Receipt for remainder payment – {{order_number}}',
  $chk_coll_no$
<p>Hei {{customer_first_name}},</p>
<p>Vi har registrert restbetalingen for <strong>{{order_number}}</strong>.</p>
<p><strong>Beløp:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Bestillingen er oppdatert på Min side.</li>
    <li>Ta gjerne kontakt hvis du trenger hjelp videre.</li>
    <li>Takk for handelen.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$chk_coll_no$,
  $chk_coll_en$
<p>Hi {{customer_first_name}},</p>
<p>We have registered the remainder payment for <strong>{{order_number}}</strong>.</p>
<p><strong>Amount:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order has been updated on My Page.</li>
    <li>Please reach out if you need any further help.</li>
    <li>Thank you for your order.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$chk_coll_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.order.followup',
  'transactional',
  'chickens',
  'Takk for kyllingbestillingen – {{order_number}}',
  'Thanks for your chicken order – {{order_number}}',
  $chk_follow_no$
<p>Hei {{customer_first_name}},</p>
<p>Takk for at du handlet kyllinger hos oss.</p>
<p>Vi håper de har fått en god start hjemme hos deg. Hvis du lurer på noe om fôr, oppstalling eller videre oppfølging, er det bare å sende oss en melding.</p>
<p><a href="{{message_url}}">Send melding via Min side</a></p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Du kan fortsatt åpne bestillingen på Min side når du logger inn med Vipps.</li>
    <li>Ta kontakt hvis du vil sparre om kyllingene eller trenger råd.</li>
    <li>Vi holder deg gjerne oppdatert på det som skjer videre på gården.</li>
  </ol>
</div>
{{tip_html}}
<div style="margin:24px 0;padding:16px;border:1px solid #f3d4aa;border-radius:14px;background:#fff8ef;">
  <strong>Har du lyst til å prøve ullgris til jul?</strong>
  <p>Som kyllingkunde får du <strong>10% rabatt på forskuddet</strong> på en Mangalitsa-kasse fra Tinglum Gård.</p>
  <p>Del vennerabatten din videre: vennene dine får <strong>20% rabatt på forskuddet</strong>, og du kan bygge opp kreditt tilsvarende opptil <strong>50% av forskuddet</strong> på din egen kasse.</p>
  <p><a href="{{pork_url}}">Se ullgris-kasser</a></p>
</div>
$chk_follow_no$,
  $chk_follow_en$
<p>Hi {{customer_first_name}},</p>
<p>Thank you for buying chickens from us.</p>
<p>We hope they have settled in well at your place. If you have any questions about feed, housing, or the next steps, just send us a message.</p>
<p><a href="{{message_url}}">Send a message through My Page</a></p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>You can still open the order on My Page whenever you log in with Vipps.</li>
    <li>Please reach out if you want advice about the chickens or need support.</li>
    <li>We are happy to keep you updated on what is happening on the farm.</li>
  </ol>
</div>
{{tip_html}}
<div style="margin:24px 0;padding:16px;border:1px solid #f3d4aa;border-radius:14px;background:#fff8ef;">
  <strong>Would you like to try Mangalitsa pork for Christmas?</strong>
  <p>As a chicken customer, you get <strong>10% off the deposit</strong> on a Mangalitsa box from Tinglum Gård.</p>
  <p>Share your referral code with friends: they get <strong>20% off the deposit</strong>, and you can build up credit worth up to <strong>50% of the deposit</strong> on your own box.</p>
  <p><a href="{{pork_url}}">See Mangalitsa boxes</a></p>
</div>
$chk_follow_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'message_url', 'pork_url', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

DROP FUNCTION refresh_email_template(text, email_classification, text, text, text, text, text, text[], text);

COMMIT;


-- ============================================================
-- Migration 9/18: 20260331100000_add_app_notifications.sql
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


-- ============================================================
-- Migration 10/18: 20260406130000_add_admin_initiated_customer_messages.sql
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


-- ============================================================
-- Migration 11/18: 20260406140000_drop_customer_messages_phone_fk.sql
-- ============================================================
-- Drop the foreign key constraint on customer_phone that requires the phone
-- to exist in vipps_users. Admin-initiated messages may target customers
-- who haven't completed Vipps login, or use different phone formats.
ALTER TABLE customer_messages
  DROP CONSTRAINT IF EXISTS msg_customer_fk;


-- ============================================================
-- Migration 12/18: 20260406201500_add_message_email_debug_events.sql
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


-- ============================================================
-- Migration 13/18: 20260409100000_update_reply_to_inbound_domain.sql
-- ============================================================
-- Update default reply-to address to use the inbound subdomain.
-- Root domain MX records are managed by Domeneshop for regular email;
-- inbound.tinglum.com MX records point to Mailgun EU for reply processing.
UPDATE app_config
SET value = to_jsonb('messages@inbound.tinglum.com'::text)
WHERE key = 'email_default_reply_to';


-- ============================================================
-- Migration 14/18: 20260409110000_remove_reference_numbers_from_customer_emails.sql
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


-- ============================================================
-- Migration 15/18: 20260409153000_allow_addition_deposit_for_egg_payments.sql
-- ============================================================
ALTER TABLE egg_payments
DROP CONSTRAINT IF EXISTS egg_payments_payment_type_check;

ALTER TABLE egg_payments
ADD CONSTRAINT egg_payments_payment_type_check
CHECK (payment_type IN ('deposit', 'addition_deposit', 'remainder'));


-- ============================================================
-- Migration 16/18: 20260409183000_remove_support_case_wording_from_emails.sql
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


-- ============================================================
-- Migration 17/18: 20260409201500_disable_support_email_replies.sql
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


-- ============================================================
-- Migration 18/18: 20260412100000_fix_chicken_order_payment_statuses.sql
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


