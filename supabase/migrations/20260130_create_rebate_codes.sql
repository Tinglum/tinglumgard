-- ================================================
-- REBATE/DISCOUNT CODES SYSTEM
-- ================================================
-- Admin-managed discount codes that can be applied to deposits
-- Different from referral codes - these are general promotional codes

-- ================================================
-- 1. REBATE CODES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS rebate_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,

  -- Discount settings
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),

  -- Usage limits
  max_uses INTEGER, -- NULL = unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  max_uses_per_customer INTEGER DEFAULT 1,

  -- Validity period
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,

  -- Restrictions
  min_order_amount DECIMAL(10, 2),
  applicable_to TEXT[] DEFAULT ARRAY['8kg', '12kg'], -- Which box sizes

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Metadata
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT code_format_rebate CHECK (
    code ~ '^[A-Z0-9]{4,20}$' -- Uppercase alphanumeric, 4-20 chars
  ),
  CONSTRAINT valid_dates CHECK (
    valid_from IS NULL OR valid_until IS NULL OR valid_from < valid_until
  )
);

-- Indexes
CREATE INDEX idx_rebate_codes_code ON rebate_codes(code);
CREATE INDEX idx_rebate_codes_active ON rebate_codes(is_active);
CREATE INDEX idx_rebate_codes_valid_dates ON rebate_codes(valid_from, valid_until);

-- ================================================
-- 2. REBATE USAGE TABLE (Tracks who used which code)
-- ================================================
CREATE TABLE IF NOT EXISTS rebate_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  rebate_code_id UUID NOT NULL REFERENCES rebate_codes(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,

  -- Customer info
  customer_phone TEXT,
  customer_email TEXT,
  customer_name TEXT,

  -- Discount applied
  discount_amount_nok DECIMAL(10, 2) NOT NULL,
  original_deposit DECIMAL(10, 2) NOT NULL,
  final_deposit DECIMAL(10, 2) NOT NULL,

  -- Metadata
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_rebate_per_order UNIQUE(order_id)
);

-- Indexes
CREATE INDEX idx_rebate_usage_code_id ON rebate_usage(rebate_code_id);
CREATE INDEX idx_rebate_usage_customer_phone ON rebate_usage(customer_phone);
CREATE INDEX idx_rebate_usage_order_id ON rebate_usage(order_id);

-- ================================================
-- 3. TRIGGER: Update rebate code usage stats
-- ================================================
CREATE OR REPLACE FUNCTION update_rebate_code_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment usage count
  UPDATE rebate_codes
  SET
    current_uses = current_uses + 1,
    updated_at = NOW()
  WHERE id = NEW.rebate_code_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rebate_stats
  AFTER INSERT ON rebate_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_rebate_code_stats();

-- ================================================
-- 4. FUNCTION: Validate rebate code
-- ================================================
CREATE OR REPLACE FUNCTION validate_rebate_code(
  p_code TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_box_size INTEGER,
  p_deposit_amount DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_code_record rebate_codes%ROWTYPE;
  v_usage_count INTEGER;
  v_discount_amount DECIMAL;
BEGIN
  -- Find the rebate code
  SELECT * INTO v_code_record
  FROM rebate_codes
  WHERE code = UPPER(p_code) AND is_active = TRUE;

  -- Code not found
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Ugyldig rabattkode'
    );
  END IF;

  -- Check validity dates
  IF v_code_record.valid_from IS NOT NULL AND NOW() < v_code_record.valid_from THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Koden er ikke aktiv ennå'
    );
  END IF;

  IF v_code_record.valid_until IS NOT NULL AND NOW() > v_code_record.valid_until THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Koden er utløpt'
    );
  END IF;

  -- Check max uses (global)
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.current_uses >= v_code_record.max_uses THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Koden har blitt brukt opp'
    );
  END IF;

  -- Check max uses per customer
  IF v_code_record.max_uses_per_customer IS NOT NULL THEN
    SELECT COUNT(*) INTO v_usage_count
    FROM rebate_usage
    WHERE rebate_code_id = v_code_record.id
      AND (customer_phone = p_phone OR customer_email = p_email);

    IF v_usage_count >= v_code_record.max_uses_per_customer THEN
      RETURN jsonb_build_object(
        'valid', FALSE,
        'error', 'Du har allerede brukt denne koden'
      );
    END IF;
  END IF;

  -- Check box size restriction
  IF NOT (p_box_size::TEXT || 'kg') = ANY(v_code_record.applicable_to) THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Koden gjelder ikke for denne kassestørrelsen'
    );
  END IF;

  -- Check minimum order amount
  IF v_code_record.min_order_amount IS NOT NULL AND p_deposit_amount < v_code_record.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Minimumsbeløp kr ' || v_code_record.min_order_amount || ' kreves'
    );
  END IF;

  -- Calculate discount amount
  IF v_code_record.discount_type = 'percentage' THEN
    v_discount_amount := ROUND(p_deposit_amount * (v_code_record.discount_value / 100));
  ELSE
    v_discount_amount := v_code_record.discount_value;
  END IF;

  -- Ensure discount doesn't exceed deposit
  IF v_discount_amount > p_deposit_amount THEN
    v_discount_amount := p_deposit_amount;
  END IF;

  -- All validations passed
  RETURN jsonb_build_object(
    'valid', TRUE,
    'code_id', v_code_record.id,
    'discount_type', v_code_record.discount_type,
    'discount_value', v_code_record.discount_value,
    'discount_amount', v_discount_amount,
    'description', v_code_record.description
  );
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 5. Add rebate tracking to orders table
-- ================================================
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS rebate_code_used TEXT,
ADD COLUMN IF NOT EXISTS rebate_discount_amount DECIMAL(10, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_rebate_code ON orders(rebate_code_used);

-- ================================================
-- GRANT PERMISSIONS
-- ================================================
GRANT SELECT ON rebate_codes TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON rebate_codes TO authenticated; -- Admin only in practice
GRANT SELECT ON rebate_usage TO authenticated, anon;
GRANT SELECT, INSERT ON rebate_usage TO authenticated, anon;
GRANT EXECUTE ON FUNCTION validate_rebate_code TO authenticated, anon;
