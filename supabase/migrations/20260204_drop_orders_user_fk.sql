-- Drop the foreign key constraint on orders.user_id
-- This is necessary because we're using vipps_users instead of auth.users
-- Authorization is handled via phone/email matching instead

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- Keep the column nullable for backward compatibility
-- user_id will be populated for Supabase Auth users, null for Vipps users
