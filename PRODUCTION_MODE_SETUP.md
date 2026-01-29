# Switching to Production Mode

## Changes Made

### 1. Deposit Amount
✅ **COMPLETED** - Updated deposit from 50% to 1% in `app/api/orders/[id]/deposit/route.ts`
- 8 kg box: 35 NOK deposit (was 1750 NOK)
- 12 kg box: 48 NOK deposit (was 2400 NOK)
- Committed and pushed to GitHub

### 2. Vipps Environment Variable

**ACTION REQUIRED:** Update Netlify environment variable to switch from test to production mode.

Go to Netlify dashboard and update:
- **Variable:** `VIPPS_ENV`
- **Current value:** `test`
- **New value:** `production`

#### Steps:
1. Go to https://app.netlify.com/
2. Select your site: **tinglum**
3. Click **Site settings**
4. Click **Environment variables**
5. Find `VIPPS_ENV` and click **Edit**
6. Change value from `test` to `production`
7. Click **Save**

Netlify will automatically redeploy after you save the change.

## What This Changes

### Test Mode (`test`)
- Uses Vipps test environment
- API endpoints: `https://apitest.vipps.no`
- Checkout: `https://checkout.test.vipps.no`
- Requires test app or test credentials

### Production Mode (`production`)
- Uses live Vipps environment
- API endpoints: `https://api.vipps.no`
- Checkout: `https://checkout.vipps.no`
- Works with real Vipps accounts

## Testing

After switching to production:
1. Go to https://xn--tinglumgrd-85a.no/bestill
2. Configure an order (12 kg box with extras)
3. Click "Betal med Vipps"
4. Complete Vipps Login with your real Vipps account
5. You'll be redirected to Vipps Checkout to pay the 1% deposit
6. Complete the payment
7. Verify order is created in Supabase with your Vipps user details

## Important Notes

- The 1% deposit is just for testing - you can change this back to 50% later
- All Vipps API credentials remain the same (they work for both test and production)
- Your redirect URIs are already registered for production: `https://xn--tinglumgrd-85a.no/api/auth/vipps/callback`
