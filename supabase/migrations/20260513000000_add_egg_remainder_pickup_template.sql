BEGIN;

-- New template for pickup orders: eggs already collected, no delivery framing.
-- Uses the same HTML shell as egg.remainder.reminder ({{reminder_intro_html}} etc.)
-- with pickup-specific variables injected by normalizeEggPickupReminderVariables in render.ts.

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
) VALUES (
  'egg.remainder.reminder.pickup',
  'transactional',
  'eggs',
  'Påminnelse om restbetaling – {{order_number}}',
  'Remainder payment reminder – {{order_number}}',
  $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
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
      </table>
    </td></tr>
  </table>
  {{reminder_support_html}}
  {{reminder_consequence_html}}
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{payment_url}}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Betal rest n&aring;</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{payment_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Betal rest n&aring;</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$,
  $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
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
      </table>
    </td></tr>
  </table>
  {{reminder_support_html}}
  {{reminder_consequence_html}}
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{payment_url}}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Pay remainder now</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{payment_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Pay remainder now</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$,
  '[
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
  ]'::jsonb,
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  subject_no = EXCLUDED.subject_no,
  subject_en = EXCLUDED.subject_en,
  body_no = EXCLUDED.body_no,
  body_en = EXCLUDED.body_en,
  variables = EXCLUDED.variables,
  active = EXCLUDED.active;

COMMIT;
