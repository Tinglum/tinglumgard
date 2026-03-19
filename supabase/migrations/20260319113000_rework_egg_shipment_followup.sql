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
