-- Mark customer message threads that were initiated by admin users.

ALTER TABLE customer_messages
ADD COLUMN IF NOT EXISTS admin_initiated BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_sender TEXT;

CREATE INDEX IF NOT EXISTS idx_customer_messages_admin_initiated
ON customer_messages(admin_initiated, created_at DESC);

COMMENT ON COLUMN customer_messages.admin_initiated IS 'TRUE when the thread was created by an admin for the customer.';
COMMENT ON COLUMN customer_messages.admin_sender IS 'Display name/email for the admin who initiated the thread.';