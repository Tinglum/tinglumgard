BEGIN;

UPDATE email_templates
SET
  body_no = replace(
    body_no,
    '<li>La eggene hvile og temperere før du legger dem i rugemaskinen.</li>',
    '<li>La eggene hvile i romtemperatur i minst 12 timer, gjerne 12-24 timer etter transport, før du legger dem i rugemaskinen.</li>'
  ),
  body_en = replace(
    body_en,
    '<li>Let the eggs rest and warm up gently before putting them in the incubator.</li>',
    '<li>Let the eggs rest at room temperature for at least 12 hours, preferably 12-24 hours after transport, before setting them in the incubator.</li>'
  ),
  updated_at = now()
WHERE template_key = 'egg.order.shipped.customer';

UPDATE email_templates
SET
  body_no = replace(
    body_no,
    '<li>La eggene hvile og temperere før oppstart.</li>',
    '<li>La eggene hvile i romtemperatur i minst 12 timer, gjerne 12-24 timer etter transport, før oppstart.</li>'
  ),
  body_en = replace(
    body_en,
    '<li>Let the eggs rest and warm up gently before setting them.</li>',
    '<li>Let the eggs rest at room temperature for at least 12 hours, preferably 12-24 hours after transport, before setting them.</li>'
  ),
  updated_at = now()
WHERE template_key = 'egg.delivery.day_before';

COMMIT;
