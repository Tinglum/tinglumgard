-- Add is_from_customer field to distinguish customer replies from admin replies
ALTER TABLE message_replies
ADD COLUMN IF NOT EXISTS is_from_customer BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_message_replies_is_from_customer ON message_replies(is_from_customer);

-- Add comment explaining the column
COMMENT ON COLUMN message_replies.is_from_customer IS 'TRUE if reply is from customer, FALSE if from admin. Allows customers to reply to admin messages.';
