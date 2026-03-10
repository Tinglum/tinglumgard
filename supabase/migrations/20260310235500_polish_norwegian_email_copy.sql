-- =============================================================================
-- Fix Norwegian email copy quality and ensure professional/friendly wording
-- =============================================================================

BEGIN;

-- Broad typo/transliteration cleanup for legacy Norwegian template text
UPDATE email_templates
SET
  subject_no = replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(coalesce(subject_no, ''), 'Aapne', 'Åpne'),
                  'Apne', 'Åpne'),
                'Ga til', 'Gå til'),
              'Paminnelse', 'Påminnelse'),
            'Honer', 'Høner'),
          'Belop', 'Beløp'),
        'gjenstar', 'gjenstår'),
      'fullfort', 'fullført'),
    'Tinglum Gard', 'Tinglum Gård'),
  'Leveringsmate', 'Leveringsmåte'
),
  body_no = replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(
                        replace(
                          replace(
                            replace(
                              replace(
                                replace(
                                  replace(coalesce(body_no, ''), 'Aapne', 'Åpne'),
                                'Apne', 'Åpne'),
                              'Ga til', 'Gå til'),
                            'Paminnelse', 'Påminnelse'),
                          'Hentepaminnelse', 'Hentepåminnelse'),
                        'Honer', 'Høner'),
                      'Belop', 'Beløp'),
                    'gjenstar', 'gjenstår'),
                  'fullfort', 'fullført'),
                'pa Min side', 'på Min side'),
              'Se detaljer pa', 'Se detaljer på'),
            'Se bestillingen pa', 'Se bestillingen på'),
          'Se ordren pa', 'Se ordren på'),
        'naer', 'når'),
      'gjores', 'gjøres'),
    'fatt', 'fått'),
  'Tinglum Gard', 'Tinglum Gård'
)
WHERE true;

-- Lifecycle templates (actively used by flow runner)
UPDATE email_templates
SET
  subject_no = 'Slik fungerer restbetalingen for {{order_number}}',
  body_no = '<p>Hei {{customer_name}},</p><p>Takk for bestillingen din. Restbetalingen for <strong>{{order_number}}</strong> er <strong>{{remainder_amount_nok}}</strong>, med forfall <strong>{{due_date}}</strong>.</p><p>Du finner full oversikt og neste steg på Min side.</p><p><a href="{{order_url}}">Gå til Min side</a></p>'
WHERE template_key = 'pig.remainder.explainer.full';

UPDATE email_templates
SET
  subject_no = 'Oppdatering for {{order_number}}',
  body_no = '<p>Hei {{customer_name}},</p><p>Vi har registrert at restbetalingen for <strong>{{order_number}}</strong> allerede er betalt.</p><p>Du finner ordredetaljene på Min side.</p><p><a href="{{order_url}}">Gå til Min side</a></p>'
WHERE template_key = 'pig.remainder.explainer.reduced';

UPDATE email_templates
SET
  subject_no = 'Påminnelse om restbetaling ({{days_left}} dager) – {{order_number}}',
  body_no = '<p>Hei {{customer_name}},</p><p>Dette er en vennlig påminnelse om restbetaling for <strong>{{order_number}}</strong>.</p><p><strong>Beløp:</strong> {{remainder_amount_nok}}<br/><strong>Forfall:</strong> {{due_date}} ({{days_left}} dager igjen)</p><p><a href="{{order_url}}">Gå til Min side</a></p>'
WHERE template_key = 'pig.remainder.reminder';

UPDATE email_templates
SET
  subject_no = 'Påminnelse om restbetaling ({{days_left}} dager) – {{order_number}}',
  body_no = '<p>Hei {{customer_name}},</p><p>Restbetalingen for rugeeggordren <strong>{{order_number}}</strong> gjenstår.</p><p><strong>Beløp:</strong> {{remainder_amount_nok}}<br/><strong>Forfall:</strong> {{due_date}}</p><p><a href="{{order_url}}">Åpne bestillingen på Min side</a></p>'
WHERE template_key = 'egg.remainder.reminder';

UPDATE email_templates
SET
  subject_no = 'Levering i morgen - {{order_number}}',
  body_no = '<p>Hei {{customer_name}},</p><p>Rugeeggordren <strong>{{order_number}}</strong> sendes i morgen.</p><p>Om du ønsker å legge til flere egg før utsendelse, kan du gjøre det i dag.</p><p><a href="{{upsell_url}}">Legg til ekstra i dag</a></p>'
WHERE template_key = 'egg.delivery.day_before';

UPDATE email_templates
SET
  subject_no = 'Bestillingen er kansellert - {{order_number}}',
  body_no = '<p>Hei {{customer_name}},</p><p>Bestillingen <strong>{{order_number}}</strong> er kansellert fordi restbetalingen ikke ble registrert innen fristen.</p><p><a href="{{order_url}}">Se detaljer på Min side</a></p>'
WHERE template_key = 'egg.order.forfeited';

UPDATE email_templates
SET
  subject_no = 'Kyllingene er klare for henting - {{order_number}}',
  body_no = '<p>Hei {{customer_name}},</p><p>Bestilling <strong>{{order_number}}</strong> er klar for henting.</p><p>Du finner alle detaljer på Min side.</p><p><a href="{{order_url}}">Se detaljer på Min side</a></p>'
WHERE template_key = 'chicken.ready_for_pickup';

UPDATE email_templates
SET
  subject_no = 'Påminnelse om henting ({{days_left}} dager) – {{order_number}}',
  body_no = '<p>Hei {{customer_name}},</p><p>Dette er en påminnelse om henting for <strong>{{order_number}}</strong>.</p><p><strong>Hentedato:</strong> {{pickup_date}} ({{days_left}} dager igjen)</p><p><a href="{{order_url}}">Se detaljer på Min side</a></p>'
WHERE template_key = 'chicken.pickup.reminder';

UPDATE email_templates
SET
  subject_no = 'Kvittering for restbetaling - {{order_number}}',
  body_no = '<p>Hei {{customer_name}},</p><p>Restbetalingen for <strong>{{order_number}}</strong> er registrert ved henting.</p><p><strong>Beløp:</strong> {{remainder_amount_nok}}</p><p><a href="{{order_url}}">Se bestillingen på Min side</a></p>'
WHERE template_key = 'chicken.remainder.collected';

-- Key transactional confirmation templates
UPDATE email_templates
SET
  subject_no = 'Bestilling bekreftet - {{order_number}}',
  body_no = '<h2>Bestilling bekreftet</h2><p>Hei {{customer_name}},</p><p>Vi har mottatt forskuddet for <strong>{{order_number}}</strong>.</p><p><strong>Boks:</strong> {{box_label}}<br/><strong>Ribbevalg:</strong> {{ribbe_choice}}<br/><strong>Levering:</strong> {{delivery_label}}</p>{{extras_html}}{{discount_html}}<p><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Forskudd betalt:</strong> {{deposit_amount_nok}}<br/><strong>Restbetaling:</strong> {{remainder_amount_nok}}</p><p>Du finner neste steg og oppdateringer på Min side.</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Gå til Min side</a></p>'
WHERE template_key = 'pig.order.deposit.confirmed.customer';

UPDATE email_templates
SET
  subject_no = 'Bestilling bekreftet - {{order_number}}',
  body_no = '<h2>Bestilling bekreftet</h2><p>Hei {{customer_name}},</p><p>Vi har mottatt forskuddet for rugeeggordren <strong>{{order_number}}</strong>.</p><p><strong>Rase:</strong> {{breed_name}}<br/><strong>Uke:</strong> {{week_number}}<br/><strong>Grunnordre:</strong> {{base_quantity}} egg<br/><strong>Tillegg:</strong> {{additions_quantity}} egg<br/><strong>Totalt:</strong> {{total_quantity}} egg</p>{{additions_html}}<p><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Forskudd betalt:</strong> {{deposit_amount_nok}}<br/><strong>Restbetaling:</strong> {{remainder_amount_nok}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Åpne Min side</a></p>'
WHERE template_key = 'egg.order.deposit.confirmed.customer';

UPDATE email_templates
SET
  subject_no = 'Bestilling bekreftet - {{order_number}}',
  body_no = '<h2>Bestilling bekreftet</h2><p>Hei {{customer_name}},</p><p>Forskuddet er mottatt for <strong>{{order_number}}</strong>.</p><p><strong>Rase:</strong> {{breed_name}}<br/><strong>Høner:</strong> {{quantity_hens}}<br/><strong>Haner:</strong> {{quantity_roosters}}<br/><strong>Hentedato:</strong> {{pickup_date}}<br/><strong>Levering:</strong> {{delivery_label}}</p><p><strong>Total:</strong> {{total_amount_nok}}<br/><strong>Forskudd betalt:</strong> {{deposit_amount_nok}}<br/><strong>Rest ved henting:</strong> {{remainder_amount_nok}}</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Gå til Min side</a></p>'
WHERE template_key = 'chicken.order.deposit.confirmed.customer';

-- Key admin notifications with clear CTA text
UPDATE email_templates
SET
  subject_no = 'Ny grisordre mottatt - {{order_number}}',
  body_no = '<h2>Ny grisordre</h2><p><strong>Ordre:</strong> {{order_number}}</p><p><strong>Kunde:</strong> {{customer_name}}<br/><strong>E-post:</strong> {{customer_email}}<br/><strong>Telefon:</strong> {{customer_phone}}</p><p><strong>Boks:</strong> {{box_label}}<br/><strong>Ribbe:</strong> {{ribbe_choice}}<br/><strong>Levering:</strong> {{delivery_label}}</p>{{extras_html}}<p><strong>Rabatt:</strong> {{discount_amount_nok}}<br/><strong>Forskudd:</strong> {{deposit_amount_nok}}<br/><strong>Rest:</strong> {{remainder_amount_nok}}<br/><strong>Total:</strong> {{total_amount_nok}}</p><p><a href="{{order_url}}">Åpne ordren i admin</a></p>'
WHERE template_key = 'admin.order.deposit.confirmed.pig';

UPDATE email_templates
SET
  subject_no = 'Ny rugeeggordre mottatt - {{order_number}}',
  body_no = '<h2>Ny rugeeggordre</h2><p><strong>Ordre:</strong> {{order_number}}</p><p><strong>Kunde:</strong> {{customer_name}}<br/><strong>E-post:</strong> {{customer_email}}<br/><strong>Telefon:</strong> {{customer_phone}}</p><p><strong>Rase:</strong> {{breed_name}}<br/><strong>Uke:</strong> {{week_number}}<br/><strong>Levering:</strong> {{delivery_date}}</p><p><strong>Grunnordre:</strong> {{base_quantity}} egg<br/><strong>Tillegg:</strong> {{additions_quantity}} egg<br/><strong>Totalt:</strong> {{total_quantity}} egg</p>{{additions_html}}<p><strong>Pris per egg:</strong> {{price_per_egg_nok}}<br/><strong>Leveringsmåte:</strong> {{delivery_method_label}}</p><p><strong>Forskudd:</strong> {{deposit_amount_nok}}<br/><strong>Rest:</strong> {{remainder_amount_nok}}<br/><strong>Total:</strong> {{total_amount_nok}}</p><p><a href="{{order_url}}">Åpne ordren i admin</a></p>'
WHERE template_key = 'admin.order.deposit.confirmed.egg';

UPDATE email_templates
SET
  subject_no = 'Ny kyllingordre mottatt - {{order_number}}',
  body_no = '<h2>Ny kyllingordre</h2><p><strong>Ordre:</strong> {{order_number}}</p><p><strong>Kunde:</strong> {{customer_name}}<br/><strong>E-post:</strong> {{customer_email}}<br/><strong>Telefon:</strong> {{customer_phone}}</p><p><strong>Rase:</strong> {{breed_name}}<br/><strong>Høner:</strong> {{quantity_hens}}<br/><strong>Haner:</strong> {{quantity_roosters}}<br/><strong>Uke:</strong> {{pickup_week}}<br/><strong>Hentedato:</strong> {{pickup_date}}</p><p><strong>Forskudd:</strong> {{deposit_amount_nok}}<br/><strong>Rest:</strong> {{remainder_amount_nok}}<br/><strong>Total:</strong> {{total_amount_nok}}</p><p><a href="{{order_url}}">Åpne ordren i admin</a></p>'
WHERE template_key = 'admin.order.deposit.confirmed.chicken';

COMMIT;
