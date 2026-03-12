-- =============================================================================
-- Seed managed email templates for egg wishlist v2
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
  active,
  current_version
)
VALUES
  (
    'wishlist.received',
    'transactional',
    'eggs',
    'Ønskeliste mottatt - uke {{week_number}}',
    'Wishlist received - week {{week_number}}',
    '<h2>Ønskeliste registrert</h2><p>Hei {{customer_name}},</p><p>Vi har registrert ønskelisten din for uke {{week_number}} ({{delivery_date}}).</p>{{wishlist_lines_html}}<p>Dette er en best effort-forespørsel. Vi oppdaterer deg hvis vi kan tildele ekstra egg.</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Åpne Min side</a></p>',
    '<h2>Wishlist registered</h2><p>Hi {{customer_name}},</p><p>We have registered your wishlist for week {{week_number}} ({{delivery_date}}).</p>{{wishlist_lines_html}}<p>This is a best-effort request. We will update you if we can allocate extra eggs.</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Open My Page</a></p>',
    '["customer_name","week_number","delivery_date","wishlist_lines_html","order_url"]'::jsonb,
    true,
    1
  ),
  (
    'wishlist.allocated',
    'transactional',
    'eggs',
    'Ekstra egg tildelt - uke {{week_number}}',
    'Extra eggs allocated - week {{week_number}}',
    '<h2>Ekstra egg er tildelt</h2><p>Hei {{customer_name}},</p><p>Vi har tildelt ekstra egg for uke {{week_number}} ({{delivery_date}}).</p>{{allocated_lines_html}}<p>Hvis ønsket er knyttet til en ordre, kan admin legge linjene inn i ordren din. Du ser oppdatert status på Min side.</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Åpne Min side</a></p>',
    '<h2>Extra eggs allocated</h2><p>Hi {{customer_name}},</p><p>We have allocated extra eggs for week {{week_number}} ({{delivery_date}}).</p>{{allocated_lines_html}}<p>If this request is linked to an order, admin can add the lines to your order. You can view status on My Page.</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Open My Page</a></p>',
    '["customer_name","week_number","delivery_date","allocated_lines_html","order_url"]'::jsonb,
    true,
    1
  ),
  (
    'wishlist.not_allocated',
    'transactional',
    'eggs',
    'Oppdatering på ønskelisten - uke {{week_number}}',
    'Wishlist update - week {{week_number}}',
    '<h2>Ingen ekstra egg denne gangen</h2><p>Hei {{customer_name}},</p><p>Vi fikk dessverre ikke tildelt ekstra egg for uke {{week_number}} ({{delivery_date}}).</p><p>Du kan legge inn ny ønskeliste for kommende uker når du ønsker.</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Åpne Min side</a></p>',
    '<h2>No extra eggs this time</h2><p>Hi {{customer_name}},</p><p>Unfortunately, we could not allocate extra eggs for week {{week_number}} ({{delivery_date}}).</p><p>You can submit a new wishlist for upcoming weeks at any time.</p><p><a href="{{order_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Open My Page</a></p>',
    '["customer_name","week_number","delivery_date","order_url"]'::jsonb,
    true,
    1
  )
ON CONFLICT (template_key) DO NOTHING;

WITH managed_keys AS (
  SELECT unnest(ARRAY[
    'wishlist.received',
    'wishlist.allocated',
    'wishlist.not_allocated'
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
  'Seeded egg wishlist v2 templates',
  'migration'
FROM email_templates t
JOIN managed_keys k ON k.template_key = t.template_key
LEFT JOIN email_template_versions v ON v.template_id = t.id AND v.version = 1
WHERE v.id IS NULL;
