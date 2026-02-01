-- Add last_viewed_at column to track when customer last viewed each message thread
ALTER TABLE customer_messages
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_customer_messages_last_viewed ON customer_messages(last_viewed_at);

-- Add comment explaining the column
COMMENT ON COLUMN customer_messages.last_viewed_at IS 'Timestamp when customer last viewed this message thread. Used to determine if there are new admin replies.';
