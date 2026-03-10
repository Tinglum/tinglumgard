-- =============================================================================
-- Add explicit chicken order-line breakdown to confirmation templates
-- =============================================================================

BEGIN;

UPDATE email_templates
SET
  body_no = '<h2>Bestilling bekreftet</h2><p>Hei {{customer_name}},</p><p>Forskuddet er mottatt for <strong>{{order_number}}</strong>.</p><p><strong>Raser i ordren:</strong> {{breed_name}}</p><p><strong>Ordrelinjer:</strong></p>{{order_lines_html}}<p><strong>Totalt antall:</strong> {{total_birds_label}}</p><p><strong>Hentedato:</strong> {{pickup_date}}<br/><strong>Levering:</strong> {{delivery_label}}</p><p><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Forskudd betalt:</strong> {{deposit_amount_nok}}<br/><strong>Rest ved henting:</strong> {{remainder_amount_nok}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Gå til Min side</a></p>',
  body_en = '<h2>Order confirmed</h2><p>Hi {{customer_name}},</p><p>The deposit has been received for <strong>{{order_number}}</strong>.</p><p><strong>Breeds in this order:</strong> {{breed_name}}</p><p><strong>Order lines:</strong></p>{{order_lines_html}}<p><strong>Total quantity:</strong> {{total_birds_label_en}}</p><p><strong>Pickup date:</strong> {{pickup_date}}<br/><strong>Delivery:</strong> {{delivery_label}}</p><p><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Deposit paid:</strong> {{deposit_amount_nok}}<br/><strong>Remainder at pickup:</strong> {{remainder_amount_nok}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Go to My Page</a></p>',
  variables = '["customer_name","order_number","breed_name","order_lines_html","total_birds_label","total_birds_label_en","quantity_hens","quantity_roosters","pickup_date","delivery_label","total_amount_nok","deposit_amount_nok","remainder_amount_nok","order_url"]'::jsonb,
  updated_at = NOW()
WHERE template_key = 'chicken.order.deposit.confirmed.customer';

UPDATE email_templates
SET
  body_no = '<h2>Ny kyllingordre</h2><p><strong>Ordre:</strong> {{order_number}}</p><p><strong>Kunde:</strong> {{customer_name}}<br/><strong>E-post:</strong> {{customer_email}}<br/><strong>Telefon:</strong> {{customer_phone}}</p><p><strong>Raser i ordren:</strong> {{breed_name}}</p><p><strong>Ordrelinjer:</strong></p>{{order_lines_html}}<p><strong>Totalt antall:</strong> {{total_birds_label}}<br/><strong>Uke:</strong> {{pickup_week}}<br/><strong>Hentedato:</strong> {{pickup_date}}</p><p><strong>Forskudd:</strong> {{deposit_amount_nok}}<br/><strong>Rest:</strong> {{remainder_amount_nok}}<br/><strong>Total:</strong> {{total_amount_nok}}</p><p><a href="{{order_url}}">Åpne ordren i admin</a></p>',
  body_en = '<h2>New chicken order</h2><p><strong>Order:</strong> {{order_number}}</p><p><strong>Customer:</strong> {{customer_name}}<br/><strong>Email:</strong> {{customer_email}}<br/><strong>Phone:</strong> {{customer_phone}}</p><p><strong>Breeds in this order:</strong> {{breed_name}}</p><p><strong>Order lines:</strong></p>{{order_lines_html}}<p><strong>Total quantity:</strong> {{total_birds_label_en}}<br/><strong>Week:</strong> {{pickup_week}}<br/><strong>Pickup date:</strong> {{pickup_date}}</p><p><strong>Deposit:</strong> {{deposit_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}<br/><strong>Total:</strong> {{total_amount_nok}}</p><p><a href="{{order_url}}">Open order in admin</a></p>',
  variables = '["order_number","customer_name","customer_email","customer_phone","breed_name","order_lines_html","total_birds_label","total_birds_label_en","quantity_hens","quantity_roosters","pickup_week","pickup_date","deposit_amount_nok","remainder_amount_nok","total_amount_nok","order_url"]'::jsonb,
  updated_at = NOW()
WHERE template_key = 'admin.order.deposit.confirmed.chicken';

COMMIT;
