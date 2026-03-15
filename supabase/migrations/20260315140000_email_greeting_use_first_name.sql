-- Update all customer-facing email templates to use {{customer_first_name}} in greetings
-- instead of {{customer_name}} (full name). The render.ts auto-derives customer_first_name
-- from customer_name, so no payload changes are needed.

-- Norwegian greetings: "Hei {{customer_name}}," → "Hei {{customer_first_name}},"
UPDATE email_templates
SET body_no = REPLACE(body_no, 'Hei {{customer_name}},', 'Hei {{customer_first_name}},')
WHERE body_no LIKE '%Hei {{customer_name}},%';

-- English greetings: "Hi {{customer_name}}," → "Hi {{customer_first_name}},"
UPDATE email_templates
SET body_en = REPLACE(body_en, 'Hi {{customer_name}},', 'Hi {{customer_first_name}},')
WHERE body_en LIKE '%Hi {{customer_name}},%';

-- Add customer_first_name to the variables JSONB array for templates that have customer_name
-- but not yet customer_first_name
UPDATE email_templates
SET variables = variables || '["customer_first_name"]'::jsonb
WHERE variables ? 'customer_name'
  AND NOT (variables ? 'customer_first_name');
