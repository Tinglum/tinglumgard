-- BATCH 1: Migrations 1-7 (schema + small email updates)

-- Migration 1: 20260319091500_soften_egg_remainder_early_reminders.sql
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


-- Migration 2: 20260319113000_rework_egg_shipment_followup.sql
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


-- Migration 3: 20260319150000_add_chicken_pickup_date.sql
-- ============================================================
-- Allow customers to choose a specific pickup day within their pickup week
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS pickup_date DATE;


-- Migration 4: 20260322113000_add_chicken_remainder_payment_enabled.sql
-- ============================================================
ALTER TABLE chicken_orders
  ADD COLUMN IF NOT EXISTS remainder_payment_enabled BOOLEAN NOT NULL DEFAULT FALSE;


-- Migration 5: 20260322163000_add_chicken_remainder_enabled_email_template.sql
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


-- Migration 6: 20260322190000_refresh_chicken_confirmation_template.sql
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


-- Migration 7: 20260322200000_add_chicken_pickup_time.sql
-- ============================================================
-- Allow customers to choose a pickup time slot
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS pickup_time TEXT;


