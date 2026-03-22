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
