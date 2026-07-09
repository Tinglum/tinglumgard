-- ================================================
-- REBATE CODES: MATCH MANGALITSA PRESET SLUGS
-- ================================================
-- The pork line migrated from 2 fixed box sizes (8kg/12kg) to 4 Mangalitsa
-- box presets (premium-cuts, bbq-steakhouse, julespesial, familieboks).
-- `rebate_codes.applicable_to` and `validate_rebate_code()` only ever matched
-- on `<weight>kg` strings derived from target_weight_kg. Since premium-cuts
-- and julespesial both target 8kg, a weight-scoped code could never
-- distinguish between those two presets. This migration adds an optional
-- preset slug parameter so codes can be scoped by the real preset slug,
-- while keeping the legacy weight-based matching working for any existing
-- rebate codes that still use '8kg'/'9kg'/'10kg'/'12kg' values.

CREATE OR REPLACE FUNCTION validate_rebate_code(
  p_code TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_box_size INTEGER,
  p_deposit_amount DECIMAL,
  p_preset_slug TEXT DEFAULT NULL
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

  -- Check box/preset restriction:
  -- match either the Mangalitsa preset slug (preferred, unambiguous) or the
  -- legacy '<weight>kg' string (kept for any pre-existing rebate codes).
  IF NOT (
    (p_preset_slug IS NOT NULL AND p_preset_slug = ANY(v_code_record.applicable_to))
    OR (p_box_size::TEXT || 'kg') = ANY(v_code_record.applicable_to)
  ) THEN
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

GRANT EXECUTE ON FUNCTION validate_rebate_code(TEXT, TEXT, TEXT, INTEGER, DECIMAL, TEXT) TO authenticated, anon;
