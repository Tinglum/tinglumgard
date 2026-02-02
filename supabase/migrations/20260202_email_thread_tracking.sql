-- Add email thread tracking to customer_messages and message_replies
-- Created: 2026-02-02

-- Add email_thread_id to customer_messages for linking emails to messages
ALTER TABLE customer_messages 
ADD COLUMN IF NOT EXISTS email_thread_id TEXT UNIQUE;

-- Create index for faster email thread lookups
CREATE INDEX IF NOT EXISTS idx_customer_messages_email_thread_id 
ON customer_messages(email_thread_id);

-- Add source tracking to message_replies (panel vs email)
ALTER TABLE message_replies 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'panel' CHECK (source IN ('panel', 'email'));

-- Add email_message_id for tracking original email IDs from provider
ALTER TABLE message_replies 
ADD COLUMN IF NOT EXISTS email_message_id TEXT;

-- Create index for email message ID lookups
CREATE INDEX IF NOT EXISTS idx_message_replies_email_message_id 
ON message_replies(email_message_id);

-- Function to generate email thread ID
CREATE OR REPLACE FUNCTION generate_email_thread_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_thread_id IS NULL THEN
    NEW.email_thread_id := 'msg_' || NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate email thread ID on insert
DROP TRIGGER IF EXISTS set_email_thread_id ON customer_messages;
CREATE TRIGGER set_email_thread_id
  BEFORE INSERT ON customer_messages
  FOR EACH ROW
  EXECUTE FUNCTION generate_email_thread_id();

-- Update existing messages with thread IDs
UPDATE customer_messages 
SET email_thread_id = 'msg_' || id 
WHERE email_thread_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN customer_messages.email_thread_id IS 'Unique thread ID for email conversations, format: msg_{id}';
COMMENT ON COLUMN message_replies.source IS 'Source of the reply: panel (from admin panel) or email (from email reply)';
COMMENT ON COLUMN message_replies.email_message_id IS 'Original message ID from email provider for tracking';
