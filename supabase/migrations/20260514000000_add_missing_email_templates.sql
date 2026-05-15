BEGIN;

-- pig.pickup.choose_day
-- Sent when admin manually notifies a pig order customer to select a pickup day.
INSERT INTO email_templates (
  template_key, classification, product_scope,
  subject_no, subject_en, body_no, body_en, variables, active
) VALUES (
  'pig.pickup.choose_day', 'transactional', 'pig',
  'Velg hentedag – {{order_number}}',
  'Choose your pickup day – {{order_number}}',
  '<p>Hei {{customer_first_name}},</p><p>Grisbestilling <strong>{{order_number}}</strong> er klar til henting.</p><p>Logg inn p&aring; Min side for &aring; velge hentedag og tidspunkt, s&aring; er vi klare for deg.</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Velg hentedag</a></p>',
  '<p>Hi {{customer_first_name}},</p><p>Your pork order <strong>{{order_number}}</strong> is ready for pickup.</p><p>Log in to My Page to choose your pickup day and time.</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Choose pickup day</a></p>',
  '["customer_name","customer_first_name","order_number","order_url"]'::jsonb,
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  subject_no = EXCLUDED.subject_no,
  subject_en = EXCLUDED.subject_en,
  body_no    = EXCLUDED.body_no,
  body_en    = EXCLUDED.body_en,
  variables  = EXCLUDED.variables,
  active     = EXCLUDED.active;

-- deferred.deposit.request
-- Sent when Vipps was down at order time; asks customer to pay their deposit now.
INSERT INTO email_templates (
  template_key, classification, product_scope,
  subject_no, subject_en, body_no, body_en, variables, active
) VALUES (
  'deferred.deposit.request', 'transactional', 'shared',
  'Betal depositum for din bestilling {{order_number}} – Tinglum Gård',
  'Pay deposit for your order {{order_number}} – Tinglum Gård',
  '<p>Hei {{customer_first_name}},</p><p>Da du la inn bestilling <strong>{{order_number}}</strong> hos Tinglum G&aring;rd, var betalingstjenesten midlertidig nede. Bestillingen din er registrert og reservert.</p><p>N&aring; er betalingen oppe igjen, og du kan betale depositum ved &aring; klikke knappen under.</p><p><a href="{{payment_url}}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:500;">Betal depositum n&aring;</a></p><p style="color:#666;font-size:14px;">Hvis du har sp&oslash;rsm&aring;l, svar p&aring; denne e-posten.</p>',
  '<p>Hi {{customer_first_name}},</p><p>When you placed order <strong>{{order_number}}</strong> with Tinglum G&aring;rd, the payment service was temporarily unavailable. Your order has been registered and reserved.</p><p>Payment is now available again. Click the button below to pay your deposit.</p><p><a href="{{payment_url}}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:500;">Pay deposit now</a></p><p style="color:#666;font-size:14px;">If you have any questions, reply to this email.</p>',
  '["customer_name","customer_first_name","order_number","payment_url"]'::jsonb,
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  subject_no = EXCLUDED.subject_no,
  subject_en = EXCLUDED.subject_en,
  body_no    = EXCLUDED.body_no,
  body_en    = EXCLUDED.body_en,
  variables  = EXCLUDED.variables,
  active     = EXCLUDED.active;

-- egg.wishlist.remainder.customer
-- Sent when admin fulfills a customer's egg wishlist; includes items fulfilled + remainder balance.
INSERT INTO email_templates (
  template_key, classification, product_scope,
  subject_no, subject_en, body_no, body_en, variables, active
) VALUES (
  'egg.wishlist.remainder.customer', 'transactional', 'eggs',
  'Ønskelisten din er oppfylt – restbeløp kr {{remainder_amount_nok}} ({{order_number}})',
  'Your wishlist has been fulfilled – remaining balance kr {{remainder_amount_nok}} ({{order_number}})',
  '<p>Hei {{customer_first_name}},</p><p>Vi har n&aring; oppfylt &oslash;nskelisten din for bestilling <strong>{{order_number}}</strong>. Eggene er lagt til i bestillingen din med <strong>30% rabatt</strong>.</p>{{items_html}}<p><strong>Restbel&oslash;p:</strong> kr {{remainder_amount_nok}}</p><p>Betal restbel&oslash;pet p&aring; Min side f&oslash;r leveransen.</p><p><a href="{{order_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Betal restbel&oslash;p</a></p>',
  '<p>Hi {{customer_first_name}},</p><p>We have now fulfilled your wishlist for order <strong>{{order_number}}</strong>. The eggs have been added to your order at <strong>30% discount</strong>.</p>{{items_html}}<p><strong>Remaining balance:</strong> kr {{remainder_amount_nok}}</p><p>Pay the remaining balance on My Page before your delivery.</p><p><a href="{{order_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Pay remaining balance</a></p>',
  '["customer_name","customer_first_name","order_number","remainder_amount_nok","items_html","order_url"]'::jsonb,
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  subject_no = EXCLUDED.subject_no,
  subject_en = EXCLUDED.subject_en,
  body_no    = EXCLUDED.body_no,
  body_en    = EXCLUDED.body_en,
  variables  = EXCLUDED.variables,
  active     = EXCLUDED.active;

COMMIT;
