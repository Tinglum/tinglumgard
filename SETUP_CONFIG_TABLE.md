# Setup Config Table - Step by Step Guide

## Problem
Your admin panel has controls for forskudd percentages, but the `config` table doesn't exist in the database, so changes aren't saved.

## Solution
Create the `config` table in Supabase and populate it with initial values.

---

## Step 1: Create the Table

Go to Supabase Dashboard → SQL Editor and run this:

```sql
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Step 2: Populate Initial Values

**Option A: For TESTING (with Vipps Test API)**

Use 1% forskudd (35 kr) which matches Vipps Test minimum:

```sql
INSERT INTO config (key, value, description) VALUES
  ('box_8kg_price', '3500', '8kg box base price in NOK'),
  ('box_12kg_price', '4800', '12kg box base price in NOK'),
  ('box_8kg_deposit_percentage', '1', 'Forskudd percentage for 8kg box (1% = 35kr)'),
  ('box_12kg_deposit_percentage', '1', 'Forskudd percentage for 12kg box'),
  ('delivery_fee_pickup_e6', '300', 'Pickup fee at E6 location'),
  ('delivery_fee_trondheim', '200', 'Delivery fee in Trondheim'),
  ('fresh_delivery_fee', '500', 'Fresh delivery upgrade fee'),
  ('cutoff_year', '2026', 'Order cutoff year'),
  ('cutoff_week', '46', 'Order cutoff week'),
  ('contact_email', 'post@tinglum.no', 'Contact email address'),
  ('contact_phone', '+47 123 45 678', 'Contact phone number')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
```

**Option B: For PRODUCTION (with real Vipps)**

Use 50% forskudd (standard):

```sql
INSERT INTO config (key, value, description) VALUES
  ('box_8kg_price', '3500', '8kg box base price in NOK'),
  ('box_12kg_price', '4800', '12kg box base price in NOK'),
  ('box_8kg_deposit_percentage', '50', 'Forskudd percentage for 8kg box (50% = 1750kr)'),
  ('box_12kg_deposit_percentage', '50', 'Forskudd percentage for 12kg box'),
  ('delivery_fee_pickup_e6', '300', 'Pickup fee at E6 location'),
  ('delivery_fee_trondheim', '200', 'Delivery fee in Trondheim'),
  ('fresh_delivery_fee', '500', 'Fresh delivery upgrade fee'),
  ('cutoff_year', '2026', 'Order cutoff year'),
  ('cutoff_week', '46', 'Order cutoff week'),
  ('contact_email', 'post@tinglum.no', 'Contact email address'),
  ('contact_phone', '+47 123 45 678', 'Contact phone number')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
```

---

## Step 3: Verify It Worked

Run this query to see the values:

```sql
SELECT * FROM config ORDER BY key;
```

You should see 11 rows with all the configuration values.

---

## Step 4: Use the Admin Panel

1. Log in to your site as admin
2. Go to the Admin panel
3. Click on "Konfigurasjon" section
4. You should now see all the pricing values populated from the database
5. Try changing the forskudd percentage
6. Click "Lagre konfigurasjon"
7. Refresh the page - the values should persist

---

## Calculated Forskudd Amounts

With these values, the deposits will be:

### Testing (1% forskudd):
- **8kg box**: 3500 kr × 1% = **35 kr** ✅ Matches Vipps Test
- **12kg box**: 4800 kr × 1% = **48 kr**

### Production (50% forskudd):
- **8kg box**: 3500 kr × 50% = **1750 kr**
- **12kg box**: 4800 kr × 50% = **2400 kr**

---

## Switching from Test to Production

When you're ready to go live:

1. Update Vipps credentials to production in `.env`:
   ```
   VIPPS_CLIENT_ID=<production-client-id>
   VIPPS_CLIENT_SECRET=<production-secret>
   ```

2. Update forskudd percentage in admin panel:
  - 8kg forskudd: Change from 1% to 50%
  - 12kg forskudd: Change from 1% to 50%
   - Click "Lagre konfigurasjon"

3. Or update directly in SQL:
   ```sql
   UPDATE config
   SET value = '50', updated_at = NOW()
   WHERE key IN ('box_8kg_deposit_percentage', 'box_12kg_deposit_percentage');
   ```

---

## Alternative: Automated Setup

If you prefer, you can run the setup script:

```bash
node setup-config-table.js
```

This will:
1. Check if table exists
2. Populate initial values with 1% forskudd (for testing)
3. Display current configuration

**Note**: You still need to create the table manually first (Step 1 above).

---

## Troubleshooting

### "Table does not exist" error
- Make sure you ran the CREATE TABLE statement in Step 1
- Refresh the Supabase table list

### Admin panel shows defaults instead of database values
- Check that the config table has data: `SELECT * FROM config;`
- Verify the API can read it: Visit `/api/admin/configuration` (must be logged in as admin)

### Changes don't persist
- Check browser console for errors
- Verify the POST to `/api/admin/configuration` succeeds
- Query the table directly to see if values changed

### Orders still use wrong amounts
- New orders will use the config table values immediately
- Existing orders with wrong amounts need to be manually corrected or deleted

---

## What This Fixes

✅ Admin panel forskudd percentage controls now work
✅ Pricing is controlled from database, not hardcoded
✅ Orders created with correct forskudd amounts
✅ Easy to switch between test (1%) and production (50%) forskudd
✅ All pricing configurable without code changes

