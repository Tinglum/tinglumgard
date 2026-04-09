-- Remove visible case/thread wording from all support emails.
-- Hidden threading continues through headers and internal thread ids.

UPDATE email_templates
SET
  subject_no = 'Melding mottatt - {{subject_line}}',
  subject_en = 'Message received - {{subject_line}}',
  body_no = REPLACE(body_no, 'Vi har mottatt meldingen din (sak {{thread_id}}).', 'Vi har mottatt meldingen din.'),
  body_en = REPLACE(body_en, 'We have received your message (case {{thread_id}}).', 'We have received your message.')
WHERE template_key = 'support.message.customer.confirmation';

UPDATE email_templates
SET
  subject_no = 'Svar fra Tinglum Gård - {{subject_line}}',
  subject_en = 'Reply from Tinglum Gard - {{subject_line}}',
  body_no = REPLACE(body_no, '{{admin_name}} har svart p&aring; saken din ({{thread_id}}).', '{{admin_name}} har svart.'),
  body_en = REPLACE(body_en, '{{admin_name}} has replied to your case ({{thread_id}}).', '{{admin_name}} has replied.')
WHERE template_key = 'support.reply.customer.notification';

UPDATE email_templates
SET
  subject_no = REPLACE(subject_no, '[{{thread_id}}] ', ''),
  subject_en = REPLACE(subject_en, '[{{thread_id}}] ', ''),
  body_no = REPLACE(
    REPLACE(body_no, '{{admin_name}} har sendt deg en melding fra Tinglum Gård (sak {{thread_id}}).', '{{admin_name}} har sendt deg en melding fra Tinglum Gård.'),
    'åpne saken i {{portal_label}}',
    'åpne meldingen i {{portal_label}}'
  ),
  body_en = REPLACE(
    REPLACE(body_en, '{{admin_name}} has sent you a message from Tinglum Gard (case {{thread_id}}).', '{{admin_name}} has sent you a message from Tinglum Gard.'),
    'open the thread in {{portal_label}}',
    'open the message in {{portal_label}}'
  )
WHERE template_key = 'support.message.customer.admin_initiated';

UPDATE email_templates
SET
  subject_no = 'Ny melding fra {{customer_name}} - {{subject_line}}',
  subject_en = 'New message from {{customer_name}} - {{subject_line}}',
  body_no = REPLACE(body_no, 'Ny melding fra {{customer_name}} (sak {{thread_id}}).', 'Ny melding fra {{customer_name}}.'),
  body_en = REPLACE(body_en, 'New message from {{customer_name}} (case {{thread_id}}).', 'New message from {{customer_name}}.')
WHERE template_key = 'support.message.admin.new';

UPDATE email_templates
SET
  subject_no = 'Svar fra {{customer_name}} - {{subject_line}}',
  subject_en = 'Reply from {{customer_name}} - {{subject_line}}',
  body_no = REPLACE(body_no, 'Svar fra {{customer_name}} p&aring; sak {{thread_id}}.', 'Svar fra {{customer_name}}.'),
  body_en = REPLACE(body_en, 'Reply from {{customer_name}} on case {{thread_id}}.', 'Reply from {{customer_name}}.')
WHERE template_key = 'support.reply.admin.notification';
