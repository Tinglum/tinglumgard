-- Fix missing remainder email templates and enable active dispatch mode

-- Re-insert the 3 remainder confirmation templates (they were seeded in
-- 20260309123000 but may have been deleted or not applied correctly)

INSERT INTO email_templates (template_key, classification, product_scope, subject_no, subject_en, body_no, body_en, variables, active)
VALUES
  (
    'pig.order.remainder.paid.customer',
    'transactional',
    'pig',
    'Betaling fullført - {{order_number}}',
    'Payment completed - {{order_number}}',
    E'<h2>Betaling fullført</h2><p>Hei {{customer_name}},</p><p>Vi har mottatt restbetalingen for <strong>{{order_number}}</strong>.</p><p><strong>Boks:</strong> {{box_label}}<br/><strong>Levering:</strong> {{delivery_label}}<br/><strong>Total betalt:</strong> {{total_amount_nok}}</p><p>Vi sender oppdatering når ordren er klar.</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Se bestillingen</a></p>',
    E'<h2>Payment completed</h2><p>Hi {{customer_name}},</p><p>We have received the remainder payment for <strong>{{order_number}}</strong>.</p><p><strong>Box:</strong> {{box_label}}<br/><strong>Delivery:</strong> {{delivery_label}}<br/><strong>Total paid:</strong> {{total_amount_nok}}</p><p>We will send an update when your order is ready.</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">View order</a></p>',
    '["customer_name","order_number","box_label","delivery_label","total_amount_nok","order_url"]'::jsonb,
    true
  ),
  (
    'egg.order.remainder.paid.customer',
    'transactional',
    'eggs',
    'Betaling fullført - {{order_number}}',
    'Payment completed - {{order_number}}',
    E'<h2>Betaling fullført</h2><p>Hei {{customer_name}},</p><p>Vi har mottatt restbetalingen for <strong>{{order_number}}</strong>.</p><p><strong>Total betalt:</strong> {{total_amount_nok}}<br/><strong>Restbetaling:</strong> {{remainder_amount_nok}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Se bestillingen</a></p>',
    E'<h2>Payment completed</h2><p>Hi {{customer_name}},</p><p>We have received the remainder payment for <strong>{{order_number}}</strong>.</p><p><strong>Total paid:</strong> {{total_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">View order</a></p>',
    '["customer_name","order_number","total_amount_nok","remainder_amount_nok","order_url"]'::jsonb,
    true
  ),
  (
    'chicken.order.remainder.paid.customer',
    'transactional',
    'chickens',
    'Betaling fullført - {{order_number}}',
    'Payment completed - {{order_number}}',
    E'<h2>Betaling fullført</h2><p>Hei {{customer_name}},</p><p>Vi har registrert betalingen for <strong>{{order_number}}</strong>.</p><p><strong>Total betalt:</strong> {{total_amount_nok}}<br/><strong>Hentedato:</strong> {{pickup_date}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Se bestillingen</a></p>',
    E'<h2>Payment completed</h2><p>Hi {{customer_name}},</p><p>We have registered the payment for <strong>{{order_number}}</strong>.</p><p><strong>Total paid:</strong> {{total_amount_nok}}<br/><strong>Pickup date:</strong> {{pickup_date}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">View order</a></p>',
    '["customer_name","order_number","total_amount_nok","pickup_date","order_url"]'::jsonb,
    true
  )
ON CONFLICT (template_key) DO UPDATE SET
  body_no = EXCLUDED.body_no,
  body_en = EXCLUDED.body_en,
  subject_no = EXCLUDED.subject_no,
  subject_en = EXCLUDED.subject_en,
  variables = EXCLUDED.variables,
  active = true;

-- Set dispatch mode to active (no more legacy direct-send)
INSERT INTO app_config (key, value)
VALUES ('email_dispatch_mode', '"active"')
ON CONFLICT (key) DO UPDATE SET value = '"active"';
