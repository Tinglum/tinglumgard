# Supabase Setup Guide for Tinglum Farm

This guide will walk you through setting up Supabase for your Tinglum Farm application.

## Step 1: Create a Supabase Account and Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign in"
3. Sign up with GitHub, Google, or email
4. Once logged in, click "New Project"
5. Fill in the project details:
   - **Name**: `tinglum-farm` (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to Norway (e.g., `Europe West (Frankfurt)`)
   - **Pricing Plan**: Start with the Free tier
6. Click "Create new project"
7. Wait 2-3 minutes for your database to be provisioned

## Step 2: Get Your API Credentials

Once your project is ready:

1. In the Supabase dashboard, click on the **Settings** icon (⚙️) in the left sidebar
2. Click on **API** under "Project Settings"
3. You'll see your credentials:

### Copy these values:

- **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
- **anon public key**: A long string starting with `eyJ...`
- **service_role key**: A longer string also starting with `eyJ...`

⚠️ **IMPORTANT**: Keep the `service_role` key secret! Never commit it to public repositories.

## Step 3: Update Your .env.local File

Open your `.env.local` file and replace the placeholder values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfc...
```

## Step 4: Set Up the Database Schema

You have two options to set up your database:

### Option A: Use the Supabase SQL Editor (Recommended)

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Run each migration file in order:

#### Migration 1: Create Base Schema
```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/20260120201507_create_tinglum_schema.sql
```

#### Migration 2: Add Vipps Integration
```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/20260120202650_update_for_vipps_integration.sql
```

#### Migration 3: Add Configuration
```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/20260120203228_add_order_modifications_and_config.sql
```

#### Migration 4: Extend Extras
```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/20260120203810_extend_extras_catalog_and_orders.sql
```

#### Migration 5: Add Scheduling
```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/20260120204654_add_scheduling_and_remainder_payment_fields.sql
```

#### Migration 6: Update Inventory
```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/20260120210206_update_inventory_tracking_and_pricing.sql
```

#### Migration 7: Add Product Fields
```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/20260122_add_ribbe_and_extras_fields.sql
```

**After each migration:**
- Click **Run** (or press Ctrl/Cmd + Enter)
- Wait for "Success. No rows returned" message
- Then move to the next migration

### Option B: Use Supabase CLI (Advanced)

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

## Step 5: Verify Database Setup

After running all migrations, verify your database:

1. In Supabase dashboard, click **Table Editor** in the left sidebar
2. You should see these tables:
   - ✅ profiles
   - ✅ inventory
   - ✅ extras_catalog
   - ✅ orders
   - ✅ order_extras
   - ✅ payments
   - ✅ waitlist
   - ✅ vipps_users
   - ✅ app_config

3. Click on **extras_catalog** - it should have pre-populated data:
   - Delivery options (E6, Trondheim, Fresh)
   - Pork products (Indrefilet, Ytrefilet, Koteletter, etc.)

4. Click on **inventory** - should have one row:
   - season: `høst_2024`
   - kg_remaining: `1200`
   - active: `true`

## Step 6: Enable Authentication

1. In Supabase dashboard, click **Authentication** in the left sidebar
2. Click **Providers**
3. Enable the authentication methods you want:
   - **Email** (enabled by default)
   - **Phone** (for Vipps phone authentication)
   - **OAuth** providers if needed

### Optional: Configure Email Templates

1. Go to **Authentication** > **Email Templates**
2. Customize the confirmation email, password reset, etc.

## Step 7: Configure Storage (Optional)

If you need to store images (product photos, etc.):

1. Click **Storage** in the left sidebar
2. Click **Create a new bucket**
3. Name it `products` or `images`
4. Set appropriate policies for public/private access

## Step 8: Restart Your Development Server

After updating `.env.local`:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart it
npm run dev
```

## Step 9: Test the Connection

1. Open your browser to `http://localhost:3003`
2. Open the browser console (F12)
3. Navigate to the checkout page (`/bestill`)
4. You should no longer see Supabase connection errors
5. The extras should load properly

## Troubleshooting

### Error: "Invalid supabaseUrl"
- Make sure you copied the full URL including `https://`
- URL should end with `.supabase.co`
- No trailing slashes

### Error: "Invalid API key"
- Make sure you copied the complete key (very long string starting with `eyJ`)
- No extra spaces before or after
- Check you're using the right key (anon vs service_role)

### Migrations fail
- Run migrations in order (numbered 1-7)
- If a migration fails, check the error message
- You may need to drop tables and start over (ask for help if needed)

### Tables not showing up
- Refresh the Table Editor page
- Check the SQL Editor for error messages
- Verify all migrations ran successfully

## Next Steps

After Supabase is configured:

1. ✅ Database schema is ready
2. ✅ Authentication is enabled
3. ✅ Row Level Security (RLS) is configured
4. 🔄 Test creating an order
5. 🔄 Test Vipps payment integration
6. 🔄 Create an admin user (instructions below)

## Creating an Admin User

After you sign up through the app:

1. Go to Supabase dashboard > **SQL Editor**
2. Run this query (replace with your user's email):

```sql
-- Find your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Make yourself an admin
INSERT INTO profiles (id, role)
VALUES ('YOUR_USER_ID_FROM_ABOVE', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

## Security Best Practices

- ✅ Row Level Security (RLS) is already enabled on all tables
- ✅ Service role key should ONLY be in `.env.local` (never in frontend code)
- ✅ `.env.local` is in `.gitignore` (don't commit it)
- ⚠️ When deploying to production, use environment variables in your hosting platform
- ⚠️ Change the database password from the default after initial setup

## Support

If you run into issues:
1. Check the Supabase dashboard logs
2. Check your browser console for errors
3. Check the Next.js server console for errors
4. Verify all migration files ran successfully
5. Ensure your API keys are correct in `.env.local`

---

**You're all set!** Once Supabase is configured, the application will be able to:
- Create and manage orders
- Process Vipps payments
- Track inventory
- Manage extras and products
- Handle user authentication
