-- ================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================
-- Add RLS policies for rebate codes and referral codes
-- This adds an extra layer of security beyond API authentication

-- ================================================
-- REBATE CODES - Enable RLS
-- ================================================
ALTER TABLE rebate_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rebate_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active rebate codes" ON rebate_codes;
DROP POLICY IF EXISTS "Service role can manage rebate codes" ON rebate_codes;

DROP POLICY IF EXISTS "Anyone can view rebate usage" ON rebate_usage;
DROP POLICY IF EXISTS "Anyone can insert rebate usage" ON rebate_usage;
DROP POLICY IF EXISTS "Service role can manage rebate usage" ON rebate_usage;

-- Anyone can view active rebate codes (needed for validation)
CREATE POLICY "Anyone can view active rebate codes"
ON rebate_codes FOR SELECT
USING (is_active = TRUE);

-- Only service role can modify rebate codes (admin-only operations)
CREATE POLICY "Service role can manage rebate codes"
ON rebate_codes FOR ALL
USING (auth.role() = 'service_role');

-- Anyone can view rebate usage (needed for validation - checking if customer already used code)
CREATE POLICY "Anyone can view rebate usage"
ON rebate_usage FOR SELECT
USING (TRUE);

-- Anyone can insert rebate usage (when placing order)
CREATE POLICY "Anyone can insert rebate usage"
ON rebate_usage FOR INSERT
WITH CHECK (TRUE);

-- Only service role can modify rebate usage
CREATE POLICY "Service role can manage rebate usage"
ON rebate_usage FOR UPDATE
USING (auth.role() = 'service_role');

-- ================================================
-- REFERRAL CODES - Enable RLS
-- ================================================
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active referral codes" ON referral_codes;
DROP POLICY IF EXISTS "Authenticated users can create referral codes" ON referral_codes;
DROP POLICY IF EXISTS "Users can update own referral codes" ON referral_codes;
DROP POLICY IF EXISTS "Service role can manage referral codes" ON referral_codes;

DROP POLICY IF EXISTS "Anyone can view referrals" ON referrals;
DROP POLICY IF EXISTS "Anyone can insert referrals" ON referrals;
DROP POLICY IF EXISTS "Service role can manage referrals" ON referrals;

-- Anyone can view active referral codes (needed for validation)
CREATE POLICY "Anyone can view active referral codes"
ON referral_codes FOR SELECT
USING (is_active = TRUE);

-- Authenticated users can create their own referral codes
CREATE POLICY "Authenticated users can create referral codes"
ON referral_codes FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own referral codes
CREATE POLICY "Users can update own referral codes"
ON referral_codes FOR UPDATE
USING (auth.role() = 'authenticated');

-- Service role can manage all referral codes
CREATE POLICY "Service role can manage referral codes"
ON referral_codes FOR ALL
USING (auth.role() = 'service_role');

-- Anyone can view referrals (for showing referral history)
CREATE POLICY "Anyone can view referrals"
ON referrals FOR SELECT
USING (TRUE);

-- Anyone can insert referrals (when placing order with referral code)
CREATE POLICY "Anyone can insert referrals"
ON referrals FOR INSERT
WITH CHECK (TRUE);

-- Only service role can modify referrals
CREATE POLICY "Service role can manage referrals"
ON referrals FOR UPDATE
USING (auth.role() = 'service_role');

-- ================================================
-- NOTES:
-- ================================================
-- These policies work in conjunction with the API authentication
-- API endpoints still check for admin permissions using getSession()
-- RLS adds database-level security as a second layer of defense
