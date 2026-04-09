-- Remove thread_id / reference numbers from customer-facing email templates.
-- Admin-facing templates keep the thread_id for internal tracking.

-- 1. support.message.customer.confirmation — subject
UPDATE email_templates SET
  subject_no = 'Melding mottatt - {{subject_line}}',
  subject_en = 'Message received - {{subject_line}}'
WHERE template_key = 'support.message.customer.confirmation';

-- 2. support.message.customer.confirmation — body (remove "sak {{thread_id}}")
UPDATE email_templates SET
  body_no = REPLACE(body_no, ' (sak {{thread_id}})', ''),
  body_en = REPLACE(body_en, ' (case {{thread_id}})', '')
WHERE template_key = 'support.message.customer.confirmation';

-- 3. support.reply.customer.notification — subject
UPDATE email_templates SET
  subject_no = 'Svar på: {{subject_line}}',
  subject_en = 'Reply: {{subject_line}}'
WHERE template_key = 'support.reply.customer.notification';

-- 4. support.contact.customer.confirmation — remove order_number from subject
-- (This template doesn't have thread_id but uses order_number which is also a reference)
-- Keeping as-is since it refers to an actual order, not a ticket number.
