BEGIN;

CREATE OR REPLACE FUNCTION refresh_email_template(
  p_template_key text,
  p_classification email_classification,
  p_product_scope text,
  p_subject_no text,
  p_subject_en text,
  p_body_no text,
  p_body_en text,
  p_variables text[],
  p_change_note text
) RETURNS void
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_template_id uuid;
  v_version int;
BEGIN
  INSERT INTO email_templates (
    template_key,
    classification,
    product_scope,
    subject_no,
    subject_en,
    body_no,
    body_en,
    variables,
    active,
    current_version
  )
  VALUES (
    p_template_key,
    p_classification,
    p_product_scope,
    p_subject_no,
    p_subject_en,
    p_body_no,
    p_body_en,
    to_jsonb(p_variables),
    true,
    1
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
    active = true,
    current_version = email_templates.current_version + 1,
    updated_at = now()
  RETURNING id, current_version INTO v_template_id, v_version;

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
  VALUES (
    v_template_id,
    v_version,
    p_subject_no,
    p_subject_en,
    p_body_no,
    p_body_en,
    p_change_note,
    'codex'
  )
  ON CONFLICT (template_id, version) DO NOTHING;
END;
$fn$;

SELECT refresh_email_template(
  'pig.order.deposit.confirmed.customer',
  'transactional',
  'pig',
  'Bestillingen er bekreftet – {{order_number}}',
  'Order confirmed – {{order_number}}',
  $pig_dep_no$
<p>Hei {{customer_first_name}},</p>
<p>Takk for bestillingen din. Vi har registrert forskuddet for <strong>{{order_number}}</strong>.</p>
<p>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</p>
<p><strong>Bestillingen din</strong></p>
<p><strong>Kasse:</strong> {{box_label}}<br/><strong>Levering eller henting:</strong> {{delivery_label}}</p>
{{extras_html}}
{{discount_html}}
<p><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Forskudd betalt:</strong> {{deposit_amount_nok}}<br/><strong>Restbetaling:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Bestillingen ligger klar på Min side.</li>
    <li>Vi sender egen informasjon om restbetalingen når den nærmer seg.</li>
    <li>Du får nye oppdateringer når det nærmer seg slakt, levering og henting.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$pig_dep_no$,
  $pig_dep_en$
<p>Hi {{customer_first_name}},</p>
<p>Thank you for your order. We have registered the deposit for <strong>{{order_number}}</strong>.</p>
<p>You will always find the latest status on My Page when you log in with Vipps.</p>
<p><strong>Your order</strong></p>
<p><strong>Box:</strong> {{box_label}}<br/><strong>Delivery or pickup:</strong> {{delivery_label}}</p>
{{extras_html}}
{{discount_html}}
<p><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Deposit paid:</strong> {{deposit_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order is now available on My Page.</li>
    <li>We will send separate information about the remainder payment when it gets closer.</li>
    <li>You will receive new updates as slaughter, delivery, and pickup get closer.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$pig_dep_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'box_label', 'ribbe_choice', 'delivery_label', 'extras_html', 'discount_html', 'total_amount_nok', 'deposit_amount_nok', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'pig.remainder.explainer.full',
  'transactional',
  'pig',
  'Slik fungerer restbetalingen – {{order_number}}',
  'How the remainder payment works – {{order_number}}',
  $pig_full_no$
<p>Hei {{customer_first_name}},</p>
<p>Her kommer en rolig oversikt over restbetalingen for <strong>{{order_number}}</strong>.</p>
<p><strong>Restbeløp:</strong> {{remainder_amount_nok}}<br/><strong>Betalingsfrist:</strong> {{due_date}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Du kan når som helst åpne bestillingen på Min side.</li>
    <li>Vi sender vennlige påminnelser før fristen dersom restbetalingen ikke er registrert.</li>
    <li>Når restbetalingen er inne, er bestillingen klar videre mot levering eller henting.</li>
  </ol>
</div>
<p>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</p>
<p><a href="{{order_url}}">Åpne Min side</a></p>
$pig_full_no$,
  $pig_full_en$
<p>Hi {{customer_first_name}},</p>
<p>Here is a simple overview of the remainder payment for <strong>{{order_number}}</strong>.</p>
<p><strong>Remainder:</strong> {{remainder_amount_nok}}<br/><strong>Due date:</strong> {{due_date}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>You can open the order on My Page at any time.</li>
    <li>We will send friendly reminders before the deadline if the remainder has not been registered.</li>
    <li>Once the remainder is paid, the order is ready to move on to delivery or pickup.</li>
  </ol>
</div>
<p>You will always find the latest status on My Page when you log in with Vipps.</p>
<p><a href="{{order_url}}">Open My Page</a></p>
$pig_full_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'remainder_amount_nok', 'due_date', 'order_url'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'pig.remainder.explainer.reduced',
  'transactional',
  'pig',
  'Restbetalingen er registrert – {{order_number}}',
  'Remainder payment registered – {{order_number}}',
  $pig_red_no$
<p>Hei {{customer_first_name}},</p>
<p>Vi har registrert restbetalingen for <strong>{{order_number}}</strong>.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Bestillingen din ligger oppdatert på Min side.</li>
    <li>Vi følger opp videre med informasjon om levering eller henting.</li>
    <li>Du trenger ikke gjøre noe mer akkurat nå.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
$pig_red_no$,
  $pig_red_en$
<p>Hi {{customer_first_name}},</p>
<p>We have registered the remainder payment for <strong>{{order_number}}</strong>.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order has been updated on My Page.</li>
    <li>We will follow up with delivery or pickup information later.</li>
    <li>You do not need to do anything else right now.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
$pig_red_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'order_url'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'pig.remainder.reminder',
  'transactional',
  'pig',
  'Påminnelse om restbetaling ({{days_left}} dager) – {{order_number}}',
  'Remainder payment reminder ({{days_left}} days) – {{order_number}}',
  $pig_rem_no$
<p>Hei {{customer_first_name}},</p>
<p>Dette er en vennlig påminnelse om restbetalingen for <strong>{{order_number}}</strong>.</p>
<p><strong>Restbeløp:</strong> {{remainder_amount_nok}}<br/><strong>Betalingsfrist:</strong> {{due_date}} ({{days_left}} dager igjen)</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Registrer restbetalingen innen fristen.</li>
    <li>Når betalingen er inne, er bestillingen klar videre mot levering eller henting.</li>
    <li>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
$pig_rem_no$,
  $pig_rem_en$
<p>Hi {{customer_first_name}},</p>
<p>This is a friendly reminder about the remainder payment for <strong>{{order_number}}</strong>.</p>
<p><strong>Remainder:</strong> {{remainder_amount_nok}}<br/><strong>Due date:</strong> {{due_date}} ({{days_left}} days left)</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Register the remainder payment before the deadline.</li>
    <li>Once the payment is in, the order is ready to move on to delivery or pickup.</li>
    <li>You will always find the latest status on My Page when you log in with Vipps.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
$pig_rem_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'remainder_amount_nok', 'due_date', 'days_left', 'order_url'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'pig.order.remainder.paid.customer',
  'transactional',
  'pig',
  'Restbetalingen er mottatt – {{order_number}}',
  'Remainder payment received – {{order_number}}',
  $pig_paid_no$
<p>Hei {{customer_first_name}},</p>
<p>Takk. Vi har registrert restbetalingen for <strong>{{order_number}}</strong>.</p>
<p><strong>Kasse:</strong> {{box_label}}<br/><strong>Levering eller henting:</strong> {{delivery_label}}<br/><strong>Totalt betalt:</strong> {{total_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Bestillingen er nå fullt betalt.</li>
    <li>Vi sender neste oppdatering når levering eller henting nærmer seg.</li>
    <li>Du finner ordren på Min side når som helst.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$pig_paid_no$,
  $pig_paid_en$
<p>Hi {{customer_first_name}},</p>
<p>Thank you. We have registered the remainder payment for <strong>{{order_number}}</strong>.</p>
<p><strong>Box:</strong> {{box_label}}<br/><strong>Delivery or pickup:</strong> {{delivery_label}}<br/><strong>Total paid:</strong> {{total_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order is now fully paid.</li>
    <li>We will send the next update when delivery or pickup gets closer.</li>
    <li>You can always find the order on My Page.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$pig_paid_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'box_label', 'delivery_label', 'total_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'egg.order.deposit.confirmed.customer',
  'transactional',
  'eggs',
  'Bestillingen er bekreftet – {{order_number}}',
  'Order confirmed – {{order_number}}',
  $egg_dep_no$
<p>Hei {{customer_first_name}},</p>
<p>Takk for bestillingen din. Vi har registrert forskuddet for <strong>{{order_number}}</strong>.</p>
<p>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Leveringsuke:</strong> Uke {{week_number}}<br/><strong>Totalt antall:</strong> {{total_quantity}} egg<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Forskudd betalt:</strong> {{deposit_amount_nok}}<br/><strong>Restbeløp:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Bestillingen ligger klar på Min side.</li>
    <li>Vi sender vennlige påminnelser om restbetalingen før fristen.</li>
    <li>Når ordren er fullt betalt og sendt, får du sporingsinformasjon på e-post.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$egg_dep_no$,
  $egg_dep_en$
<p>Hi {{customer_first_name}},</p>
<p>Thank you for your order. We have registered the deposit for <strong>{{order_number}}</strong>.</p>
<p>You will always find the latest status on My Page when you log in with Vipps.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Delivery week:</strong> Week {{week_number}}<br/><strong>Total quantity:</strong> {{total_quantity}} eggs<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Deposit paid:</strong> {{deposit_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order is now available on My Page.</li>
    <li>We will send friendly remainder reminders before the deadline.</li>
    <li>Once the order is fully paid and shipped, you will receive tracking by email.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$egg_dep_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'breed_name', 'week_number', 'base_quantity', 'additions_quantity', 'total_quantity', 'order_lines_html', 'order_lines_html_en', 'total_amount_nok', 'deposit_amount_nok', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'egg.remainder.reminder',
  'transactional',
  'eggs',
  'Påminnelse om restbetaling ({{days_left}} dager) – {{order_number}}',
  'Remainder payment reminder ({{days_left}} days) – {{order_number}}',
  $egg_rem_no$
<p>{{reminder_intro_html}}</p>
<p>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">Bestilling</td>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>{{order_number}}</strong></td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">Restbeløp</td>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>{{remainder_amount_nok}}</strong></td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">Betalingsfrist</td>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>{{due_date}} ({{days_left}} dager igjen)</strong></td>
  </tr>
</table>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p>{{reminder_support_html}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fde68a;border-radius:14px;background:#fffbeb;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Betal restbeløpet på Min side før fristen.</li>
    <li>Når betalingen er registrert, er ordren klar videre mot utsending.</li>
    <li>Vi sender ny oppdatering når pakken er sendt.</li>
  </ol>
</div>
<p>{{reminder_consequence_html}}</p>
<p style="color:#6b7280;">Påminnelse {{reminder_number}} av {{total_reminders}}</p>
<p><a href="{{order_url}}">Betal rest nå</a></p>
{{tip_html}}
$egg_rem_no$,
  $egg_rem_en$
<p>{{reminder_intro_html}}</p>
<p>You will always find the latest status on My Page when you log in with Vipps.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">Order</td>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>{{order_number}}</strong></td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">Remaining amount</td>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>{{remainder_amount_nok}}</strong></td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">Payment deadline</td>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>{{due_date}} ({{days_left}} days left)</strong></td>
  </tr>
</table>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p>{{reminder_support_html}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fde68a;border-radius:14px;background:#fffbeb;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Pay the remaining amount on My Page before the deadline.</li>
    <li>Once the payment is registered, the order is ready to move on to shipping.</li>
    <li>We will send a new update when the parcel has been shipped.</li>
  </ol>
</div>
<p>{{reminder_consequence_html}}</p>
<p style="color:#6b7280;">Reminder {{reminder_number}} of {{total_reminders}}</p>
<p><a href="{{order_url}}">Pay remainder now</a></p>
{{tip_html}}
$egg_rem_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'remainder_amount_nok', 'due_date', 'days_left', 'reminder_number', 'total_reminders', 'order_lines_html', 'order_lines_html_en', 'order_url', 'reminder_intro_html', 'reminder_support_html', 'reminder_consequence_html', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'egg.order.remainder.paid.customer',
  'transactional',
  'eggs',
  'Restbetalingen er mottatt – {{order_number}}',
  'Remainder payment received – {{order_number}}',
  $egg_paid_no$
<p>Hei {{customer_first_name}},</p>
<p>Takk. Vi har registrert restbetalingen for <strong>{{order_number}}</strong>.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_quantity}} egg<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Restbetaling registrert:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Ordren er nå fullt betalt.</li>
    <li>Vi sender ny e-post når pakken er sendt.</li>
    <li>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$egg_paid_no$,
  $egg_paid_en$
<p>Hi {{customer_first_name}},</p>
<p>Thank you. We have registered the remainder payment for <strong>{{order_number}}</strong>.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total quantity:</strong> {{total_quantity}} eggs<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Remainder registered:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order is now fully paid.</li>
    <li>We will send another email when the parcel has been shipped.</li>
    <li>You will always find the latest status on My Page when you log in with Vipps.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$egg_paid_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'breed_name', 'base_quantity', 'additions_quantity', 'total_quantity', 'order_lines_html', 'order_lines_html_en', 'total_amount_nok', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'egg.order.shipped.customer',
  'transactional',
  'eggs',
  'Rugeeggene er sendt – {{order_number}}',
  'Your hatching eggs are on the way – {{order_number}}',
  $egg_ship_no$
<p>Hei {{customer_first_name}},</p>
<p>Bestilling <strong>{{order_number}}</strong> er sendt, og pakken er nå på vei til deg.</p>
<p>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</p>
<p><strong>Sporingsnummer:</strong> {{tracking_number}}<br/><a href="{{tracking_url}}">Spor pakken hos Posten</a></p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_quantity}} egg<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Forskudd:</strong> {{deposit_amount_nok}}<br/><strong>Restbeløp:</strong> {{remainder_amount_nok}}<br/><strong>Levering:</strong> Uke {{delivery_week}} ({{delivery_date}})</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Følg sporingen hos Posten.</li>
    <li>Når pakken kommer frem, sjekk innholdet rolig og forsiktig.</li>
    <li>La eggene hvile og temperere før du legger dem i rugemaskinen.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$egg_ship_no$,
  $egg_ship_en$
<p>Hi {{customer_first_name}},</p>
<p>Your order <strong>{{order_number}}</strong> has been shipped and is now on its way to you.</p>
<p>You will always find the latest status on My Page when you log in with Vipps.</p>
<p><strong>Tracking number:</strong> {{tracking_number}}<br/><a href="{{tracking_url}}">Track the parcel with Posten</a></p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total quantity:</strong> {{total_quantity}} eggs<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Deposit:</strong> {{deposit_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}<br/><strong>Delivery:</strong> Week {{delivery_week}} ({{delivery_date}})</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Track the parcel with Posten.</li>
    <li>Check the contents carefully when the parcel arrives.</li>
    <li>Let the eggs rest and warm up gently before putting them in the incubator.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$egg_ship_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'tracking_number', 'tracking_url', 'order_lines_html', 'order_lines_html_en', 'total_quantity', 'total_amount_nok', 'deposit_amount_nok', 'remainder_amount_nok', 'delivery_week', 'delivery_date', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'egg.delivery.day_before',
  'transactional',
  'eggs',
  'Rugeeggene er på vei – {{order_number}}',
  'Your hatching eggs are on the way – {{order_number}}',
  $egg_way_no$
<p>Hei {{customer_first_name}},</p>
<p>En liten oppfølging fra oss: bestilling <strong>{{order_number}}</strong> er på vei, og det er lurt å gjøre klart til mottak og ruging nå.</p>
<p><strong>Sporingsnummer:</strong> {{tracking_number}}<br/><a href="{{tracking_url}}">Spor pakken hos Posten</a></p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_quantity}} egg<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Levering:</strong> Uke {{delivery_week}} ({{delivery_date}})</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Følg med på sporingen.</li>
    <li>Gjør rugemaskinen klar.</li>
    <li>La eggene hvile og temperere før oppstart.</li>
  </ol>
</div>
<p>Du finner alltid bestillingen på Min side når du logger inn med Vipps.</p>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$egg_way_no$,
  $egg_way_en$
<p>Hi {{customer_first_name}},</p>
<p>A quick follow-up from us: order <strong>{{order_number}}</strong> is on the way, so this is a good time to get ready for delivery and incubation.</p>
<p><strong>Tracking number:</strong> {{tracking_number}}<br/><a href="{{tracking_url}}">Track the parcel with Posten</a></p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total quantity:</strong> {{total_quantity}} eggs<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Delivery:</strong> Week {{delivery_week}} ({{delivery_date}})</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Keep an eye on the tracking.</li>
    <li>Prepare the incubator.</li>
    <li>Let the eggs rest and warm up gently before setting them.</li>
  </ol>
</div>
<p>You will always find the order on My Page when you log in with Vipps.</p>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$egg_way_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'tracking_number', 'tracking_url', 'order_lines_html', 'order_lines_html_en', 'total_quantity', 'total_amount_nok', 'delivery_week', 'delivery_date', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'egg.hatch.followup',
  'transactional',
  'eggs',
  'Lykke til med klekkingen – {{order_number}}',
  'Happy hatching – {{order_number}}',
  $egg_hatch_no$
<p>Hei {{customer_first_name}},</p>
<p>Vi håper klekkingen er godt i gang for <strong>{{order_number}}</strong>, og at du er fornøyd så langt.</p>
<p>Hvis du lurer på noe underveis, er det bare å sende oss en melding. Vi hjelper gjerne.</p>
<p><strong>Bestillingen din</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_quantity}} egg</p>
<p><a href="{{message_url}}">Send melding via Min side</a></p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Følg med på klekkingen og skriv ned det du observerer.</li>
    <li>Ta kontakt hvis du ønsker råd om temperatur, fuktighet eller videre oppfølging.</li>
    <li>Bestillingen din ligger fortsatt tilgjengelig på Min side.</li>
  </ol>
</div>
{{tip_html}}
<div style="margin:24px 0;padding:16px;border:1px solid #f3d4aa;border-radius:14px;background:#fff8ef;">
  <strong>Lyst til å prøve ullgris til jul?</strong>
  <p>Som rugeeggkunde får du <strong>10% rabatt på forskuddet</strong> på en Mangalitsa-kasse med koden <strong>{{deposit_discount_code}}</strong>.</p>
  <p>Del vennerabatten din videre: vennene dine får rabatt på forskuddet, og du kan bygge opp kreditt tilsvarende opptil <strong>50% av forskuddet</strong> på din egen kasse.</p>
  <p><a href="{{pork_url}}">Se ullgris-kasser</a></p>
</div>
$egg_hatch_no$,
  $egg_hatch_en$
<p>Hi {{customer_first_name}},</p>
<p>We hope the hatch is well underway for <strong>{{order_number}}</strong> and that you are happy with everything so far.</p>
<p>If you have any questions along the way, just send us a message. We are happy to help.</p>
<p><strong>Your order</strong></p>
{{order_lines_html_en}}
<p><strong>Total quantity:</strong> {{total_quantity}} eggs</p>
<p><a href="{{message_url}}">Send a message through My Page</a></p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Keep an eye on the hatch and note what you observe.</li>
    <li>Reach out if you want advice on temperature, humidity, or the next steps.</li>
    <li>Your order is still available on My Page.</li>
  </ol>
</div>
{{tip_html}}
<div style="margin:24px 0;padding:16px;border:1px solid #f3d4aa;border-radius:14px;background:#fff8ef;">
  <strong>Would you like to try Mangalitsa pork for Christmas?</strong>
  <p>As a hatching egg customer, you get <strong>10% off the deposit</strong> on a Mangalitsa box with the code <strong>{{deposit_discount_code}}</strong>.</p>
  <p>Share your referral code with friends: they get a discount on the deposit, and you can build up credit worth up to <strong>50% of the deposit</strong> on your own box.</p>
  <p><a href="{{pork_url}}">See Mangalitsa boxes</a></p>
</div>
$egg_hatch_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'total_quantity', 'order_lines_html', 'order_lines_html_en', 'message_url', 'pork_url', 'deposit_discount_code', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'egg.order.forfeited',
  'transactional',
  'eggs',
  'Bestillingen er kansellert – {{order_number}}',
  'Order cancelled – {{order_number}}',
  $egg_forfeit_no$
<p>Hei {{customer_first_name}},</p>
<p>Bestilling <strong>{{order_number}}</strong> er dessverre kansellert fordi restbetalingen ikke ble registrert innen fristen.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fee2e2;border-radius:14px;background:#fff5f5;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Ordren er lukket, og eggene frigjøres til andre kunder.</li>
    <li>Du kan fortsatt logge inn på Min side med Vipps for å se ordrehistorikken.</li>
    <li>Hvis du ønsker å bestille på nytt, hjelper vi deg gjerne med å finne en ny uke.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
$egg_forfeit_no$,
  $egg_forfeit_en$
<p>Hi {{customer_first_name}},</p>
<p>Your order <strong>{{order_number}}</strong> has unfortunately been cancelled because the remainder payment was not registered before the deadline.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fee2e2;border-radius:14px;background:#fff5f5;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>The order is now closed and the eggs are released to other customers.</li>
    <li>You can still log in with Vipps and view the order history on My Page.</li>
    <li>If you want to order again, we are happy to help you find a new delivery week.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
$egg_forfeit_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'order_url'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.order.deposit.confirmed.customer',
  'transactional',
  'chickens',
  'Bestillingen er bekreftet – {{order_number}}',
  'Order confirmed – {{order_number}}',
  $chk_dep_no$
<p>Hei {{customer_first_name}},</p>
<p>Takk for bestillingen din. Vi har registrert forskuddet for <strong>{{order_number}}</strong>.</p>
<p>Du finner alltid oppdatert status på Min side når du logger inn med Vipps.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_birds_label}}<br/><strong>Levering eller henting:</strong> {{delivery_label}}<br/><strong>Henteuke eller dato:</strong> {{pickup_date}}<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Forskudd betalt:</strong> {{deposit_amount_nok}}<br/><strong>Restbeløp:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Bestillingen ligger klar på Min side.</li>
    <li>Vi sender ny oppdatering når henting eller levering nærmer seg.</li>
    <li>Hvis det blir aktuelt med restbetaling via Vipps, får du beskjed og kan betale fra Min side.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$chk_dep_no$,
  $chk_dep_en$
<p>Hi {{customer_first_name}},</p>
<p>Thank you for your order. We have registered the deposit for <strong>{{order_number}}</strong>.</p>
<p>You will always find the latest status on My Page when you log in with Vipps.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total birds:</strong> {{total_birds_label_en}}<br/><strong>Delivery or pickup:</strong> {{delivery_label}}<br/><strong>Pickup week or date:</strong> {{pickup_date}}<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Deposit paid:</strong> {{deposit_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order is now available on My Page.</li>
    <li>We will send another update when pickup or delivery gets closer.</li>
    <li>If Vipps remainder payment becomes relevant, you will be notified and can pay from My Page.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$chk_dep_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'breed_name', 'breed_name_en', 'quantity_hens', 'quantity_roosters', 'total_birds_label', 'total_birds_label_en', 'order_lines_html', 'order_lines_html_en', 'pickup_date', 'delivery_label', 'total_amount_nok', 'deposit_amount_nok', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.order.remainder.enabled.customer',
  'transactional',
  'chickens',
  'Restbetalingen er klar for betaling – {{order_number}}',
  'Remainder payment is now ready – {{order_number}}',
  $chk_en_no$
<p>Hei {{customer_first_name}},</p>
<p>Vi har nå åpnet restbetalingen for <strong>{{order_number}}</strong>.</p>
<p>Logg inn med Vipps på Min side for å fullføre betalingen med en gang.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_birds_label}}<br/><strong>Henteuke eller dato:</strong> {{pickup_date}}<br/><strong>Restbeløp:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fde68a;border-radius:14px;background:#fffbeb;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Åpne Min side og trykk <em>Betal rest</em>.</li>
    <li>Du blir sendt videre til Vipps på telefonen.</li>
    <li>Når betalingen er registrert, er ordren ferdig oppgjort.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$chk_en_no$,
  $chk_en_en$
<p>Hi {{customer_first_name}},</p>
<p>We have now enabled the remainder payment for <strong>{{order_number}}</strong>.</p>
<p>Log in with Vipps on My Page to complete the payment right away.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total birds:</strong> {{total_birds_label_en}}<br/><strong>Pickup week or date:</strong> {{pickup_date}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fde68a;border-radius:14px;background:#fffbeb;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Open My Page and click <em>Pay remainder</em>.</li>
    <li>You will be redirected to Vipps on your phone.</li>
    <li>Once the payment is registered, the order is fully settled.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$chk_en_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'breed_name', 'breed_name_en', 'total_birds_label', 'total_birds_label_en', 'order_lines_html', 'order_lines_html_en', 'pickup_date', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.order.remainder.paid.customer',
  'transactional',
  'chickens',
  'Restbetalingen er mottatt – {{order_number}}',
  'Remainder payment received – {{order_number}}',
  $chk_paid_no$
<p>Hei {{customer_first_name}},</p>
<p>Takk. Vi har registrert restbetalingen for <strong>{{order_number}}</strong>.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_birds_label}}<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Henteuke eller dato:</strong> {{pickup_date}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Ordren er nå fullt betalt.</li>
    <li>Du finner alltid status på Min side når du logger inn med Vipps.</li>
    <li>Hvis du trenger hjelp etter kjøpet, er det bare å kontakte oss.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$chk_paid_no$,
  $chk_paid_en$
<p>Hi {{customer_first_name}},</p>
<p>Thank you. We have registered the remainder payment for <strong>{{order_number}}</strong>.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total birds:</strong> {{total_birds_label_en}}<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Pickup week or date:</strong> {{pickup_date}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order is now fully paid.</li>
    <li>You will always find the latest status on My Page when you log in with Vipps.</li>
    <li>If you need help after the purchase, just get in touch.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$chk_paid_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'breed_name', 'breed_name_en', 'total_birds_label', 'total_birds_label_en', 'order_lines_html', 'order_lines_html_en', 'total_amount_nok', 'pickup_date', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.ready_for_pickup',
  'transactional',
  'chickens',
  'Kyllingene er klare for henting – {{order_number}}',
  'Your chickens are ready for pickup – {{order_number}}',
  $chk_ready_no$
<p>Hei {{customer_first_name}},</p>
<p>Kyllingene i bestilling <strong>{{order_number}}</strong> er nå klare for henting.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_birds_label}}<br/><strong>Levering eller henting:</strong> {{delivery_label}}<br/><strong>Hentedato:</strong> {{pickup_date}}<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Forskudd:</strong> {{deposit_amount_nok}}<br/><strong>Eventuelt restbeløp:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Sjekk detaljene på Min side.</li>
    <li>Ta gjerne med egnet transportkasse eller bur.</li>
    <li>Hvis restbetalingen åpnes i Vipps, får du egen e-post om det.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$chk_ready_no$,
  $chk_ready_en$
<p>Hi {{customer_first_name}},</p>
<p>The chickens in order <strong>{{order_number}}</strong> are now ready for pickup.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total birds:</strong> {{total_birds_label_en}}<br/><strong>Delivery or pickup:</strong> {{delivery_label_en}}<br/><strong>Pickup date:</strong> {{pickup_date_en}}<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Deposit:</strong> {{deposit_amount_nok}}<br/><strong>Any remaining amount:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Check the details on My Page.</li>
    <li>Please bring a suitable transport crate or box.</li>
    <li>If the remainder payment is enabled in Vipps, you will receive a separate email about it.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$chk_ready_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'total_birds_label', 'total_birds_label_en', 'order_lines_html', 'order_lines_html_en', 'pickup_date', 'pickup_date_en', 'delivery_label', 'delivery_label_en', 'total_amount_nok', 'deposit_amount_nok', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.pickup.reminder',
  'transactional',
  'chickens',
  'Påminnelse om henting ({{days_left}} dager) – {{order_number}}',
  'Pickup reminder ({{days_left}} days) – {{order_number}}',
  $chk_pick_no$
<p>Hei {{customer_first_name}},</p>
<p>Dette er en vennlig påminnelse om henting for <strong>{{order_number}}</strong>.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_birds_label}}<br/><strong>Hentedato:</strong> {{pickup_date}} ({{days_left}} dager igjen)<br/><strong>Levering eller henting:</strong> {{delivery_label}}<br/><strong>Eventuelt restbeløp:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Sjekk at hentedatoen passer.</li>
    <li>Gjør klart transportutstyr og oppstalling hjemme.</li>
    <li>Du finner alltid bestillingen på Min side når du logger inn med Vipps.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$chk_pick_no$,
  $chk_pick_en$
<p>Hi {{customer_first_name}},</p>
<p>This is a friendly pickup reminder for <strong>{{order_number}}</strong>.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total birds:</strong> {{total_birds_label_en}}<br/><strong>Pickup date:</strong> {{pickup_date_en}} ({{days_left}} days left)<br/><strong>Delivery or pickup:</strong> {{delivery_label_en}}<br/><strong>Any remaining amount:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Make sure the pickup date still works for you.</li>
    <li>Prepare transport and housing at home.</li>
    <li>You will always find the order on My Page when you log in with Vipps.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$chk_pick_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'total_birds_label', 'total_birds_label_en', 'order_lines_html', 'order_lines_html_en', 'pickup_date', 'pickup_date_en', 'days_left', 'delivery_label', 'delivery_label_en', 'total_amount_nok', 'deposit_amount_nok', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.choose_pickup_day',
  'transactional',
  'chickens',
  'Velg hentedag – {{order_number}}',
  'Choose your pickup day – {{order_number}}',
  $chk_choose_no$
<p>Hei {{customer_first_name}},</p>
<p>Henteuken for <strong>{{order_number}}</strong> nærmer seg, og vi trenger at du velger dag og tidspunkt.</p>
<p><strong>Ordredetaljer</strong></p>
{{order_lines_html}}
<p><strong>Totalt antall:</strong> {{total_birds_label}}<br/><strong>Levering eller henting:</strong> {{delivery_label}}<br/><strong>Henteuke:</strong> {{pickup_week}}<br/><strong>Totalt:</strong> {{total_amount_nok}}<br/><strong>Restbeløp:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Åpne Min side med Vipps-login.</li>
    <li>Velg hentedag og tidspunkt.</li>
    <li>Da vet vi når vi skal ha kyllingene klare til deg.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Velg hentedag og tidspunkt</a></p>
{{tip_html}}
$chk_choose_no$,
  $chk_choose_en$
<p>Hi {{customer_first_name}},</p>
<p>The pickup week for <strong>{{order_number}}</strong> is getting closer, and we need you to choose a day and time.</p>
<p><strong>Order details</strong></p>
{{order_lines_html_en}}
<p><strong>Total birds:</strong> {{total_birds_label_en}}<br/><strong>Delivery or pickup:</strong> {{delivery_label_en}}<br/><strong>Pickup week:</strong> {{pickup_week}}<br/><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Remainder:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Open My Page with Vipps login.</li>
    <li>Choose your pickup day and time.</li>
    <li>That lets us have the chickens ready when you arrive.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Choose pickup day and time</a></p>
{{tip_html}}
$chk_choose_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'total_birds_label', 'total_birds_label_en', 'order_lines_html', 'order_lines_html_en', 'pickup_week', 'pickup_date', 'pickup_date_en', 'delivery_label', 'delivery_label_en', 'total_amount_nok', 'deposit_amount_nok', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.pickup.reminder.no_day',
  'transactional',
  'chickens',
  'Velg hentedag – påminnelse for {{order_number}}',
  'Choose your pickup day – reminder for {{order_number}}',
  $chk_noday_no$
<p>Hei {{customer_first_name}},</p>
<p>Henteuken for <strong>{{order_number}}</strong> nærmer seg, men vi mangler fortsatt valg av hentedag og tidspunkt.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fde68a;border-radius:14px;background:#fffbeb;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Åpne Min side med Vipps-login.</li>
    <li>Velg dag og tidspunkt så snart som mulig.</li>
    <li>Da kan vi planlegge henting på en trygg og ryddig måte.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Velg hentedag og tidspunkt</a></p>
{{tip_html}}
$chk_noday_no$,
  $chk_noday_en$
<p>Hi {{customer_first_name}},</p>
<p>The pickup week for <strong>{{order_number}}</strong> is getting closer, but we still need your pickup day and time.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fde68a;border-radius:14px;background:#fffbeb;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Open My Page with Vipps login.</li>
    <li>Choose your day and time as soon as possible.</li>
    <li>That lets us plan pickup in a safe and tidy way.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Choose pickup day and time</a></p>
{{tip_html}}
$chk_noday_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.pickup.reminder.final_warning',
  'transactional',
  'chickens',
  'Siste påminnelse om hentedag – {{order_number}}',
  'Final pickup reminder – {{order_number}}',
  $chk_final_no$
<p>Hei {{customer_first_name}},</p>
<p>Vi mangler fortsatt valg av hentedag for <strong>{{order_number}}</strong>.</p>
<p>For å kunne holde bestillingen aktiv må du velge dag og tidspunkt snarest.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fee2e2;border-radius:14px;background:#fff5f5;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Åpne Min side med Vipps-login.</li>
    <li>Velg hentedag og tidspunkt med en gang.</li>
    <li>Hvis du trenger hjelp, svar på e-posten eller kontakt oss direkte.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Velg hentedag og tidspunkt nå</a></p>
$chk_final_no$,
  $chk_final_en$
<p>Hi {{customer_first_name}},</p>
<p>We still need a pickup day for <strong>{{order_number}}</strong>.</p>
<p>To keep the order active, please choose your day and time as soon as possible.</p>
<div style="margin:24px 0;padding:16px;border:1px solid #fee2e2;border-radius:14px;background:#fff5f5;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Open My Page with Vipps login.</li>
    <li>Choose your pickup day and time right away.</li>
    <li>If you need help, reply to the email or contact us directly.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Choose pickup day and time now</a></p>
$chk_final_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'order_url'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.remainder.collected',
  'transactional',
  'chickens',
  'Kvittering for restbetaling – {{order_number}}',
  'Receipt for remainder payment – {{order_number}}',
  $chk_coll_no$
<p>Hei {{customer_first_name}},</p>
<p>Vi har registrert restbetalingen for <strong>{{order_number}}</strong>.</p>
<p><strong>Beløp:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Bestillingen er oppdatert på Min side.</li>
    <li>Ta gjerne kontakt hvis du trenger hjelp videre.</li>
    <li>Takk for handelen.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Åpne Min side</a></p>
{{tip_html}}
$chk_coll_no$,
  $chk_coll_en$
<p>Hi {{customer_first_name}},</p>
<p>We have registered the remainder payment for <strong>{{order_number}}</strong>.</p>
<p><strong>Amount:</strong> {{remainder_amount_nok}}</p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Your order has been updated on My Page.</li>
    <li>Please reach out if you need any further help.</li>
    <li>Thank you for your order.</li>
  </ol>
</div>
<p><a href="{{order_url}}">Open My Page</a></p>
{{tip_html}}
$chk_coll_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'remainder_amount_nok', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

SELECT refresh_email_template(
  'chicken.order.followup',
  'transactional',
  'chickens',
  'Takk for kyllingbestillingen – {{order_number}}',
  'Thanks for your chicken order – {{order_number}}',
  $chk_follow_no$
<p>Hei {{customer_first_name}},</p>
<p>Takk for at du handlet kyllinger hos oss.</p>
<p>Vi håper de har fått en god start hjemme hos deg. Hvis du lurer på noe om fôr, oppstalling eller videre oppfølging, er det bare å sende oss en melding.</p>
<p><a href="{{message_url}}">Send melding via Min side</a></p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>Hva skjer nå?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>Du kan fortsatt åpne bestillingen på Min side når du logger inn med Vipps.</li>
    <li>Ta kontakt hvis du vil sparre om kyllingene eller trenger råd.</li>
    <li>Vi holder deg gjerne oppdatert på det som skjer videre på gården.</li>
  </ol>
</div>
{{tip_html}}
<div style="margin:24px 0;padding:16px;border:1px solid #f3d4aa;border-radius:14px;background:#fff8ef;">
  <strong>Har du lyst til å prøve ullgris til jul?</strong>
  <p>Som kyllingkunde får du <strong>10% rabatt på forskuddet</strong> på en Mangalitsa-kasse fra Tinglum Gård.</p>
  <p>Del vennerabatten din videre: vennene dine får <strong>20% rabatt på forskuddet</strong>, og du kan bygge opp kreditt tilsvarende opptil <strong>50% av forskuddet</strong> på din egen kasse.</p>
  <p><a href="{{pork_url}}">Se ullgris-kasser</a></p>
</div>
$chk_follow_no$,
  $chk_follow_en$
<p>Hi {{customer_first_name}},</p>
<p>Thank you for buying chickens from us.</p>
<p>We hope they have settled in well at your place. If you have any questions about feed, housing, or the next steps, just send us a message.</p>
<p><a href="{{message_url}}">Send a message through My Page</a></p>
<div style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#faf7f2;">
  <strong>What happens next?</strong>
  <ol style="margin:10px 0 0 20px;padding:0;">
    <li>You can still open the order on My Page whenever you log in with Vipps.</li>
    <li>Please reach out if you want advice about the chickens or need support.</li>
    <li>We are happy to keep you updated on what is happening on the farm.</li>
  </ol>
</div>
{{tip_html}}
<div style="margin:24px 0;padding:16px;border:1px solid #f3d4aa;border-radius:14px;background:#fff8ef;">
  <strong>Would you like to try Mangalitsa pork for Christmas?</strong>
  <p>As a chicken customer, you get <strong>10% off the deposit</strong> on a Mangalitsa box from Tinglum Gård.</p>
  <p>Share your referral code with friends: they get <strong>20% off the deposit</strong>, and you can build up credit worth up to <strong>50% of the deposit</strong> on your own box.</p>
  <p><a href="{{pork_url}}">See Mangalitsa boxes</a></p>
</div>
$chk_follow_en$,
  ARRAY['customer_name', 'customer_first_name', 'order_number', 'message_url', 'pork_url', 'order_url', 'tip_html'],
  'Refresh post-order customer copy'
);

DROP FUNCTION refresh_email_template(text, email_classification, text, text, text, text, text, text[], text);

COMMIT;
