-- =============================================================================
-- Seed managed transactional/support templates for remaining hardcoded sends
-- =============================================================================

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
VALUES
  (
    'pig.order.deposit.confirmed.customer',
    'transactional',
    'pig',
    'Bestilling bekreftet - {{order_number}}',
    'Order confirmed - {{order_number}}',
    '<h2>Bestilling bekreftet</h2><p>Hei {{customer_name}},</p><p>Vi har mottatt forskuddet for <strong>{{order_number}}</strong>.</p><p><strong>Boks:</strong> {{box_label}}<br/><strong>Ribbe:</strong> {{ribbe_choice}}<br/><strong>Levering:</strong> {{delivery_label}}</p>{{extras_html}}{{discount_html}}<p><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Forskudd betalt:</strong> {{deposit_amount_nok}}<br/><strong>Restbetaling:</strong> {{remainder_amount_nok}}</p><p>Neste steg og oppdateringer finner du pa Min side.</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Ga til Min side</a></p>',
    '<h2>Order confirmed</h2><p>Hi {{customer_name}},</p><p>We have received the deposit for <strong>{{order_number}}</strong>.</p><p><strong>Box:</strong> {{box_label}}<br/><strong>Rib cut:</strong> {{ribbe_choice}}<br/><strong>Delivery:</strong> {{delivery_label}}</p>{{extras_html}}{{discount_html}}<p><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Deposit paid:</strong> {{deposit_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}</p><p>You can find next steps and updates on My Page.</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Go to My Page</a></p>',
    '["customer_name","order_number","box_label","ribbe_choice","delivery_label","extras_html","discount_html","total_amount_nok","deposit_amount_nok","remainder_amount_nok","order_url"]'::jsonb,
    true
  ),
  (
    'egg.order.deposit.confirmed.customer',
    'transactional',
    'eggs',
    'Bestilling bekreftet - {{order_number}}',
    'Order confirmed - {{order_number}}',
    '<h2>Bestilling bekreftet</h2><p>Hei {{customer_name}},</p><p>Vi har mottatt forskuddet for rugeegg-ordren <strong>{{order_number}}</strong>.</p><p><strong>Rase:</strong> {{breed_name}}<br/><strong>Uke:</strong> {{week_number}}<br/><strong>Grunnordre:</strong> {{base_quantity}} egg<br/><strong>Tillegg:</strong> {{additions_quantity}} egg<br/><strong>Totalt:</strong> {{total_quantity}} egg</p>{{additions_html}}<p><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Forskudd betalt:</strong> {{deposit_amount_nok}}<br/><strong>Restbetaling:</strong> {{remainder_amount_nok}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Aapne Min side</a></p>',
    '<h2>Order confirmed</h2><p>Hi {{customer_name}},</p><p>We have received the deposit for hatching egg order <strong>{{order_number}}</strong>.</p><p><strong>Breed:</strong> {{breed_name}}<br/><strong>Week:</strong> {{week_number}}<br/><strong>Base order:</strong> {{base_quantity}} eggs<br/><strong>Additions:</strong> {{additions_quantity}} eggs<br/><strong>Total:</strong> {{total_quantity}} eggs</p>{{additions_html}}<p><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Deposit paid:</strong> {{deposit_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Open My Page</a></p>',
    '["customer_name","order_number","breed_name","week_number","base_quantity","additions_quantity","total_quantity","additions_html","total_amount_nok","deposit_amount_nok","remainder_amount_nok","order_url"]'::jsonb,
    true
  ),
  (
    'chicken.order.deposit.confirmed.customer',
    'transactional',
    'chickens',
    'Bestilling bekreftet - {{order_number}}',
    'Order confirmed - {{order_number}}',
    '<h2>Bestilling bekreftet</h2><p>Hei {{customer_name}},</p><p>Forskuddet er mottatt for <strong>{{order_number}}</strong>.</p><p><strong>Rase:</strong> {{breed_name}}<br/><strong>Honer:</strong> {{quantity_hens}}<br/><strong>Haner:</strong> {{quantity_roosters}}<br/><strong>Hentedato:</strong> {{pickup_date}}<br/><strong>Levering:</strong> {{delivery_label}}</p><p><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Forskudd betalt:</strong> {{deposit_amount_nok}}<br/><strong>Rest ved henting:</strong> {{remainder_amount_nok}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Ga til Min side</a></p>',
    '<h2>Order confirmed</h2><p>Hi {{customer_name}},</p><p>The deposit has been received for <strong>{{order_number}}</strong>.</p><p><strong>Breed:</strong> {{breed_name}}<br/><strong>Hens:</strong> {{quantity_hens}}<br/><strong>Roosters:</strong> {{quantity_roosters}}<br/><strong>Pickup date:</strong> {{pickup_date}}<br/><strong>Delivery:</strong> {{delivery_label}}</p><p><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Deposit paid:</strong> {{deposit_amount_nok}}<br/><strong>Remainder at pickup:</strong> {{remainder_amount_nok}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Go to My Page</a></p>',
    '["customer_name","order_number","breed_name","quantity_hens","quantity_roosters","pickup_date","delivery_label","total_amount_nok","deposit_amount_nok","remainder_amount_nok","order_url"]'::jsonb,
    true
  ),
  (
    'pig.order.remainder.paid.customer',
    'transactional',
    'pig',
    'Betaling fullfort - {{order_number}}',
    'Payment completed - {{order_number}}',
    '<h2>Betaling fullfort</h2><p>Hei {{customer_name}},</p><p>Vi har mottatt restbetalingen for <strong>{{order_number}}</strong>.</p><p><strong>Boks:</strong> {{box_label}}<br/><strong>Levering:</strong> {{delivery_label}}<br/><strong>Total betalt:</strong> {{total_amount_nok}}</p><p>Vi sender oppdatering naer ordren er klar.</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Se bestillingen</a></p>',
    '<h2>Payment completed</h2><p>Hi {{customer_name}},</p><p>We have received the remainder payment for <strong>{{order_number}}</strong>.</p><p><strong>Box:</strong> {{box_label}}<br/><strong>Delivery:</strong> {{delivery_label}}<br/><strong>Total paid:</strong> {{total_amount_nok}}</p><p>We will send an update when your order is ready.</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">View order</a></p>',
    '["customer_name","order_number","box_label","delivery_label","total_amount_nok","order_url"]'::jsonb,
    true
  ),
  (
    'egg.order.remainder.paid.customer',
    'transactional',
    'eggs',
    'Betaling fullfort - {{order_number}}',
    'Payment completed - {{order_number}}',
    '<h2>Betaling fullfort</h2><p>Hei {{customer_name}},</p><p>Vi har mottatt restbetalingen for <strong>{{order_number}}</strong>.</p><p><strong>Grunnordre:</strong> {{base_quantity}} egg<br/><strong>Tillegg:</strong> {{additions_quantity}} egg<br/><strong>Totalt:</strong> {{total_quantity}} egg</p>{{additions_html}}<p><strong>Total betalt:</strong> {{total_amount_nok}}<br/><strong>Restbetaling:</strong> {{remainder_amount_nok}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Se bestillingen</a></p>',
    '<h2>Payment completed</h2><p>Hi {{customer_name}},</p><p>We have received the remainder payment for <strong>{{order_number}}</strong>.</p><p><strong>Base order:</strong> {{base_quantity}} eggs<br/><strong>Additions:</strong> {{additions_quantity}} eggs<br/><strong>Total:</strong> {{total_quantity}} eggs</p>{{additions_html}}<p><strong>Total paid:</strong> {{total_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">View order</a></p>',
    '["customer_name","order_number","base_quantity","additions_quantity","total_quantity","additions_html","total_amount_nok","remainder_amount_nok","order_url"]'::jsonb,
    true
  ),
  (
    'chicken.order.remainder.paid.customer',
    'transactional',
    'chickens',
    'Betaling fullfort - {{order_number}}',
    'Payment completed - {{order_number}}',
    '<h2>Betaling fullfort</h2><p>Hei {{customer_name}},</p><p>Vi har registrert betalingen for <strong>{{order_number}}</strong>.</p><p><strong>Total betalt:</strong> {{total_amount_nok}}<br/><strong>Hentedato:</strong> {{pickup_date}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Se bestillingen</a></p>',
    '<h2>Payment completed</h2><p>Hi {{customer_name}},</p><p>We have registered the payment for <strong>{{order_number}}</strong>.</p><p><strong>Total paid:</strong> {{total_amount_nok}}<br/><strong>Pickup date:</strong> {{pickup_date}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">View order</a></p>',
    '["customer_name","order_number","total_amount_nok","pickup_date","order_url"]'::jsonb,
    true
  ),
  (
    'admin.order.deposit.confirmed.pig',
    'system',
    'pig',
    'Ny ordre mottatt - {{order_number}}',
    'New order received - {{order_number}}',
    '<h2>Ny grisordre</h2><p><strong>Ordre:</strong> {{order_number}}</p><p><strong>Kunde:</strong> {{customer_name}}<br/><strong>E-post:</strong> {{customer_email}}<br/><strong>Telefon:</strong> {{customer_phone}}</p><p><strong>Boks:</strong> {{box_label}}<br/><strong>Ribbe:</strong> {{ribbe_choice}}<br/><strong>Levering:</strong> {{delivery_label}}</p>{{extras_html}}<p><strong>Rabatt:</strong> {{discount_amount_nok}}<br/><strong>Forskudd:</strong> {{deposit_amount_nok}}<br/><strong>Rest:</strong> {{remainder_amount_nok}}<br/><strong>Total:</strong> {{total_amount_nok}}</p><p><a href="{{order_url}}">Aapne ordren i admin</a></p>',
    '<h2>New pig order</h2><p><strong>Order:</strong> {{order_number}}</p><p><strong>Customer:</strong> {{customer_name}}<br/><strong>Email:</strong> {{customer_email}}<br/><strong>Phone:</strong> {{customer_phone}}</p><p><strong>Box:</strong> {{box_label}}<br/><strong>Rib cut:</strong> {{ribbe_choice}}<br/><strong>Delivery:</strong> {{delivery_label}}</p>{{extras_html}}<p><strong>Discount:</strong> {{discount_amount_nok}}<br/><strong>Deposit:</strong> {{deposit_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}<br/><strong>Total:</strong> {{total_amount_nok}}</p><p><a href="{{order_url}}">Open order in admin</a></p>',
    '["order_number","customer_name","customer_email","customer_phone","box_label","ribbe_choice","delivery_label","extras_html","discount_amount_nok","deposit_amount_nok","remainder_amount_nok","total_amount_nok","order_url"]'::jsonb,
    true
  ),
  (
    'admin.order.deposit.confirmed.egg',
    'system',
    'eggs',
    'Ny rugeegg-ordre mottatt - {{order_number}}',
    'New hatching egg order - {{order_number}}',
    '<h2>Ny rugeegg-ordre</h2><p><strong>Ordre:</strong> {{order_number}}</p><p><strong>Kunde:</strong> {{customer_name}}<br/><strong>E-post:</strong> {{customer_email}}<br/><strong>Telefon:</strong> {{customer_phone}}</p><p><strong>Rase:</strong> {{breed_name}}<br/><strong>Uke:</strong> {{week_number}}<br/><strong>Levering:</strong> {{delivery_date}}</p><p><strong>Grunnordre:</strong> {{base_quantity}} egg<br/><strong>Tillegg:</strong> {{additions_quantity}} egg<br/><strong>Totalt:</strong> {{total_quantity}} egg</p>{{additions_html}}<p><strong>Pris per egg:</strong> {{price_per_egg_nok}}<br/><strong>Leveringsmate:</strong> {{delivery_method_label}}</p><p><strong>Forskudd:</strong> {{deposit_amount_nok}}<br/><strong>Rest:</strong> {{remainder_amount_nok}}<br/><strong>Total:</strong> {{total_amount_nok}}</p><p><a href="{{order_url}}">Aapne ordren i admin</a></p>',
    '<h2>New hatching egg order</h2><p><strong>Order:</strong> {{order_number}}</p><p><strong>Customer:</strong> {{customer_name}}<br/><strong>Email:</strong> {{customer_email}}<br/><strong>Phone:</strong> {{customer_phone}}</p><p><strong>Breed:</strong> {{breed_name}}<br/><strong>Week:</strong> {{week_number}}<br/><strong>Delivery:</strong> {{delivery_date}}</p><p><strong>Base order:</strong> {{base_quantity}} eggs<br/><strong>Additions:</strong> {{additions_quantity}} eggs<br/><strong>Total:</strong> {{total_quantity}} eggs</p>{{additions_html}}<p><strong>Price per egg:</strong> {{price_per_egg_nok}}<br/><strong>Delivery method:</strong> {{delivery_method_label}}</p><p><strong>Deposit:</strong> {{deposit_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}<br/><strong>Total:</strong> {{total_amount_nok}}</p><p><a href="{{order_url}}">Open order in admin</a></p>',
    '["order_number","customer_name","customer_email","customer_phone","breed_name","week_number","delivery_date","base_quantity","additions_quantity","total_quantity","additions_html","price_per_egg_nok","delivery_method_label","deposit_amount_nok","remainder_amount_nok","total_amount_nok","order_url"]'::jsonb,
    true
  ),
  (
    'admin.order.deposit.confirmed.chicken',
    'system',
    'chickens',
    'Ny kyllingordre mottatt - {{order_number}}',
    'New chicken order - {{order_number}}',
    '<h2>Ny kyllingordre</h2><p><strong>Ordre:</strong> {{order_number}}</p><p><strong>Kunde:</strong> {{customer_name}}<br/><strong>E-post:</strong> {{customer_email}}<br/><strong>Telefon:</strong> {{customer_phone}}</p><p><strong>Rase:</strong> {{breed_name}}<br/><strong>Honer:</strong> {{quantity_hens}}<br/><strong>Haner:</strong> {{quantity_roosters}}<br/><strong>Uke:</strong> {{pickup_week}}<br/><strong>Hentedato:</strong> {{pickup_date}}</p><p><strong>Forskudd:</strong> {{deposit_amount_nok}}<br/><strong>Rest:</strong> {{remainder_amount_nok}}<br/><strong>Total:</strong> {{total_amount_nok}}</p><p><a href="{{order_url}}">Aapne ordren i admin</a></p>',
    '<h2>New chicken order</h2><p><strong>Order:</strong> {{order_number}}</p><p><strong>Customer:</strong> {{customer_name}}<br/><strong>Email:</strong> {{customer_email}}<br/><strong>Phone:</strong> {{customer_phone}}</p><p><strong>Breed:</strong> {{breed_name}}<br/><strong>Hens:</strong> {{quantity_hens}}<br/><strong>Roosters:</strong> {{quantity_roosters}}<br/><strong>Week:</strong> {{pickup_week}}<br/><strong>Pickup date:</strong> {{pickup_date}}</p><p><strong>Deposit:</strong> {{deposit_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}<br/><strong>Total:</strong> {{total_amount_nok}}</p><p><a href="{{order_url}}">Open order in admin</a></p>',
    '["order_number","customer_name","customer_email","customer_phone","breed_name","quantity_hens","quantity_roosters","pickup_week","pickup_date","deposit_amount_nok","remainder_amount_nok","total_amount_nok","order_url"]'::jsonb,
    true
  ),
  (
    'pig.order.ready_for_pickup',
    'transactional',
    'pig',
    'Din bestilling er klar for henting - {{order_number}}',
    'Your order is ready for pickup - {{order_number}}',
    '<h2>Bestillingen er klar</h2><p>Hei {{customer_name}},</p><p>Ordre <strong>{{order_number}}</strong> er na klar for henting.</p><p><strong>Levering:</strong> {{delivery_label}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Se detaljer pa Min side</a></p>',
    '<h2>Your order is ready</h2><p>Hi {{customer_name}},</p><p>Order <strong>{{order_number}}</strong> is now ready for pickup.</p><p><strong>Delivery:</strong> {{delivery_label}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">View details on My Page</a></p>',
    '["customer_name","order_number","delivery_label","order_url"]'::jsonb,
    true
  ),
  (
    'pig.order.locked.finalized',
    'transactional',
    'pig',
    'Ordre last - ferdigstilt - {{order_number}}',
    'Order locked - finalized - {{order_number}}',
    '<h2>Ordre last</h2><p>Hei {{customer_name}},</p><p>Ordre <strong>{{order_number}}</strong> er na last og ferdigstilt.</p><p>Ingen flere endringer kan gjores.</p><p><a href="{{order_url}}">Se ordren pa Min side</a></p>',
    '<h2>Order locked</h2><p>Hi {{customer_name}},</p><p>Order <strong>{{order_number}}</strong> is now locked and finalized.</p><p>No further changes can be made.</p><p><a href="{{order_url}}">View order on My Page</a></p>',
    '["customer_name","order_number","order_url"]'::jsonb,
    true
  ),
  (
    'pig.order.cancelled',
    'transactional',
    'pig',
    'Ordre kansellert - {{order_number}}',
    'Order cancelled - {{order_number}}',
    '<h2>Ordre kansellert</h2><p>Hei {{customer_name}},</p><p>Ordre <strong>{{order_number}}</strong> er kansellert.</p><p>{{cancel_reason}}</p><p>{{refund_text}}</p><p><a href="{{order_url}}">Se detaljer</a></p>',
    '<h2>Order cancelled</h2><p>Hi {{customer_name}},</p><p>Order <strong>{{order_number}}</strong> has been cancelled.</p><p>{{cancel_reason}}</p><p>{{refund_text}}</p><p><a href="{{order_url}}">View details</a></p>',
    '["customer_name","order_number","cancel_reason","refund_text","order_url"]'::jsonb,
    true
  ),
  (
    'pig.order.refund.requested',
    'transactional',
    'pig',
    'Refundering registrert - {{order_number}}',
    'Refund request registered - {{order_number}}',
    '<h2>Refundering registrert</h2><p>Hei {{customer_name}},</p><p>Vi har registrert refundering for <strong>{{order_number}}</strong>.</p><p><strong>Belop:</strong> {{refund_amount_nok}}<br/><strong>Type:</strong> {{refund_type_label}}</p><p>Behandlingstid er normalt 5-7 virkedager.</p><p><a href="{{order_url}}">Se bestilling</a></p>',
    '<h2>Refund request registered</h2><p>Hi {{customer_name}},</p><p>We have registered a refund request for <strong>{{order_number}}</strong>.</p><p><strong>Amount:</strong> {{refund_amount_nok}}<br/><strong>Type:</strong> {{refund_type_label}}</p><p>Processing time is normally 5-7 business days.</p><p><a href="{{order_url}}">View order</a></p>',
    '["customer_name","order_number","refund_amount_nok","refund_type_label","order_url"]'::jsonb,
    true
  ),
  (
    'support.message.customer.confirmation',
    'support',
    'shared',
    '[{{thread_id}}] Melding mottatt - {{subject_line}}',
    '[{{thread_id}}] Message received - {{subject_line}}',
    '<h2>Melding mottatt</h2><p>Hei {{customer_name}},</p><p>Vi har mottatt meldingen din.</p><p><strong>Referanse:</strong> {{thread_id}}</p><p><strong>Emne:</strong> {{subject_line}}</p><p>{{order_number}}</p><blockquote style="margin:16px 0;padding:12px 14px;background:#f4f4f5;border-left:4px solid #d4d4d8;white-space:pre-wrap;">{{message_text}}</blockquote><p>Du kan svare direkte pa denne e-posten, eller ga til <a href="{{portal_url}}">{{portal_label}}</a>.</p>',
    '<h2>Message received</h2><p>Hi {{customer_name}},</p><p>We have received your message.</p><p><strong>Reference:</strong> {{thread_id}}</p><p><strong>Subject:</strong> {{subject_line}}</p><p>{{order_number}}</p><blockquote style="margin:16px 0;padding:12px 14px;background:#f4f4f5;border-left:4px solid #d4d4d8;white-space:pre-wrap;">{{message_text}}</blockquote><p>You can reply directly to this email, or visit <a href="{{portal_url}}">{{portal_label}}</a>.</p>',
    '["customer_name","thread_id","subject_line","order_number","message_text","portal_url","portal_label"]'::jsonb,
    true
  ),
  (
    'support.message.admin.new',
    'support',
    'shared',
    '[{{thread_id}}] Ny melding fra {{customer_name}}: {{subject_line}}',
    '[{{thread_id}}] New message from {{customer_name}}: {{subject_line}}',
    '<h2>Ny kundemelding</h2><p><strong>Fra:</strong> {{customer_name}} ({{customer_phone}})<br/><strong>E-post:</strong> {{customer_email}}</p><p>{{order_number}}</p><p><strong>Type:</strong> {{message_type}}<br/><strong>Emne:</strong> {{subject_line}}</p><blockquote style="margin:16px 0;padding:12px 14px;background:#fff7ed;border-left:4px solid #fb923c;white-space:pre-wrap;">{{message_text}}</blockquote><p>Svar pa denne e-posten for a svare kunden.</p>',
    '<h2>New customer message</h2><p><strong>From:</strong> {{customer_name}} ({{customer_phone}})<br/><strong>Email:</strong> {{customer_email}}</p><p>{{order_number}}</p><p><strong>Type:</strong> {{message_type}}<br/><strong>Subject:</strong> {{subject_line}}</p><blockquote style="margin:16px 0;padding:12px 14px;background:#fff7ed;border-left:4px solid #fb923c;white-space:pre-wrap;">{{message_text}}</blockquote><p>Reply to this email to answer the customer.</p>',
    '["thread_id","customer_name","customer_phone","customer_email","order_number","message_type","subject_line","message_text"]'::jsonb,
    true
  ),
  (
    'support.reply.customer.notification',
    'support',
    'shared',
    '[{{thread_id}}] Svar pa: {{subject_line}}',
    '[{{thread_id}}] Reply: {{subject_line}}',
    '<h2>Nytt svar fra Tinglum Gard</h2><p>Hei {{customer_name}},</p><p>Du har fatt et svar fra {{admin_name}}.</p><blockquote style="margin:16px 0;padding:12px 14px;background:#ecfeff;border-left:4px solid #22d3ee;white-space:pre-wrap;">{{reply_text}}</blockquote><p>Du kan svare direkte pa denne e-posten, eller ga til <a href="{{portal_url}}">{{portal_label}}</a>.</p>',
    '<h2>New reply from Tinglum Gard</h2><p>Hi {{customer_name}},</p><p>You have received a reply from {{admin_name}}.</p><blockquote style="margin:16px 0;padding:12px 14px;background:#ecfeff;border-left:4px solid #22d3ee;white-space:pre-wrap;">{{reply_text}}</blockquote><p>You can reply directly to this email, or visit <a href="{{portal_url}}">{{portal_label}}</a>.</p>',
    '["customer_name","thread_id","subject_line","reply_text","admin_name","portal_url","portal_label"]'::jsonb,
    true
  ),
  (
    'support.reply.admin.notification',
    'support',
    'shared',
    '[{{thread_id}}] Svar fra {{customer_name}}: {{subject_line}}',
    '[{{thread_id}}] Reply from {{customer_name}}: {{subject_line}}',
    '<h2>Kundesvar (e-post)</h2><p><strong>Fra:</strong> {{customer_name}} ({{customer_phone}})<br/><strong>E-post:</strong> {{customer_email}}</p><p>{{order_number}}</p><p><strong>Emne:</strong> {{subject_line}}</p><blockquote style="margin:16px 0;padding:12px 14px;background:#eff6ff;border-left:4px solid #60a5fa;white-space:pre-wrap;">{{reply_text}}</blockquote><p>Svar pa denne e-posten direkte for a svare kunden.</p>',
    '<h2>Customer reply (email)</h2><p><strong>From:</strong> {{customer_name}} ({{customer_phone}})<br/><strong>Email:</strong> {{customer_email}}</p><p>{{order_number}}</p><p><strong>Subject:</strong> {{subject_line}}</p><blockquote style="margin:16px 0;padding:12px 14px;background:#eff6ff;border-left:4px solid #60a5fa;white-space:pre-wrap;">{{reply_text}}</blockquote><p>Reply directly to this email to answer the customer.</p>',
    '["thread_id","customer_name","customer_phone","customer_email","order_number","subject_line","reply_text"]'::jsonb,
    true
  ),
  (
    'support.contact.admin.new',
    'support',
    'shared',
    'Kundehenvendelse - Ordre {{order_number}}',
    'Customer inquiry - Order {{order_number}}',
    '<h2>Kundehenvendelse</h2><p><strong>Kunde:</strong> {{customer_name}}<br/><strong>E-post:</strong> {{customer_email}}<br/><strong>Telefon:</strong> {{customer_phone}}</p><p><strong>Ordre:</strong> {{order_number}}</p><p><strong>Ordredetaljer:</strong></p><blockquote style="margin:16px 0;padding:12px 14px;background:#eff6ff;border-left:4px solid #60a5fa;white-space:pre-wrap;">{{order_details}}</blockquote><p><strong>Melding:</strong></p><blockquote style="margin:16px 0;padding:12px 14px;background:#f5f3ff;border-left:4px solid #a78bfa;white-space:pre-wrap;">{{message_text}}</blockquote><p>Svar kunden pa {{customer_email}}.</p>',
    '<h2>Customer inquiry</h2><p><strong>Customer:</strong> {{customer_name}}<br/><strong>Email:</strong> {{customer_email}}<br/><strong>Phone:</strong> {{customer_phone}}</p><p><strong>Order:</strong> {{order_number}}</p><p><strong>Order details:</strong></p><blockquote style="margin:16px 0;padding:12px 14px;background:#eff6ff;border-left:4px solid #60a5fa;white-space:pre-wrap;">{{order_details}}</blockquote><p><strong>Message:</strong></p><blockquote style="margin:16px 0;padding:12px 14px;background:#f5f3ff;border-left:4px solid #a78bfa;white-space:pre-wrap;">{{message_text}}</blockquote><p>Reply to the customer at {{customer_email}}.</p>',
    '["customer_name","customer_email","customer_phone","order_number","order_details","message_text"]'::jsonb,
    true
  ),
  (
    'support.contact.customer.confirmation',
    'support',
    'shared',
    'Bekreftelse: Din henvendelse om ordre {{order_number}}',
    'Confirmation: Your inquiry about order {{order_number}}',
    '<h2>Melding mottatt</h2><p>Hei {{customer_name}},</p><p>Vi har mottatt henvendelsen din om ordre <strong>{{order_number}}</strong>.</p><blockquote style="margin:16px 0;padding:12px 14px;background:#f4f4f5;border-left:4px solid #d4d4d8;white-space:pre-wrap;">{{message_text}}</blockquote><p>Vi kontakter deg snart pa {{customer_email}} eller {{customer_phone}}.</p>',
    '<h2>Message received</h2><p>Hi {{customer_name}},</p><p>We have received your inquiry about order <strong>{{order_number}}</strong>.</p><blockquote style="margin:16px 0;padding:12px 14px;background:#f4f4f5;border-left:4px solid #d4d4d8;white-space:pre-wrap;">{{message_text}}</blockquote><p>We will contact you soon at {{customer_email}} or {{customer_phone}}.</p>',
    '["customer_name","order_number","message_text","customer_email","customer_phone"]'::jsonb,
    true
  ),
  (
    'egg.waitlist.available',
    'transactional',
    'eggs',
    'Rugeegg tilgjengelig - {{breed_name}} uke {{week_number}}',
    'Hatching eggs available - {{breed_name}} week {{week_number}}',
    '<h2>Egg er frigitt for bestilling</h2><p>Hei {{customer_name}},</p><p><strong>{{breed_name}}</strong> er na tilgjengelig i uke {{week_number}} (levering {{delivery_date}}).</p><p>Vinduet for prioritet i ventelisten er {{reservation_window_minutes}} minutter.</p><p><a href="{{inventory_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Ga til bestilling</a></p>',
    '<h2>Eggs released for ordering</h2><p>Hi {{customer_name}},</p><p><strong>{{breed_name}}</strong> is now available for week {{week_number}} (delivery {{delivery_date}}).</p><p>Your waitlist priority window is {{reservation_window_minutes}} minutes.</p><p><a href="{{inventory_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Go to ordering</a></p>',
    '["customer_name","breed_name","week_number","delivery_date","reservation_window_minutes","inventory_url"]'::jsonb,
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

WITH managed_keys AS (
  SELECT unnest(ARRAY[
    'pig.order.deposit.confirmed.customer',
    'egg.order.deposit.confirmed.customer',
    'chicken.order.deposit.confirmed.customer',
    'pig.order.remainder.paid.customer',
    'egg.order.remainder.paid.customer',
    'chicken.order.remainder.paid.customer',
    'admin.order.deposit.confirmed.pig',
    'admin.order.deposit.confirmed.egg',
    'admin.order.deposit.confirmed.chicken',
    'pig.order.ready_for_pickup',
    'pig.order.locked.finalized',
    'pig.order.cancelled',
    'pig.order.refund.requested',
    'support.message.customer.confirmation',
    'support.message.admin.new',
    'support.reply.customer.notification',
    'support.reply.admin.notification',
    'support.contact.admin.new',
    'support.contact.customer.confirmation',
    'egg.waitlist.available'
  ]) AS template_key
)
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
  'Seeded managed transactional/support templates',
  'migration'
FROM email_templates t
JOIN managed_keys k
  ON k.template_key = t.template_key
LEFT JOIN email_template_versions v
  ON v.template_id = t.id AND v.version = 1
WHERE v.id IS NULL;
