-- =============================================================================
-- Upgrade post-order email copy quality and consistency (NO/EN)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Pig lifecycle templates
-- -----------------------------------------------------------------------------
UPDATE email_templates
SET
  subject_no = 'Slik fungerer restbetalingen for {{order_number}}',
  subject_en = 'How remainder payment works for {{order_number}}',
  body_no = $$<p>Hei {{customer_name}},</p>
<p>Takk for bestillingen din. Restbetalingen for <strong>{{order_number}}</strong> er <strong>{{remainder_amount_nok}}</strong>.</p>
<p><strong>Forfallsdato (Oslo-tid):</strong> {{due_date}}</p>
<p><strong>Hva skjer nå?</strong><br/>1) Betal restbeløpet innen forfall<br/>2) Vi klargjør bestillingen etter registrert betaling<br/>3) Du får oppdateringer fortløpende på Min side</p>
<p><a href="{{order_url}}">Åpne Min side</a></p>$$,
  body_en = $$<p>Hi {{customer_name}},</p>
<p>Thank you for your order. The remainder for <strong>{{order_number}}</strong> is <strong>{{remainder_amount_nok}}</strong>.</p>
<p><strong>Due date (Oslo time):</strong> {{due_date}}</p>
<p><strong>What happens next?</strong><br/>1) Pay the remaining amount before the deadline<br/>2) We prepare your order once payment is registered<br/>3) You can follow all updates on My Page</p>
<p><a href="{{order_url}}">Open My Page</a></p>$$,
  variables = '["customer_name","order_number","remainder_amount_nok","due_date","order_url"]'::jsonb
WHERE template_key = 'pig.remainder.explainer.full';

UPDATE email_templates
SET
  subject_no = 'Oppdatering for {{order_number}}',
  subject_en = 'Update for {{order_number}}',
  body_no = $$<p>Hei {{customer_name}},</p>
<p>Vi har registrert at restbetalingen for <strong>{{order_number}}</strong> allerede er betalt.</p>
<p><strong>Hva skjer nå?</strong><br/>1) Bestillingen følger vanlig plan videre<br/>2) Du får neste oppdatering når status endres<br/>3) Du kan når som helst se detaljer på Min side</p>
<p><a href="{{order_url}}">Åpne Min side</a></p>$$,
  body_en = $$<p>Hi {{customer_name}},</p>
<p>We have already registered the remainder payment for <strong>{{order_number}}</strong>.</p>
<p><strong>What happens next?</strong><br/>1) Your order continues in the normal process<br/>2) You will receive the next update when status changes<br/>3) You can view all details on My Page</p>
<p><a href="{{order_url}}">Open My Page</a></p>$$,
  variables = '["customer_name","order_number","order_url"]'::jsonb
WHERE template_key = 'pig.remainder.explainer.reduced';

UPDATE email_templates
SET
  subject_no = 'Påminnelse om restbetaling ({{days_left}} dager) - {{order_number}}',
  subject_en = 'Remainder reminder ({{days_left}} days) - {{order_number}}',
  body_no = $$<p>Hei {{customer_name}},</p>
<p>Dette er en vennlig påminnelse om restbetaling for <strong>{{order_number}}</strong>.</p>
<p><strong>Betalingsoversikt:</strong><br/>Restbetaling: {{remainder_amount_nok}}<br/>Forfall (Oslo-tid): {{due_date}}<br/>Tid igjen: {{days_left}} dager</p>
<p><strong>Hva skjer nå?</strong><br/>1) Betal restbeløpet før forfall<br/>2) Vi bekrefter automatisk når betalingen er registrert<br/>3) Du ser oppdatert status på Min side</p>
<p><a href="{{order_url}}">Åpne Min side</a></p>$$,
  body_en = $$<p>Hi {{customer_name}},</p>
<p>This is a friendly reminder for <strong>{{order_number}}</strong>.</p>
<p><strong>Payment snapshot:</strong><br/>Remaining amount: {{remainder_amount_nok}}<br/>Due date (Oslo time): {{due_date}}<br/>Time left: {{days_left}} days</p>
<p><strong>What happens next?</strong><br/>1) Pay the remainder before the deadline<br/>2) We automatically confirm when payment is registered<br/>3) You can follow status on My Page</p>
<p><a href="{{order_url}}">Open My Page</a></p>$$,
  variables = '["customer_name","order_number","remainder_amount_nok","due_date","days_left","order_url"]'::jsonb
WHERE template_key = 'pig.remainder.reminder';

-- -----------------------------------------------------------------------------
-- Egg lifecycle templates
-- -----------------------------------------------------------------------------
UPDATE email_templates
SET
  subject_no = 'Påminnelse om restbetaling ({{days_left}} dager) - {{order_number}}',
  subject_en = 'Remainder reminder ({{days_left}} days) - {{order_number}}',
  body_no = $$<p>Hei {{customer_name}},</p>
<p>Restbetalingen for rugeeggordren <strong>{{order_number}}</strong> gjenstår.</p>
<p><strong>Betalingsoversikt:</strong><br/>Restbetaling: {{remainder_amount_nok}}<br/>Forfall (Oslo-tid): {{due_date}}<br/>Tid igjen: {{days_left}} dager</p>
<p><strong>Hva skjer nå?</strong><br/>1) Betal restbeløpet før fristen<br/>2) Vi bekrefter betalingen automatisk<br/>3) Bestillingen oppdateres videre på Min side</p>
<p><a href="{{order_url}}">Åpne bestillingen på Min side</a></p>$$,
  body_en = $$<p>Hi {{customer_name}},</p>
<p>The remainder for hatching egg order <strong>{{order_number}}</strong> is still outstanding.</p>
<p><strong>Payment snapshot:</strong><br/>Remaining amount: {{remainder_amount_nok}}<br/>Due date (Oslo time): {{due_date}}<br/>Time left: {{days_left}} days</p>
<p><strong>What happens next?</strong><br/>1) Pay the remaining amount before the deadline<br/>2) We confirm payment automatically<br/>3) Your order timeline continues on My Page</p>
<p><a href="{{order_url}}">Open your order on My Page</a></p>$$,
  variables = '["customer_name","order_number","remainder_amount_nok","due_date","days_left","order_url"]'::jsonb
WHERE template_key = 'egg.remainder.reminder';

UPDATE email_templates
SET
  subject_no = 'Levering i morgen - {{order_number}}',
  subject_en = 'Delivery tomorrow - {{order_number}}',
  body_no = $$<p>Hei {{customer_name}},</p>
<p>Rugeeggordren <strong>{{order_number}}</strong> går til utsending i morgen.</p>
<p><strong>Leveringsoversikt:</strong><br/>Planlagt dato: {{delivery_date}} (Oslo-tid)</p>
<p><strong>Hva skjer nå?</strong><br/>1) Ønsker du tillegg, gjør det i dag<br/>2) Vi pakker og sender ordren i morgen<br/>3) Du får bekreftelse når den er sendt</p>
<p><a href="{{upsell_url}}">Legg til ekstra i dag</a><br/><a href="{{order_url}}">Se bestillingen på Min side</a></p>$$,
  body_en = $$<p>Hi {{customer_name}},</p>
<p>Your hatching egg order <strong>{{order_number}}</strong> is scheduled for shipment tomorrow.</p>
<p><strong>Delivery snapshot:</strong><br/>Planned date: {{delivery_date}} (Oslo time)</p>
<p><strong>What happens next?</strong><br/>1) Add extras today if needed<br/>2) We pack and ship tomorrow<br/>3) You receive a shipping confirmation afterwards</p>
<p><a href="{{upsell_url}}">Add extras today</a><br/><a href="{{order_url}}">View order on My Page</a></p>$$,
  variables = '["customer_name","order_number","upsell_url","delivery_date","order_url"]'::jsonb
WHERE template_key = 'egg.delivery.day_before';

UPDATE email_templates
SET
  subject_no = 'Rugeeggene er sendt - {{order_number}}',
  subject_en = 'Your hatching eggs are on the way - {{order_number}}',
  body_no = $$<p>Hei {{customer_name}},</p>
<p>Vi har sendt bestillingen din <strong>{{order_number}}</strong> med Posten.</p>
<p><strong>Sporingsnummer:</strong> {{tracking_number}}<br/><a href="{{tracking_url}}">Spor pakken hos Posten</a></p>
<p><strong>Ordrelinjer:</strong></p>{{order_lines_html}}
<p><strong>Betalingsoversikt:</strong><br/>Total: {{total_amount_nok}}<br/>Forskudd: {{deposit_amount_nok}}<br/>Rest: {{remainder_amount_nok}}</p>
<p><strong>Leveringsoversikt:</strong><br/>Uke {{delivery_week}} ({{delivery_date}})</p>
<p><strong>Hva skjer nå?</strong><br/>1) Følg sporingen hos Posten<br/>2) Kontroller eggene ved mottak<br/>3) Gå til Min side hvis du trenger hjelp</p>
<p><a href="{{order_url}}">Åpne bestillingen på Min side</a></p>$$,
  body_en = $$<p>Hi {{customer_name}},</p>
<p>Your order <strong>{{order_number}}</strong> has been shipped with Posten.</p>
<p><strong>Tracking number:</strong> {{tracking_number}}<br/><a href="{{tracking_url}}">Track your parcel</a></p>
<p><strong>Order lines:</strong></p>{{order_lines_html}}
<p><strong>Payment snapshot:</strong><br/>Total: {{total_amount_nok}}<br/>Deposit: {{deposit_amount_nok}}<br/>Remaining: {{remainder_amount_nok}}</p>
<p><strong>Delivery snapshot:</strong><br/>Week {{delivery_week}} ({{delivery_date}})</p>
<p><strong>What happens next?</strong><br/>1) Track the parcel<br/>2) Check the eggs on arrival<br/>3) Use My Page if you need help</p>
<p><a href="{{order_url}}">Open your order on My Page</a></p>$$,
  variables = '["customer_name","order_number","tracking_number","tracking_url","order_lines_html","total_quantity","total_amount_nok","deposit_amount_nok","remainder_amount_nok","delivery_week","delivery_date","order_url"]'::jsonb
WHERE template_key = 'egg.order.shipped.customer';

UPDATE email_templates
SET
  subject_no = 'Lykke til med klekkingen - {{order_number}}',
  subject_en = 'Happy hatching - {{order_number}}',
  body_no = $$<p>Hei {{customer_name}},</p>
<p>Vi håper klekkingen går fint for <strong>{{order_number}}</strong>.</p>
<p>Har du spørsmål underveis, send oss gjerne en melding via nettsiden.</p>
<p><a href="{{message_url}}">Send melding på Min side</a></p>
<p><strong>Hva skjer nå?</strong><br/>1) Følg med på klekkingen de neste dagene<br/>2) Kontakt oss hvis du trenger råd underveis<br/>3) Vi svarer raskt via Min side</p>
<hr/>
<p><strong>Tilbud fra Tinglum Gård:</strong> Du får <strong>10% rabatt på forskuddet</strong> på valgfri Mangalitsa-kasse med koden <strong>{{deposit_discount_code}}</strong>.</p>
<p><a href="{{pork_url}}">Se Mangalitsa-kasser</a></p>
<p><strong>Vennerrabatt for Mangalitsa-kasser:</strong> Del vennerrabattkoden din. Hver venn får 20% på forskuddet, og du får 20% rabatt på restbeløpet per venn, opptil 50% på din egen kasse.</p>$$,
  body_en = $$<p>Hi {{customer_name}},</p>
<p>We hope your hatch is going well for <strong>{{order_number}}</strong>.</p>
<p>If you have any questions, send us a message through the website.</p>
<p><a href="{{message_url}}">Send a message on My Page</a></p>
<p><strong>What happens next?</strong><br/>1) Monitor the hatch progress over the next few days<br/>2) Contact us if you need practical guidance<br/>3) We reply quickly through My Page</p>
<hr/>
<p><strong>Special offer from Tinglum Gård:</strong> Get <strong>10% off your deposit</strong> on any Mangalitsa box with code <strong>{{deposit_discount_code}}</strong>.</p>
<p><a href="{{pork_url}}">Explore Mangalitsa boxes</a></p>
<p><strong>Referral discount for Mangalitsa boxes:</strong> Share your referral code. Each friend gets 20% on their deposit, and you get 20% off your remainder per friend, up to 50% on your own box.</p>$$,
  variables = '["customer_name","order_number","message_url","pork_url","deposit_discount_code"]'::jsonb
WHERE template_key = 'egg.hatch.followup';

UPDATE email_templates
SET
  subject_no = 'Bestillingen er kansellert - {{order_number}}',
  subject_en = 'Order cancelled - {{order_number}}',
  body_no = $$<p>Hei {{customer_name}},</p>
<p>Bestillingen <strong>{{order_number}}</strong> er kansellert fordi restbetalingen ikke ble registrert innen fristen.</p>
<p><strong>Hva skjer nå?</strong><br/>1) Ordren er lukket og reservasjonen frigitt<br/>2) Du kan legge inn ny bestilling hvis det finnes kapasitet<br/>3) Se detaljer og videre valg på Min side</p>
<p><a href="{{order_url}}">Se detaljer på Min side</a></p>$$,
  body_en = $$<p>Hi {{customer_name}},</p>
<p>Order <strong>{{order_number}}</strong> was cancelled because the remainder was not registered before the deadline.</p>
<p><strong>What happens next?</strong><br/>1) The order is closed and the reservation is released<br/>2) You can place a new order if capacity is available<br/>3) See details and next options on My Page</p>
<p><a href="{{order_url}}">View details on My Page</a></p>$$,
  variables = '["customer_name","order_number","order_url"]'::jsonb
WHERE template_key = 'egg.order.forfeited';

-- -----------------------------------------------------------------------------
-- Chicken lifecycle templates
-- -----------------------------------------------------------------------------
UPDATE email_templates
SET
  subject_no = 'Kyllingene er klare for henting - {{order_number}}',
  subject_en = 'Chickens ready for pickup - {{order_number}}',
  body_no = $$<p>Hei {{customer_name}},</p>
<p>Bestilling <strong>{{order_number}}</strong> er klar for henting.</p>
<p><strong>Henteoversikt:</strong><br/>Hentedato: {{pickup_date}}<br/>Restbetaling ved henting: {{remainder_amount_nok}}</p>
<p><strong>Hva skjer nå?</strong><br/>1) Møt opp til avtalt hentetid<br/>2) Restbetaling registreres ved henting<br/>3) Du finner all status på Min side</p>
<p><a href="{{order_url}}">Se detaljer på Min side</a></p>$$,
  body_en = $$<p>Hi {{customer_name}},</p>
<p>Order <strong>{{order_number}}</strong> is ready for pickup.</p>
<p><strong>Pickup snapshot:</strong><br/>Pickup date: {{pickup_date}}<br/>Remaining payment at pickup: {{remainder_amount_nok}}</p>
<p><strong>What happens next?</strong><br/>1) Arrive at the agreed pickup time<br/>2) Remaining payment is registered at pickup<br/>3) You can follow status on My Page</p>
<p><a href="{{order_url}}">View details on My Page</a></p>$$,
  variables = '["customer_name","order_number","pickup_date","remainder_amount_nok","order_url"]'::jsonb
WHERE template_key = 'chicken.ready_for_pickup';

UPDATE email_templates
SET
  subject_no = 'Påminnelse om henting ({{days_left}} dager) - {{order_number}}',
  subject_en = 'Pickup reminder ({{days_left}} days) - {{order_number}}',
  body_no = $$<p>Hei {{customer_name}},</p>
<p>Dette er en påminnelse om henting for <strong>{{order_number}}</strong>.</p>
<p><strong>Henteoversikt:</strong><br/>Hentedato: {{pickup_date}} ({{days_left}} dager igjen)<br/>Restbetaling ved henting: {{remainder_amount_nok}}</p>
<p><strong>Hva skjer nå?</strong><br/>1) Bekreft at du kan hente på datoen<br/>2) Ta med informasjonen du trenger for overlevering<br/>3) Se oppdateringer på Min side</p>
<p><a href="{{order_url}}">Se detaljer på Min side</a></p>$$,
  body_en = $$<p>Hi {{customer_name}},</p>
<p>This is a pickup reminder for <strong>{{order_number}}</strong>.</p>
<p><strong>Pickup snapshot:</strong><br/>Pickup date: {{pickup_date}} ({{days_left}} days left)<br/>Remaining payment at pickup: {{remainder_amount_nok}}</p>
<p><strong>What happens next?</strong><br/>1) Confirm you can collect on the date<br/>2) Bring the information needed for handover<br/>3) Follow updates on My Page</p>
<p><a href="{{order_url}}">View details on My Page</a></p>$$,
  variables = '["customer_name","order_number","pickup_date","days_left","remainder_amount_nok","order_url"]'::jsonb
WHERE template_key = 'chicken.pickup.reminder';

UPDATE email_templates
SET
  subject_no = 'Kvittering for restbetaling - {{order_number}}',
  subject_en = 'Receipt for remainder payment - {{order_number}}',
  body_no = $$<p>Hei {{customer_name}},</p>
<p>Restbetalingen for <strong>{{order_number}}</strong> er registrert ved henting.</p>
<p><strong>Betalingsoversikt:</strong><br/>Registrert beløp: {{remainder_amount_nok}}</p>
<p><strong>Hva skjer nå?</strong><br/>1) Bestillingen står som ferdig betalt<br/>2) Eventuelle videre oppdateringer vises på Min side<br/>3) Ta kontakt hvis noe må korrigeres</p>
<p><a href="{{order_url}}">Se bestillingen på Min side</a></p>$$,
  body_en = $$<p>Hi {{customer_name}},</p>
<p>The remainder payment for <strong>{{order_number}}</strong> was registered at pickup.</p>
<p><strong>Payment snapshot:</strong><br/>Registered amount: {{remainder_amount_nok}}</p>
<p><strong>What happens next?</strong><br/>1) Your order is marked as fully paid<br/>2) Any further updates are shown on My Page<br/>3) Contact us if anything needs correction</p>
<p><a href="{{order_url}}">View your order on My Page</a></p>$$,
  variables = '["customer_name","order_number","remainder_amount_nok","order_url"]'::jsonb
WHERE template_key = 'chicken.remainder.collected';

-- -----------------------------------------------------------------------------
-- Core customer confirmation templates (deposit + remainder)
-- -----------------------------------------------------------------------------
UPDATE email_templates
SET
  subject_no = 'Bestilling bekreftet - {{order_number}}',
  subject_en = 'Order confirmed - {{order_number}}',
  body_no = $$<h2>Bestilling bekreftet</h2>
<p>Hei {{customer_name}},</p>
<p>Vi har mottatt forskuddet for <strong>{{order_number}}</strong>.</p>
<p><strong>Ordreinnhold:</strong><br/>Boks: {{box_label}}<br/>Ribbevalg: {{ribbe_choice}}</p>
{{extras_html}}
{{discount_html}}
<p><strong>Betalingsoversikt:</strong><br/>Total: {{total_amount_nok}}<br/>Forskudd betalt: {{deposit_amount_nok}}<br/>Restbetaling: {{remainder_amount_nok}}</p>
<p><strong>Leveringsoversikt:</strong><br/>{{delivery_label}}</p>
<p><strong>Hva skjer nå?</strong><br/>1) Vi følger opp bestillingen videre<br/>2) Du får påminnelse før restforfall<br/>3) Du finner all status på Min side</p>
<p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Åpne Min side</a></p>$$,
  body_en = $$<h2>Order confirmed</h2>
<p>Hi {{customer_name}},</p>
<p>We have received the deposit for <strong>{{order_number}}</strong>.</p>
<p><strong>Order content:</strong><br/>Box: {{box_label}}<br/>Rib option: {{ribbe_choice}}</p>
{{extras_html}}
{{discount_html}}
<p><strong>Payment snapshot:</strong><br/>Total: {{total_amount_nok}}<br/>Deposit paid: {{deposit_amount_nok}}<br/>Remaining: {{remainder_amount_nok}}</p>
<p><strong>Delivery snapshot:</strong><br/>{{delivery_label}}</p>
<p><strong>What happens next?</strong><br/>1) We continue processing your order<br/>2) You receive reminders before remainder due date<br/>3) You can follow all updates on My Page</p>
<p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Open My Page</a></p>$$
WHERE template_key = 'pig.order.deposit.confirmed.customer';

UPDATE email_templates
SET
  subject_no = 'Bestilling bekreftet - {{order_number}}',
  subject_en = 'Order confirmed - {{order_number}}',
  body_no = $$<h2>Bestilling bekreftet</h2>
<p>Hei {{customer_name}},</p>
<p>Vi har mottatt forskuddet for rugeeggordren <strong>{{order_number}}</strong>.</p>
<p><strong>Ordreinnhold:</strong><br/>Rase: {{breed_name}}<br/>Uke: {{week_number}}<br/>Grunnordre: {{base_quantity}} egg<br/>Tillegg: {{additions_quantity}} egg<br/>Totalt: {{total_quantity}} egg</p>
{{additions_html}}
<p><strong>Betalingsoversikt:</strong><br/>Total: {{total_amount_nok}}<br/>Forskudd betalt: {{deposit_amount_nok}}<br/>Restbetaling: {{remainder_amount_nok}}</p>
<p><strong>Hva skjer nå?</strong><br/>1) Vi holder kapasiteten avsatt til ordren din<br/>2) Du får restpåminnelser etter oppsatt plan<br/>3) Du kan følge bestillingen på Min side</p>
<p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Åpne Min side</a></p>$$,
  body_en = $$<h2>Order confirmed</h2>
<p>Hi {{customer_name}},</p>
<p>We have received the deposit for hatching egg order <strong>{{order_number}}</strong>.</p>
<p><strong>Order content:</strong><br/>Breed: {{breed_name}}<br/>Week: {{week_number}}<br/>Base order: {{base_quantity}} eggs<br/>Added lines: {{additions_quantity}} eggs<br/>Total: {{total_quantity}} eggs</p>
{{additions_html}}
<p><strong>Payment snapshot:</strong><br/>Total: {{total_amount_nok}}<br/>Deposit paid: {{deposit_amount_nok}}<br/>Remaining: {{remainder_amount_nok}}</p>
<p><strong>What happens next?</strong><br/>1) We keep your reserved capacity<br/>2) You receive remainder reminders based on schedule<br/>3) You can follow the order on My Page</p>
<p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Open My Page</a></p>$$
WHERE template_key = 'egg.order.deposit.confirmed.customer';

UPDATE email_templates
SET
  subject_no = 'Bestilling bekreftet - {{order_number}}',
  subject_en = 'Order confirmed - {{order_number}}',
  body_no = $$<h2>Bestilling bekreftet</h2>
<p>Hei {{customer_name}},</p>
<p>Forskuddet er mottatt for <strong>{{order_number}}</strong>.</p>
<p><strong>Ordrelinjer:</strong></p>{{order_lines_html}}
<p><strong>Betalingsoversikt:</strong><br/>Total: {{total_amount_nok}}<br/>Forskudd betalt: {{deposit_amount_nok}}<br/>Rest ved henting: {{remainder_amount_nok}}</p>
<p><strong>Leveringsoversikt:</strong><br/>Hentedato: {{pickup_date}}<br/>Metode: {{delivery_label}}</p>
<p><strong>Hva skjer nå?</strong><br/>1) Vi sender varsler før henting<br/>2) Restbetaling registreres ved henting<br/>3) Du følger alt på Min side</p>
<p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Åpne Min side</a></p>$$,
  body_en = $$<h2>Order confirmed</h2>
<p>Hi {{customer_name}},</p>
<p>The deposit has been received for <strong>{{order_number}}</strong>.</p>
<p><strong>Order lines:</strong></p>{{order_lines_html_en}}
<p><strong>Payment snapshot:</strong><br/>Total: {{total_amount_nok}}<br/>Deposit paid: {{deposit_amount_nok}}<br/>Remaining at pickup: {{remainder_amount_nok}}</p>
<p><strong>Delivery snapshot:</strong><br/>Pickup date: {{pickup_date}}<br/>Method: {{delivery_label}}</p>
<p><strong>What happens next?</strong><br/>1) We send reminders before pickup<br/>2) Remaining payment is registered at pickup<br/>3) You can follow everything on My Page</p>
<p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Open My Page</a></p>$$,
  variables = '["customer_name","order_number","breed_name","quantity_hens","quantity_roosters","total_birds_label","total_birds_label_en","order_lines_html","order_lines_html_en","pickup_date","delivery_label","total_amount_nok","deposit_amount_nok","remainder_amount_nok","order_url"]'::jsonb
WHERE template_key = 'chicken.order.deposit.confirmed.customer';

UPDATE email_templates
SET
  subject_no = 'Betaling fullført - {{order_number}}',
  subject_en = 'Payment completed - {{order_number}}',
  body_no = $$<h2>Betaling fullført</h2>
<p>Hei {{customer_name}},</p>
<p>Vi har mottatt restbetalingen for <strong>{{order_number}}</strong>.</p>
<p><strong>Betalingsoversikt:</strong><br/>Total betalt: {{total_amount_nok}}</p>
<p><strong>Leveringsoversikt:</strong><br/>{{delivery_label}}</p>
<p><strong>Hva skjer nå?</strong><br/>1) Ordren går videre til neste produksjonssteg<br/>2) Du får ny oppdatering når status endres<br/>3) Se detaljer på Min side</p>
<p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Se bestillingen</a></p>$$,
  body_en = $$<h2>Payment completed</h2>
<p>Hi {{customer_name}},</p>
<p>We have received the remainder payment for <strong>{{order_number}}</strong>.</p>
<p><strong>Payment snapshot:</strong><br/>Total paid: {{total_amount_nok}}</p>
<p><strong>Delivery snapshot:</strong><br/>{{delivery_label}}</p>
<p><strong>What happens next?</strong><br/>1) The order moves to the next production step<br/>2) You receive another update when status changes<br/>3) View details on My Page</p>
<p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">View order</a></p>$$
WHERE template_key = 'pig.order.remainder.paid.customer';

UPDATE email_templates
SET
  subject_no = 'Betaling fullført - {{order_number}}',
  subject_en = 'Payment completed - {{order_number}}',
  body_no = $$<h2>Betaling fullført</h2>
<p>Hei {{customer_name}},</p>
<p>Vi har mottatt restbetalingen for <strong>{{order_number}}</strong>.</p>
<p><strong>Ordreinnhold:</strong><br/>Grunnordre: {{base_quantity}} egg<br/>Tillegg: {{additions_quantity}} egg<br/>Totalt: {{total_quantity}} egg</p>
{{additions_html}}
<p><strong>Betalingsoversikt:</strong><br/>Total betalt: {{total_amount_nok}}<br/>Rest registrert: {{remainder_amount_nok}}</p>
<p><strong>Hva skjer nå?</strong><br/>1) Ordren går videre til klargjøring/utsending<br/>2) Du får beskjed når pakken sendes<br/>3) Se full status på Min side</p>
<p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Se bestillingen</a></p>$$,
  body_en = $$<h2>Payment completed</h2>
<p>Hi {{customer_name}},</p>
<p>We have received the remainder payment for <strong>{{order_number}}</strong>.</p>
<p><strong>Order content:</strong><br/>Base order: {{base_quantity}} eggs<br/>Added lines: {{additions_quantity}} eggs<br/>Total: {{total_quantity}} eggs</p>
{{additions_html}}
<p><strong>Payment snapshot:</strong><br/>Total paid: {{total_amount_nok}}<br/>Registered remainder: {{remainder_amount_nok}}</p>
<p><strong>What happens next?</strong><br/>1) The order moves to preparation/shipping<br/>2) You are notified when the parcel is shipped<br/>3) View full status on My Page</p>
<p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">View order</a></p>$$
WHERE template_key = 'egg.order.remainder.paid.customer';

UPDATE email_templates
SET
  subject_no = 'Betaling fullført - {{order_number}}',
  subject_en = 'Payment completed - {{order_number}}',
  body_no = $$<h2>Betaling fullført</h2>
<p>Hei {{customer_name}},</p>
<p>Vi har registrert betalingen for <strong>{{order_number}}</strong>.</p>
<p><strong>Betalingsoversikt:</strong><br/>Total betalt: {{total_amount_nok}}</p>
<p><strong>Leveringsoversikt:</strong><br/>Hentedato: {{pickup_date}}</p>
<p><strong>Hva skjer nå?</strong><br/>1) Bestillingen er ferdig betalt<br/>2) Du får videre status ved behov<br/>3) Se detaljer på Min side</p>
<p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Se bestillingen</a></p>$$,
  body_en = $$<h2>Payment completed</h2>
<p>Hi {{customer_name}},</p>
<p>We have registered the payment for <strong>{{order_number}}</strong>.</p>
<p><strong>Payment snapshot:</strong><br/>Total paid: {{total_amount_nok}}</p>
<p><strong>Pickup snapshot:</strong><br/>Pickup date: {{pickup_date}}</p>
<p><strong>What happens next?</strong><br/>1) The order is now fully paid<br/>2) You receive further updates when needed<br/>3) View details on My Page</p>
<p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">View order</a></p>$$
WHERE template_key = 'chicken.order.remainder.paid.customer';

-- -----------------------------------------------------------------------------
-- Admin confirmation templates (clearer line details + deep-link CTA)
-- -----------------------------------------------------------------------------
UPDATE email_templates
SET
  body_no = $$<h2>Ny kyllingordre</h2>
<p><strong>Ordre:</strong> {{order_number}}</p>
<p><strong>Kunde:</strong> {{customer_name}}<br/><strong>E-post:</strong> {{customer_email}}<br/><strong>Telefon:</strong> {{customer_phone}}</p>
<p><strong>Ordrelinjer:</strong></p>{{order_lines_html}}
<p><strong>Henting:</strong> Uke {{pickup_week}} ({{pickup_date}})</p>
<p><strong>Betalingsoversikt:</strong><br/>Forskudd: {{deposit_amount_nok}}<br/>Rest: {{remainder_amount_nok}}<br/>Total: {{total_amount_nok}}</p>
<p><a href="{{order_url}}">Åpne ordren i admin</a></p>$$,
  body_en = $$<h2>New chicken order</h2>
<p><strong>Order:</strong> {{order_number}}</p>
<p><strong>Customer:</strong> {{customer_name}}<br/><strong>Email:</strong> {{customer_email}}<br/><strong>Phone:</strong> {{customer_phone}}</p>
<p><strong>Order lines:</strong></p>{{order_lines_html_en}}
<p><strong>Pickup:</strong> Week {{pickup_week}} ({{pickup_date}})</p>
<p><strong>Payment snapshot:</strong><br/>Deposit: {{deposit_amount_nok}}<br/>Remaining: {{remainder_amount_nok}}<br/>Total: {{total_amount_nok}}</p>
<p><a href="{{order_url}}">Open order in admin</a></p>$$,
  variables = '["order_number","customer_name","customer_email","customer_phone","breed_name","quantity_hens","quantity_roosters","total_birds_label","total_birds_label_en","order_lines_html","order_lines_html_en","pickup_week","pickup_date","deposit_amount_nok","remainder_amount_nok","total_amount_nok","order_url"]'::jsonb
WHERE template_key = 'admin.order.deposit.confirmed.chicken';

COMMIT;
