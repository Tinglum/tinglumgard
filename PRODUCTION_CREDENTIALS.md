# Production Environment Variables for Netlify

## Status
✅ Deposit changed to 1% (committed and pushed)
✅ Local `.env.local` updated with production credentials

## Netlify Environment Variables to Update

Go to Netlify dashboard → Site settings → Environment variables and update these:

### 1. VIPPS_CLIENT_ID
**Current value:** `4d114914-5923-4a13-976a-60c3bbf32aa5` (test)
**New value:** `c6ac0ac0-7ab9-4650-80be-14281e0f0284` (production)

### 2. VIPPS_CLIENT_SECRET
**Current value:** `.Fb8Q~TqUObVPS3AjA3oFjegEYEJwqK2vxf4xaXO` (test)
**New value:** `Ft08Q~dcmbZT3cCcZmHJcP5ioZ_a1Zaexvzf.awJ` (production)

### 3. VIPPS_MERCHANT_SERIAL_NUMBER
**Current value:** `443598` (test)
**New value:** `1060279` (production)

### 4. VIPPS_SUBSCRIPTION_KEY
**Current value:** `f31aa185a4d73abe5ec7fb3889675cf8` (test)
**New value:** `3a955f4d6309e6706f1d38aacb7cbb19` (production)

### 5. VIPPS_ENV
**Current value:** `test`
**New value:** `production`

## Steps

1. Go to https://app.netlify.com/
2. Select your **tinglum** site
3. Click **Site settings**
4. Click **Environment variables**
5. Update each of the 5 variables above
6. Click **Save** after each change

Netlify will automatically redeploy after you save the changes.

## Testing After Deployment

Once the deployment completes:

1. Go to https://xn--tinglumgrd-85a.no/bestill
2. Configure an order (12 kg box)
3. Click "Betal med Vipps"
4. Complete Vipps Login with your **real** Vipps account
5. Pay the 1% deposit (48 NOK for 12 kg box)
6. Complete the payment
7. Verify order appears in Supabase with your details

## Important Notes

- The deposit is now 1% (35 NOK for 8kg, 48 NOK for 12kg)
- You'll use your real Vipps app on your phone
- The redirect URI is already registered in production: `https://xn--tinglumgrd-85a.no/api/auth/vipps/callback`
- All production credentials are from Merchant Serial Number: **1060279**
