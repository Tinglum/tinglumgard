-- Fix egg.delivery.day_before subject to say "on the way" instead of "delivery tomorrow"
UPDATE email_templates SET
  subject_no = 'Rugeeggene dine er på vei! – {{order_number}}',
  subject_en = 'Your hatching eggs are on the way! – {{order_number}}'
WHERE template_key = 'egg.delivery.day_before';
