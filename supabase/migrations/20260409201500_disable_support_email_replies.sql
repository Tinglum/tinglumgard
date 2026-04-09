-- Support/message emails are notification-only by email.
-- Customers and admins should continue the conversation inside the app.

UPDATE email_templates
SET
  body_no = REPLACE(
    body_no,
    'Du kan svare direkte på denne e-posten, eller gå til <a href="{{portal_url}}">{{portal_label}}</a>.',
    'For å svare på meldingen, logg inn på <a href="{{portal_url}}">{{portal_label}}</a>.'
  ),
  body_en = REPLACE(
    body_en,
    'You can reply directly to this email, or visit <a href="{{portal_url}}">{{portal_label}}</a>.',
    'To reply to the message, sign in to <a href="{{portal_url}}">{{portal_label}}</a>.'
  )
WHERE template_key = 'support.message.customer.confirmation';

UPDATE email_templates
SET
  body_no = REPLACE(
    body_no,
    'Du kan svare direkte på denne e-posten, eller gå til <a href="{{portal_url}}">{{portal_label}}</a>.',
    'For å svare på meldingen, logg inn på <a href="{{portal_url}}">{{portal_label}}</a>.'
  ),
  body_en = REPLACE(
    body_en,
    'You can reply directly to this email, or visit <a href="{{portal_url}}">{{portal_label}}</a>.',
    'To reply to the message, sign in to <a href="{{portal_url}}">{{portal_label}}</a>.'
  )
WHERE template_key = 'support.reply.customer.notification';

UPDATE email_templates
SET
  body_no = REPLACE(
    body_no,
    'Svar på denne e-posten direkte for å svare kunden.',
    'Åpne kundemeldinger i admin for å svare kunden.'
  ),
  body_en = REPLACE(
    body_en,
    'Reply directly to this email to answer the customer.',
    'Open admin messages to reply to the customer.'
  )
WHERE template_key = 'support.reply.admin.notification';
