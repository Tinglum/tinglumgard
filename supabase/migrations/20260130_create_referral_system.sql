-- ================================================
-- REFERRAL SYSTEM MIGRATION
-- ================================================
-- Creates tables for referral code management and tracking
--
-- Features:
-- - Custom referral codes (user-chosen, unique)
-- - Track referral usage (who referred whom)
-- - Credit system (10% per referral, max 5 per box)
-- - Validation (new customers only, no self-referral)

-- ================================================
-- 1. REFERRAL CODES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Limits
  max_uses INTEGER NOT NULL DEFAULT 5,
  current_uses INTEGER NOT NULL DEFAULT 0,

  -- Credits earned
  total_credits_earned DECIMAL(10, 2) NOT NULL DEFAULT 0,
  credits_available DECIMAL(10, 2) NOT NULL DEFAULT 0,
  credits_used DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT code_format CHECK (
    code ~ '^[A-Z0-9]{4,20}$' -- Uppercase alphanumeric, 4-20 chars
  ),
  CONSTRAINT credits_balance CHECK (
    credits_available >= 0 AND
    credits_used >= 0 AND
    total_credits_earned = credits_available + credits_used
  )
);

-- Index for fast code lookups
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_order_id ON referral_codes(order_id);

-- ================================================
-- 2. REFERRALS TABLE (Tracks who used which code)
-- ================================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referral relationship
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Order that used the code
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,

  -- Discount applied to referee
  discount_percentage DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
  discount_amount_nok DECIMAL(10, 2) NOT NULL,

  -- Credit earned by referrer
  credit_percentage DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
  credit_amount_nok DECIMAL(10, 2) NOT NULL,
  credit_applied BOOLEAN NOT NULL DEFAULT FALSE,
  credit_applied_to_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  credit_applied_at TIMESTAMPTZ,

  -- Customer info (for display)
  referee_name TEXT,
  referee_phone TEXT,
  referee_email TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT no_self_referral CHECK (referrer_user_id != referee_user_id)
);

-- Indexes for queries
CREATE INDEX idx_referrals_referral_code_id ON referrals(referral_code_id);
CREATE INDEX idx_referrals_referrer_user_id ON referrals(referrer_user_id);
CREATE INDEX idx_referrals_referee_user_id ON referrals(referee_user_id);
CREATE INDEX idx_referrals_order_id ON referrals(order_id);

-- ================================================
-- 3. TRIGGER: Update referral code stats
-- ================================================
CREATE OR REPLACE FUNCTION update_referral_code_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the referral code stats
  UPDATE referral_codes
  SET
    current_uses = (
      SELECT COUNT(*)
      FROM referrals
      WHERE referral_code_id = NEW.referral_code_id
    ),
    total_credits_earned = total_credits_earned + NEW.credit_amount_nok,
    credits_available = credits_available + NEW.credit_amount_nok,
    updated_at = NOW()
  WHERE id = NEW.referral_code_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referral_stats
  AFTER INSERT ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_code_stats();

-- ================================================
-- 4. TRIGGER: Apply credit when used
-- ================================================
CREATE OR REPLACE FUNCTION apply_referral_credit()
RETURNS TRIGGER AS $$
BEGIN
  -- When credit is marked as applied
  IF NEW.credit_applied = TRUE AND OLD.credit_applied = FALSE THEN
    UPDATE referral_codes
    SET
      credits_available = credits_available - NEW.credit_amount_nok,
      credits_used = credits_used + NEW.credit_amount_nok,
      updated_at = NOW()
    WHERE id = NEW.referral_code_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_apply_credit
  AFTER UPDATE ON referrals
  FOR EACH ROW
  WHEN (NEW.credit_applied IS DISTINCT FROM OLD.credit_applied)
  EXECUTE FUNCTION apply_referral_credit();

-- ================================================
-- 5. FUNCTION: Check if user is new customer
-- ================================================
CREATE OR REPLACE FUNCTION is_new_customer(
  p_user_id UUID,
  p_phone TEXT,
  p_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  order_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO order_count
  FROM orders
  WHERE
    (user_id = p_user_id OR
     customer_phone = p_phone OR
     customer_email = p_email)
    AND status != 'cancelled';

  RETURN order_count = 0;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 6. FUNCTION: Validate referral code
-- ================================================
CREATE OR REPLACE FUNCTION validate_referral_code(
  p_code TEXT,
  p_user_id UUID,
  p_phone TEXT,
  p_email TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_code_record referral_codes%ROWTYPE;
  v_is_new_customer BOOLEAN;
  v_result JSONB;
BEGIN
  -- Find the referral code
  SELECT * INTO v_code_record
  FROM referral_codes
  WHERE code = UPPER(p_code) AND is_active = TRUE;

  -- Code not found
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Ugyldig kode'
    );
  END IF;

  -- Check if trying to use own code
  IF v_code_record.user_id = p_user_id THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Du kan ikke bruke din egen kode'
    );
  END IF;

  -- Check if new customer
  v_is_new_customer := is_new_customer(p_user_id, p_phone, p_email);
  IF NOT v_is_new_customer THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Koden er kun for nye kunder'
    );
  END IF;

  -- All validations passed
  RETURN jsonb_build_object(
    'valid', TRUE,
    'code_id', v_code_record.id,
    'referrer_user_id', v_code_record.user_id,
    'discount_percentage', 20.00,
    'gives_credit', v_code_record.current_uses < v_code_record.max_uses
  );
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 7. Add referral tracking to orders table
-- ================================================
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS referral_code_used TEXT,
ADD COLUMN IF NOT EXISTS referral_discount_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_referred_by ON orders(referred_by_user_id);

-- ================================================
-- GRANT PERMISSIONS
-- ================================================
GRANT SELECT, INSERT, UPDATE ON referral_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON referrals TO authenticated;
GRANT EXECUTE ON FUNCTION is_new_customer TO authenticated;
GRANT EXECUTE ON FUNCTION validate_referral_code TO authenticated;
