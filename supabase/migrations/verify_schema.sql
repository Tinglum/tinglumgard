-- Verify and fix schema issues

-- Check if payments table has all required columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- Check if orders table allows Vipps fields
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Ensure idempotency_key on payments is nullable for now
ALTER TABLE payments ALTER COLUMN idempotency_key DROP NOT NULL;
