ALTER TABLE egg_payments
DROP CONSTRAINT IF EXISTS egg_payments_payment_type_check;

ALTER TABLE egg_payments
ADD CONSTRAINT egg_payments_payment_type_check
CHECK (payment_type IN ('deposit', 'addition_deposit', 'remainder'));
