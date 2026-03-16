-- =============================================================================
-- Fix "Hva skjer nå?" step 2 in deposit confirmation templates
-- Previously said "Du får restpåminnelser etter oppsatt plan" which makes no
-- sense when the order is fully paid, and is confusing even when there is a
-- remainder. Changed to delivery-focused messaging.
-- Also fixes pig deposit confirmation step 2 ("Du får påminnelse før restforfall").
-- =============================================================================

BEGIN;

-- ─── egg.order.deposit.confirmed.customer ────────────────────────────────────
-- Norwegian body: step 2 "Du får restpåminnelser etter oppsatt plan" → "Du får beskjed når eggene sendes"
UPDATE email_templates
SET body_no = REPLACE(
  body_no,
  'Du f&aring;r restp&aring;minnelser etter oppsatt plan',
  'Du f&aring;r beskjed n&aring;r eggene er klare for sending'
),
body_en = REPLACE(
  body_en,
  'You receive remainder reminders on schedule',
  'You will be notified when the eggs are ready to ship'
)
WHERE template_key = 'egg.order.deposit.confirmed.customer';

-- ─── pig.order.deposit.confirmed.customer ────────────────────────────────────
-- Norwegian body: step 2 "Du får påminnelse før restforfall" → "Du får beskjed når ordren nærmer seg"
UPDATE email_templates
SET body_no = REPLACE(
  body_no,
  'Du f&aring;r p&aring;minnelse f&oslash;r restforfall',
  'Du f&aring;r beskjed n&aring;r ordren n&aelig;rmer seg levering'
),
body_en = REPLACE(
  body_en,
  'You receive a reminder before remainder due',
  'You will be notified as your order approaches delivery'
)
WHERE template_key = 'pig.order.deposit.confirmed.customer';

-- ─── chicken.order.deposit.confirmed.customer ────────────────────────────────
-- Step 2 "Restbetaling registreres ved henting" → "Eventuell rest betales ved henting"
UPDATE email_templates
SET body_no = REPLACE(
  body_no,
  'Restbetaling registreres ved henting',
  'Eventuell rest betales ved henting'
),
body_en = REPLACE(
  body_en,
  'Remainder payment collected at pickup',
  'Any remaining balance is paid at pickup'
)
WHERE template_key = 'chicken.order.deposit.confirmed.customer';

COMMIT;
