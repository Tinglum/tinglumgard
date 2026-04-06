-- Drop the foreign key constraint on customer_phone that requires the phone
-- to exist in vipps_users. Admin-initiated messages may target customers
-- who haven't completed Vipps login, or use different phone formats.
ALTER TABLE customer_messages
  DROP CONSTRAINT IF EXISTS msg_customer_fk;
