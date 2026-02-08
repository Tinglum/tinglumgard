-- Store Vipps callback authorization tokens for webhook verification
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS vipps_callback_token TEXT;

ALTER TABLE egg_payments
ADD COLUMN IF NOT EXISTS vipps_callback_token TEXT;
