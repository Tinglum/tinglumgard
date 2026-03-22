BEGIN;

UPDATE email_templates
SET
  subject_no = 'Takk for at du hentet kyllingene - {{order_number}}',
  subject_en = 'Thanks for picking up your chickens - {{order_number}}',
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <span style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:#ECFDF5;color:#2D6A4F;font-size:13px;font-weight:600;">Takk for handelen</span>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hei {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.7;">Takk for at du hentet kyllingene dine hos oss. Vi håper de har fått en god start hjemme hos deg.</p>

    <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#1C1210;">Hvis det dukker opp spørsmål om tilvenning, fôr, oppstalling eller noe annet underveis, er det bare å sende oss en melding. Vi hjelper gjerne.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <a href="{{message_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;">Send melding på Min side</a>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0;border:1px solid #E8DFD5;border-radius:12px;overflow:hidden;background-color:#FFF9E6;">
      <tr><td style="padding:20px 22px;">
        <p style="margin:0;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#8B6914;">Fra samme gård</p>
        <p style="margin:10px 0 0;font-size:18px;line-height:1.5;font-weight:700;color:#1C1210;">Har du lyst til å prøve ullgris til jul?</p>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#1C1210;">Mangalitsa-kassene våre er for deg som vil ha ribbe til jul, godt med smak og den ekstra gode fettkvaliteten ullgrisen er kjent for.</p>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#1C1210;">Som kyllingkunde får du <strong>10% rabatt på forskuddet</strong> når du bestiller en kasse.</p>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#1C1210;"><strong>Vennerrabatten</strong> gjør det enda bedre: Del koden din videre, så får vennene dine <strong>20% rabatt på forskuddet</strong>, og du kan selv tjene kreditt tilsvarende opptil <strong>50% av forskuddet</strong> på kassen din.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
          <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
            <a href="{{pork_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;">Se ullgris-kasser</a>
          </td></tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:28px 0 0;font-size:15px;line-height:1.7;color:#1C1210;">Varme hilsener,<br/><strong>Tinglum Gård</strong></p>

  </td></tr>
</table>$$,
  body_en = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <span style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:#ECFDF5;color:#2D6A4F;font-size:13px;font-weight:600;">Thank you</span>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hi {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.7;">Thank you for picking up your chickens from us. We hope they have settled in well at their new home.</p>

    <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#1C1210;">If any questions come up about settling in, feed, housing, or anything else, just send us a message. We are happy to help.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <a href="{{message_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;">Send a message on My Page</a>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0;border:1px solid #E8DFD5;border-radius:12px;overflow:hidden;background-color:#FFF9E6;">
      <tr><td style="padding:20px 22px;">
        <p style="margin:0;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#8B6914;">From the same farm</p>
        <p style="margin:10px 0 0;font-size:18px;line-height:1.5;font-weight:700;color:#1C1210;">Would you like to try Mangalitsa pork for Christmas?</p>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#1C1210;">Our Mangalitsa boxes are for anyone who wants rich flavor, generous marbling, and a proper seasonal pork box for the holidays.</p>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#1C1210;">As a chicken customer, you get <strong>10% off the deposit</strong> when you reserve a box.</p>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#1C1210;"><strong>Referral bonus:</strong> Share your code and your friends get <strong>20% off the deposit</strong>. You can earn credit worth up to <strong>50% of your own deposit</strong> on your box.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
          <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
            <a href="{{pork_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;">See Mangalitsa boxes</a>
          </td></tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:28px 0 0;font-size:15px;line-height:1.7;color:#1C1210;">Warm regards,<br/><strong>Tinglum Gård</strong></p>

  </td></tr>
</table>$$,
  variables = '["customer_name","customer_first_name","order_number","message_url","pork_url","order_url"]'::jsonb,
  updated_at = NOW()
WHERE template_key = 'chicken.order.followup';

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
  'Switch chicken follow-up to delayed post-pickup thank-you email',
  'codex'
FROM email_templates et
WHERE et.template_key = 'chicken.order.followup';

UPDATE email_templates
SET current_version = current_version + 1
WHERE template_key = 'chicken.order.followup';

UPDATE email_flows
SET
  event_type = 'chicken.order.picked_up',
  send_offset_minutes = 4320,
  updated_at = NOW()
WHERE flow_key = 'chicken.order.followup';

COMMIT;
