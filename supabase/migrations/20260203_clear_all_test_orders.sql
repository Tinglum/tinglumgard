-- Clear all test orders and related data
-- WARNING: This will delete ALL orders, payments, and related records

-- First, show what will be deleted
SELECT 'Orders to delete:' as info, COUNT(*) as count FROM orders;
SELECT 'Payments to delete:' as info, COUNT(*) as count FROM payments;

-- Delete payments first (foreign key constraint)
DELETE FROM payments;

-- Delete orders
DELETE FROM orders;

-- Verify deletion
SELECT 'Remaining orders:' as info, COUNT(*) as count FROM orders;
SELECT 'Remaining payments:' as info, COUNT(*) as count FROM payments;

SELECT 'All test orders cleared successfully!' as status;
