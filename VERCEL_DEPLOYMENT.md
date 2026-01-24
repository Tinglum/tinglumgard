# Vercel + Supabase Deployment Guide

## 🚀 Complete Deployment Instructions for Tinglumgard

This guide will walk you through deploying your pork farm e-commerce platform to Vercel with Supabase backend.

---

## Part 1: Supabase Setup (Database & Backend)

### Step 1: Create Supabase Project

1. **Go to Supabase**: https://supabase.com/dashboard
2. **Sign up/Login** with GitHub
3. **Create New Project**:
   - Organization: Choose or create
   - Name: `tinglumgard`
   - Database Password: Generate strong password (save it!)
   - Region: Choose closest to Norway (e.g., `eu-north-1` Stockholm)
   - Click "Create new project"
   - Wait 2-3 minutes for provisioning

### Step 2: Get Supabase API Keys

Once project is created:

1. Go to **Settings** → **API**
2. Copy these values (you'll need them):
   ```
   Project URL: https://xxxxx.supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (secret!)
   ```

### Step 3: Run Database Migrations

1. **Install Supabase CLI** (if not installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link to your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Find project ref in your Supabase dashboard URL)

4. **Run all migrations**:
   ```bash
   supabase db push
   ```

   **OR manually via SQL Editor:**

   Go to **SQL Editor** in Supabase dashboard and run these files in order:

   1. `supabase/migrations/20260120201507_create_tinglum_schema.sql`
   2. `supabase/migrations/20260120202650_update_for_vipps_integration.sql`
   3. `supabase/migrations/20260120203228_add_order_modifications_and_config.sql`
   4. `supabase/migrations/20260120203810_extend_extras_catalog_and_orders.sql`
   5. `supabase/migrations/20260120204654_add_scheduling_and_remainder_payment_fields.sql`
   6. `supabase/migrations/20260120210206_update_inventory_tracking_and_pricing.sql`
   7. `supabase/migrations/20260122_add_ribbe_and_extras_fields.sql`
   8. `supabase/migrations/20260123202104_add_checkout_v3_support.sql`
   9. `supabase/migrations/20260124095649_20260124_add_more_extras_products.sql`

### Step 4: Verify Database Setup

1. Go to **Table Editor** in Supabase
2. You should see these tables:
   - `profiles`
   - `inventory`
   - `extras_catalog` (with 8 products pre-loaded)
   - `orders`
   - `order_extras`
   - `payments`
   - `waitlist`
   - `vipps_users`
   - `app_config`

3. Check that `extras_catalog` has data:
   - Indrefilet, Ytrefilet, Koteletter, Ribbe, Bacon, Spekeskinke, Bogsteik, Svinelabb

4. Check that `inventory` has initial data:
   - Season: `høst_2024`
   - kg_remaining: `1200`
   - active: `true`

---

## Part 2: Vercel Deployment

### Option A: Deploy via Vercel Dashboard (Recommended)

#### 1. Push to GitHub

```bash
# If not already done:
git remote add origin https://github.com/YOUR_USERNAME/tinglumgard.git
git branch -M main
git push -u origin main
```

#### 2. Connect to Vercel

1. Go to https://vercel.com/new
2. **Import Git Repository**:
   - Click "Import Git Repository"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Project**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `next build` (auto-filled)
   - **Output Directory**: `.next` (auto-filled)
   - **Install Command**: `npm install` (auto-filled)

4. **Add Environment Variables** (click "Environment Variables"):

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Vipps (Test Credentials)
   VIPPS_CLIENT_ID=4d1f4914-5923-4d13-976a-60c3bbf32aa5
   VIPPS_CLIENT_SECRET=.Fb8Q~TqUObVPS3AjA3oFjegEYEJwqK2vxf4xaXO
   VIPPS_MERCHANT_SERIAL_NUMBER=443598
   VIPPS_SUBSCRIPTION_KEY=f31aa185a4d73abe5ec7fb3889675cf8
   VIPPS_ENV=test

   # JWT Secret (generate new one)
   JWT_SECRET=your-generated-secret-here

   # Email (Resend)
   RESEND_API_KEY=your-resend-key
   EMAIL_FROM=noreply@yourdomain.com

   # App URL (update after first deploy)
   NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
   ```

5. Click **"Deploy"**

6. Wait 2-3 minutes for deployment

7. **Update NEXT_PUBLIC_APP_URL**:
   - After deployment, copy your Vercel URL (e.g., `https://tinglumgard.vercel.app`)
   - Go to **Settings** → **Environment Variables**
   - Update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
   - **Redeploy**: Go to **Deployments** → click ⋮ on latest → **Redeploy**

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? tinglumgard
# - Directory? ./
# - Override settings? No

# After deployment, add environment variables via dashboard
```

---

## Part 3: Post-Deployment Configuration

### 1. Configure Vipps Callbacks

Update your Vipps merchant portal with Vercel URLs:

1. **Login URL**: `https://your-project.vercel.app/api/auth/vipps/login`
2. **Callback URL**: `https://your-project.vercel.app/api/auth/vipps/callback`
3. **Webhook URL**: `https://your-project.vercel.app/api/webhooks/vipps`

### 2. Setup Email Service (Resend)

1. Go to https://resend.com/
2. Sign up and verify your email
3. **Add Domain** (optional but recommended):
   - Go to **Domains**
   - Add your custom domain
   - Add DNS records (TXT, MX, CNAME)

4. **Get API Key**:
   - Go to **API Keys**
   - Create new key
   - Copy and add to Vercel environment variables

5. **Update EMAIL_FROM**:
   - If using custom domain: `noreply@yourdomain.com`
   - If using Resend domain: `onboarding@resend.dev` (testing only)

### 3. Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy output and add to Vercel environment variables as `JWT_SECRET`

### 4. Configure Custom Domain (Optional)

1. **In Vercel Dashboard**:
   - Go to **Settings** → **Domains**
   - Add your domain (e.g., `tinglumgard.no`)

2. **Update DNS** at your registrar:
   - Add CNAME record: `www` → `cname.vercel-dns.com`
   - Add A record: `@` → Vercel IP (provided by Vercel)

3. **Update Environment Variables**:
   - `NEXT_PUBLIC_APP_URL=https://tinglumgard.no`
   - Redeploy

---

## Part 4: Verify Deployment

### Test Checklist:

1. **Homepage** (`/`):
   - [ ] Page loads with products
   - [ ] Inventory counter shows 1200kg
   - [ ] Timeline displays correctly
   - [ ] Instagram feed loads

2. **Checkout** (`/bestill`):
   - [ ] Vipps logo visible at top of sidebar
   - [ ] Sidebar is sticky on scroll
   - [ ] Can select box size (8kg or 12kg)
   - [ ] Can choose ribbe type
   - [ ] Extras load from database
   - [ ] Can add extras with quantities
   - [ ] Delivery options work
   - [ ] Customer info form validates
   - [ ] "Sikker betaling med Vipps" badge visible

3. **Vipps Payment Flow**:
   - [ ] Complete an order
   - [ ] Redirects to Vipps test environment
   - [ ] Payment succeeds (use Vipps test app)
   - [ ] Redirects back to confirmation page

4. **Admin Panel** (`/admin`):
   - [ ] Can view orders
   - [ ] Can manage extras
   - [ ] Can update inventory
   - [ ] Can view waitlist

5. **Database**:
   - [ ] Order appears in Supabase `orders` table
   - [ ] Inventory decreases correctly
   - [ ] Payment recorded in `payments` table

---

## Part 5: Going to Production

### Before Launch:

1. **Switch Vipps to Production**:
   ```env
   VIPPS_ENV=production
   VIPPS_CLIENT_ID=your-production-client-id
   VIPPS_CLIENT_SECRET=your-production-secret
   VIPPS_MERCHANT_SERIAL_NUMBER=your-production-msn
   VIPPS_SUBSCRIPTION_KEY=your-production-key
   ```

2. **Update Vipps Callbacks** with production URLs

3. **Verify Custom Domain** is configured

4. **Test Payment Flow** thoroughly with real Vipps account

5. **Setup Monitoring**:
   - Enable Vercel Analytics
   - Configure error tracking (Sentry, optional)

6. **Setup Automated Jobs** (see `SCHEDULING_SETUP.md`):
   - Week 44 remainder reminders
   - Week 46 order locking
   - At-risk order checking

---

## 🔧 Troubleshooting

### Build Fails

**Error**: "Cannot find module '@supabase/supabase-js'"
- **Solution**: Ensure `package.json` has all dependencies
- Run `npm install` locally and commit `package-lock.json`

**Error**: "Environment variable not found"
- **Solution**: Double-check all environment variables in Vercel
- Make sure there are no extra spaces

### Runtime Errors

**Error**: "Failed to fetch extras"
- **Solution**: Verify Supabase URL and keys are correct
- Check Supabase database has `extras_catalog` table with data

**Error**: "Vipps payment fails"
- **Solution**:
  - Verify callback URLs match exactly
  - Check Vipps credentials are correct
  - Ensure `NEXT_PUBLIC_APP_URL` is set

**Error**: "Images not loading"
- **Solution**: Rename `Public/` to `public/` (lowercase)
  ```bash
  git mv Public public
  git commit -m "Rename Public to public for case-sensitive filesystems"
  git push
  ```

### Database Issues

**Error**: "relation does not exist"
- **Solution**: Run all migrations in correct order
- Verify in Supabase Table Editor that tables exist

**Error**: "permission denied for table"
- **Solution**: Check RLS policies are created
- Verify service role key is used for admin operations

---

## 📊 Monitoring & Maintenance

### Vercel Dashboard

- **Deployments**: View all deployments and logs
- **Analytics**: Track page views and performance
- **Logs**: Real-time function logs

### Supabase Dashboard

- **Table Editor**: View/edit data
- **SQL Editor**: Run queries
- **Database**: Monitor connections and performance
- **Logs**: View API request logs

### Regular Tasks

- **Weekly**: Check order status in admin panel
- **Monthly**: Review inventory levels
- **Seasonal**: Update inventory for new season
- **As needed**: Respond to customer emails

---

## 🆘 Getting Help

### Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vipps Docs**: https://developer.vippsmobilepay.com/

### Support Channels

- **Vercel Discord**: https://vercel.com/discord
- **Supabase Discord**: https://discord.supabase.com/
- **Vipps Support**: support@vipps.no

---

## ✅ Quick Reference

### Useful Commands

```bash
# Local development
npm run dev

# Build locally
npm run build

# Start production server
npm start

# Type check
npm run typecheck

# Deploy to Vercel
vercel --prod

# View Vercel logs
vercel logs

# Supabase migrations
supabase db push

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Important URLs

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Vipps Portal**: https://portal.vippsmobilepay.com/
- **Resend Dashboard**: https://resend.com/dashboard

---

## 🎉 Deployment Complete!

Your Tinglumgard pork farm e-commerce platform is now live with:

✅ Sticky payment sidebar with Vipps logo
✅ Supabase database backend
✅ Vipps payment integration
✅ Serverless deployment on Vercel
✅ Automatic scaling and CDN
✅ HTTPS enabled by default

**Next**: Test the complete order flow and go live! 🚀
