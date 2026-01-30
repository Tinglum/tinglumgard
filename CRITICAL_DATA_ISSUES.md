# CRITICAL DATA INTEGRITY ISSUES FOUND

## Summary

Your Tinglum Gård application has **THREE CRITICAL ISSUES** with how numbers are stored and displayed:

1. **Missing config table** - Pricing is hardcoded, not from admin panel
2. **Security breach** - Users could see all anonymous orders
3. **Amount mismatches** - Orders show 1750 kr but payments are 35 kr

---

## Issue 1: MISSING CONFIG TABLE (HIGHEST PRIORITY)

### Problem
The code tries to fetch pricing from a `config` table that **DOESN'T EXIST** in your database.

**File:** `lib/config/pricing.ts` (line 19-20)
```typescript
const { data: configs, error } = await supabaseAdmin
  .from('config')  // ❌ This table doesn't exist!
  .select('key, value')
```

### Impact
- All orders use HARDCODED default prices:
  - 8kg box: 3500 kr with 50% deposit (1750 kr)
  - 12kg box: 4800 kr with 50% deposit (2400 kr)
- **Admin panel pricing changes have NO EFFECT**
- You cannot control prices from the admin interface

### Current Data
```
Order TL9HXRX (Espen):
  deposit_amount: 1750 kr ← From hardcoded default
  Actual payment: 35 kr   ← From Vipps Test API

Order TL1769692169537-7072 (Kenneth):
  deposit_amount: 35 kr   ← Correct! (but why different?)
  Actual payment: 35 kr   ← Matches!
```

### Solution
**Create the `config` table** in Supabase:

```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- For TESTING (1% deposit = 35 kr matches Vipps Test minimum):
INSERT INTO config (key, value, description) VALUES
  ('box_8kg_price', '3500', '8kg box base price in NOK'),
  ('box_12kg_price', '4800', '12kg box base price in NOK'),
  ('box_8kg_deposit_percentage', '1', 'Deposit % for 8kg (1% = 35kr for test)'),
  ('box_12kg_deposit_percentage', '1', 'Deposit % for 12kg'),
  ('delivery_fee_pickup_e6', '300', 'Pickup E6 fee'),
  ('delivery_fee_trondheim', '200', 'Delivery Trondheim fee'),
  ('fresh_delivery_fee', '500', 'Fresh delivery fee');

-- For PRODUCTION (when using real Vipps, change to 50%):
UPDATE config SET value = '50' WHERE key LIKE '%_deposit_percentage';
```

---

## Issue 2: SECURITY BREACH - USER DATA EXPOSURE (FIXED)

### Problem
**File:** `app/api/orders/route.ts` (line 21 - OLD CODE)
```typescript
.or(`user_id.eq.${session.userId},user_id.is.null`)
// ❌ This showed ALL anonymous orders to EVERY logged-in user!
```

### Impact
- When you logged in, you saw Espen's order
- When Espen logs in, he would see your orders
- **ALL anonymous orders were visible to whoever logged in first**
- Then those orders would be linked to the wrong account!

### Fix Applied
Changed to match by phone/email instead:
```typescript
// Only show orders that match user's phone or email
.or(`customer_phone.eq.${session.phoneNumber},customer_email.eq.${session.email}`)
```

**Status:** ✅ FIXED in commit 3ffb6ae

---

## Issue 3: DISPLAYING EXPECTED VS ACTUAL AMOUNTS (FIXED)

### Problem
**File:** `components/OrderDetailsCard.tsx` (line 403 - OLD CODE)
```typescript
kr {order.deposit_amount.toLocaleString('nb-NO')}
// ❌ Shows the EXPECTED amount, not what was ACTUALLY paid
```

### Impact
- UI showed "1750 kr" as paid when only "35 kr" was actually charged
- Customers saw incorrect payment amounts
- No way to tell if Vipps charged a different amount

### Fix Applied
Now shows ACTUAL payment amount when paid:
```typescript
kr {depositPaid && depositPayment
  ? depositPayment.amount_nok.toLocaleString('nb-NO')  // ✅ Actual paid
  : order.deposit_amount.toLocaleString('nb-NO')}       // Expected (unpaid)
```

**Status:** ✅ FIXED in commit a46631a

---

## Issue 4: VIPPS TEST MODE VS PRODUCTION AMOUNTS

### Background
You're using **Vipps Test API** which has different behavior than production:

- **Test Mode**: Often forces minimum amounts (like 35 kr)
- **Production Mode**: Charges the full amount you specify

### Current Environment
```
VIPPS_ENV=production  ← Set to production
But credentials are test credentials → Actually using TEST API
```

### Why Amounts Mismatch

**Scenario A - Old orders (1750 kr expected, 35 kr paid):**
1. Code calculated: 8kg box × 50% = 1750 kr deposit
2. Sent to Vipps: "Charge 1750 kr"
3. Vipps Test replied: "I only charged 35 kr" (test minimum)
4. Order stored: `deposit_amount: 1750`
5. Payment stored: `amount_nok: 35`
6. **MISMATCH!**

**Scenario B - Newer order (35 kr expected, 35 kr paid):**
1. Code calculated: 8kg box × 1% = 35 kr deposit (somehow?)
2. Sent to Vipps: "Charge 35 kr"
3. Vipps replied: "Charged 35 kr"
4. Order stored: `deposit_amount: 35`
5. Payment stored: `amount_nok: 35`
6. **MATCH!**

### Mystery
**How did one order get created with 35 kr deposit when config doesn't exist?**

Possible explanations:
- Manual database edit?
- Different code was running at that time?
- Admin override feature we're not aware of?

---

## RECOMMENDED ACTIONS

### IMMEDIATE (Do This Now):

1. **Create the `config` table** in Supabase SQL Editor
   - Run the SQL from "Solution" in Issue 1 above
   - Set deposit to 1% for testing, 50% for production

2. **Verify admin panel updates config table**
   - Go to admin panel
   - Change a price
   - Check if `config` table updates
   - If not, admin needs to be fixed too

3. **Clean up test orders**
   - Delete or mark as cancelled all test orders with mismatched amounts
   - Keep only real orders

### BEFORE PRODUCTION LAUNCH:

4. **Update webhook to store actual Vipps amount**
   - Webhook should extract `amount` from Vipps response
   - Update `payments.amount_nok` with actual charged amount
   - This ensures database reflects reality, not expectations

5. **Add amount validation**
   - Compare Vipps charged amount vs expected amount
   - Log warning if they differ
   - Alert admin if mismatch exceeds threshold

6. **Test full flow with production Vipps**
   - Create test order
   - Verify amount calculated correctly from config table
   - Verify Vipps charges exact amount
   - Verify webhook updates with correct amount

---

## FILES MODIFIED

1. ✅ `app/api/orders/route.ts` - Fixed security breach
2. ✅ `components/OrderDetailsCard.tsx` - Show actual paid amounts
3. ⏳ `config` table - **NEEDS TO BE CREATED**
4. ⏳ `app/api/webhooks/vipps/route.ts` - Should store actual Vipps amount (future)

---

## TESTING CHECKLIST

- [ ] Config table created in Supabase
- [ ] Config table populated with test values (1% deposit)
- [ ] New order creation uses values from config table
- [ ] Admin panel updates config table when prices change
- [ ] Orders show correct amounts based on config
- [ ] Vipps test charges 35 kr (1% of 3500 kr)
- [ ] Payment amounts match order amounts
- [ ] UI displays actual paid amount, not expected
- [ ] Users only see their own orders (security fix verified)
- [ ] Before production: Update deposit to 50% in config table
- [ ] Before production: Test with real Vipps credentials

---

## SQL TO RUN IN SUPABASE

```sql
-- 1. Create config table
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert test values (1% deposit = 35 kr for Vipps Test)
INSERT INTO config (key, value, description) VALUES
  ('box_8kg_price', '3500', '8kg box base price in NOK'),
  ('box_12kg_price', '4800', '12kg box base price in NOK'),
  ('box_8kg_deposit_percentage', '1', 'Deposit percentage for 8kg box'),
  ('box_12kg_deposit_percentage', '1', 'Deposit percentage for 12kg box'),
  ('delivery_fee_pickup_e6', '300', 'Pickup fee at E6 location'),
  ('delivery_fee_trondheim', '200', 'Delivery fee in Trondheim'),
  ('fresh_delivery_fee', '500', 'Fresh delivery upgrade fee')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- 3. Verify it worked
SELECT * FROM config ORDER BY key;
```

**REMEMBER:** Change deposit percentage to 50 when moving to production!

