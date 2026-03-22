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
