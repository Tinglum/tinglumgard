# Netlify Environment Variable Setup

## Required Action

Add the following environment variable in your Netlify dashboard:

### Steps:

1. Go to https://app.netlify.com/
2. Select your site: **tinglum**
3. Click **Site settings** (in the top navigation)
4. Click **Environment variables** (in the left sidebar)
5. Click **Add a variable** or **Add environment variable**
6. Enter:
   - **Key:** `NEXT_PUBLIC_APP_URL`
   - **Value:** `https://xn--tinglumgrd-85a.no`
   - **Scopes:** Select "All" (both Production and Build)
7. Click **Save**

### Why This Is Needed

The Vipps OAuth redirect URI is currently showing as `undefined/api/auth/vipps/callback` because `NEXT_PUBLIC_APP_URL` doesn't exist in the Netlify environment.

This variable is already set in your local `.env.local` file, but Netlify needs it configured separately in the dashboard.

### After Adding

Once you save the environment variable, Netlify should automatically trigger a new deployment. If it doesn't, let me know and I'll trigger one with a commit.

### Verification

After the deployment completes, the Netlify function logs should show:
```
Vipps Login - Redirect URI: https://xn--tinglumgrd-85a.no/api/auth/vipps/callback
```

Instead of:
```
Vipps Login - Redirect URI: undefined/api/auth/vipps/callback
```
