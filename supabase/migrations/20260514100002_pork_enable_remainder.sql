ALTER TABLE orders ADD COLUMN IF NOT EXISTS remainder_payment_enabled boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS remainder_due_date date;
