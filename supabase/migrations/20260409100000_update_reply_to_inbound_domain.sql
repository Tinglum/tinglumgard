-- Update default reply-to address to use the inbound subdomain.
-- Root domain MX records are managed by Domeneshop for regular email;
-- inbound.tinglum.com MX records point to Mailgun EU for reply processing.
UPDATE app_config
SET value = to_jsonb('messages@inbound.tinglum.com'::text)
WHERE key = 'email_default_reply_to';
