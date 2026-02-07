# 🥚 Egg Integration - Quick Start Guide

## What We've Built

You now have everything needed to unify your **egg e-commerce** (egg3) with your **pig box admin** into one seamless Tinglumgård platform.

---

## 📋 Pre-Integration Checklist

Before you start, ensure you have:
- [x] Supabase project set up
- [x] Vipps payment integration working for pig boxes
- [x] Main Tinglumgård app running on localhost
- [x] egg3 app with complete cart system
- [ ] Database admin access to Supabase

---

## 🚀 Step-by-Step Integration

### Step 1: Run Database Migration (15 minutes)

This creates all the egg tables in your existing Supabase database.

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Select your Tinglumgård project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Run Migration**
   ```sql
   -- Copy the ENTIRE contents of EGG_INTEGRATION_MIGRATION.sql
   -- Paste into SQL Editor
   -- Click "Run" or press Cmd/Ctrl + Enter
   ```

4. **Verify Success**
   - Check "Table Editor" in sidebar
   - You should see new tables:
     - `egg_breeds` (with 5 breeds already inserted!)
     - `egg_inventory`
     - `egg_orders`
     - `egg_payments`
     - `admin_activity_log`

**✅ Success indicator:** You see all 5 egg breeds in the `egg_breeds` table

---

### Step 2: Copy Files (5 minutes)

Option A: **Automatic** (Recommended)
```bash
# Make script executable
chmod +x scripts/integrate-eggs.sh

# Run integration script
bash scripts/integrate-eggs.sh
```

Option B: **Manual**
```bash
# 1. Copy components
mkdir -p components/eggs
cp egg3/components/*.tsx components/eggs/

# 2. Copy contexts
mkdir -p contexts/eggs
cp egg3/lib/cart-context.tsx contexts/eggs/EggCartContext.tsx
cp egg3/lib/order-context.tsx contexts/eggs/EggOrderContext.tsx

# 3. Copy lib files
mkdir -p lib/eggs
cp egg3/lib/*.ts lib/eggs/

# 4. Pages already copied to app/rugeegg/
```

**✅ Success indicator:** You have `components/eggs/`, `contexts/eggs/`, and `lib/eggs/` directories

---

### Step 3: Create API Routes (30 minutes)

Create these files in `app/api/eggs/`:

#### File: `app/api/eggs/breeds/route.ts`
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  const { data, error } = await supabase
    .from('egg_breeds')
    .select('*')
    .eq('active', true)
    .order('display_order')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

#### File: `app/api/eggs/inventory/route.ts`
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const breedId = searchParams.get('breed_id')

  const supabase = createRouteHandlerClient({ cookies })

  let query = supabase
    .from('egg_inventory')
    .select('*, egg_breeds(*)')
    .in('status', ['open', 'sold_out'])
    .gte('delivery_monday', new Date().toISOString())
    .order('delivery_monday')

  if (breedId) {
    query = query.eq('breed_id', breedId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

#### File: `app/api/eggs/orders/route.ts`
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Create new egg order
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()

  // Generate order number
  const orderNumber = `EGG${Date.now().toString().slice(-8)}`

  const orderData = {
    user_id: user?.id,
    order_number: orderNumber,
    ...body,
    status: 'deposit_paid',
    created_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('egg_orders')
    .insert(orderData)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// Get user's egg orders
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('egg_orders')
    .select('*, egg_breeds(*), egg_inventory(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

**✅ Success indicator:** API routes return data when called

---

### Step 4: Update Admin Panel (45 minutes)

#### 4.1 Add Mode Toggle

Edit `app/admin/page.tsx`:

```typescript
// Add at top with other state
const [productMode, setProductMode] = useState<'pigs' | 'eggs' | 'combined'>('combined')

// Add below header, before tabs
<div className="flex items-center gap-2 mb-6 p-4 glass-light rounded-lg">
  <span className="text-sm font-medium text-neutral-700 mr-4">Product View:</span>
  <button
    onClick={() => setProductMode('pigs')}
    className={cn(
      'px-4 py-2 rounded-md text-sm font-medium transition-all',
      productMode === 'pigs'
        ? 'bg-neutral-900 text-white'
        : 'bg-white text-neutral-700 hover:bg-neutral-100'
    )}
  >
    🐷 Pigs
  </button>
  <button
    onClick={() => setProductMode('eggs')}
    className={cn(
      'px-4 py-2 rounded-md text-sm font-medium transition-all',
      productMode === 'eggs'
        ? 'bg-neutral-900 text-white'
        : 'bg-white text-neutral-700 hover:bg-neutral-100'
    )}
  >
    🥚 Eggs
  </button>
  <button
    onClick={() => setProductMode('combined')}
    className={cn(
      'px-4 py-2 rounded-md text-sm font-medium transition-all',
      productMode === 'combined'
        ? 'bg-neutral-900 text-white'
        : 'bg-white text-neutral-700 hover:bg-neutral-100'
    )}
  >
    📊 Combined
  </button>
</div>
```

#### 4.2 Filter Orders by Mode

```typescript
// In orders display logic
const filteredOrders = useMemo(() => {
  return orders.filter(order => {
    if (productMode === 'combined') return true

    // Check if egg order or pig order
    const isEggOrder = order.product_type === 'eggs'
    const isPigOrder = order.product_type === 'pig_box'

    if (productMode === 'eggs') return isEggOrder
    if (productMode === 'pigs') return isPigOrder

    return true
  })
}, [orders, productMode])
```

#### 4.3 Fetch Egg Orders in Admin

```typescript
// Add to data fetching effect
useEffect(() => {
  async function fetchData() {
    // ... existing pig order fetching ...

    // Fetch egg orders
    const { data: eggOrders, error: eggError } = await supabase
      .from('egg_orders')
      .select('*, egg_breeds(*), egg_inventory(*)')
      .order('created_at', { ascending: false })

    if (!eggError && eggOrders) {
      // Merge with pig orders or store separately
      setOrders(prev => [...prev, ...eggOrders.map(o => ({
        ...o,
        product_type: 'eggs',
        product_name: o.egg_breeds.name,
      }))])
    }
  }

  if (isAuthenticated) {
    fetchData()
  }
}, [isAuthenticated])
```

**✅ Success indicator:** Admin panel shows both pig and egg orders, filterable by mode

---

### Step 5: Update Main Navigation (10 minutes)

Edit `components/Header.tsx` (or wherever your main nav is):

```typescript
<nav className="flex items-center gap-6">
  <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
    🐷 Ullgris
  </Link>
  <Link href="/rugeegg" className="text-sm font-medium hover:text-primary transition-colors">
    🥚 Rugeegg
  </Link>
  {isAdmin && (
    <Link href="/admin" className="text-sm font-medium hover:text-primary transition-colors">
      Admin
    </Link>
  )}
</nav>
```

**✅ Success indicator:** You can navigate between pig and egg sections

---

### Step 6: Test Everything (30 minutes)

#### 6.1 Start Dev Server
```bash
npm run dev
```

#### 6.2 Test Egg Flow
1. Visit http://localhost:3000/rugeegg
2. Click on a breed
3. Select a week (you'll need to populate inventory first - see below)
4. Add to cart
5. View cart at /rugeegg/handlekurv
6. Test 12 egg minimum
7. Test Ayam Cemani 6 egg exception
8. (Skip payment for now - set up later)

#### 6.3 Test Admin
1. Visit http://localhost:3000/admin
2. Log in
3. Toggle between Pigs / Eggs / Combined
4. Verify orders filter correctly
5. Test breed management
6. Test inventory management

**✅ Success indicator:** Everything works smoothly without console errors

---

## 🔧 Populate Initial Inventory

You need to add egg inventory for testing. In Supabase SQL Editor:

```sql
-- Get breed IDs
SELECT id, name FROM egg_breeds;

-- Add inventory for each breed (use actual IDs from above)
-- Example for week 12-16 of 2026:

INSERT INTO egg_inventory (breed_id, year, week_number, delivery_monday, eggs_available, eggs_allocated, status)
VALUES
  -- Ayam Cemani
  ('YOUR_AYAM_CEMANI_ID', 2026, 12, '2026-03-16', 50, 0, 'open'),
  ('YOUR_AYAM_CEMANI_ID', 2026, 13, '2026-03-23', 50, 0, 'open'),
  ('YOUR_AYAM_CEMANI_ID', 2026, 14, '2026-03-30', 50, 0, 'open'),
  ('YOUR_AYAM_CEMANI_ID', 2026, 15, '2026-04-06', 50, 0, 'open'),
  ('YOUR_AYAM_CEMANI_ID', 2026, 16, '2026-04-13', 50, 0, 'open'),

  -- Jersey Giant
  ('YOUR_JERSEY_GIANT_ID', 2026, 12, '2026-03-16', 60, 0, 'open'),
  ('YOUR_JERSEY_GIANT_ID', 2026, 13, '2026-03-23', 60, 0, 'open'),
  -- ... repeat for other breeds ...
;
```

**Or create an admin UI to add inventory (recommended for production)**

---

## 🎯 Going Live

### Pre-Launch Checklist
- [ ] Database migration completed
- [ ] All API routes created and tested
- [ ] Admin panel mode toggle working
- [ ] Inventory populated for next 8 weeks
- [ ] Vipps payment tested (test mode)
- [ ] Email notifications set up
- [ ] Mobile testing completed
- [ ] Legal: Updated terms to include eggs
- [ ] Marketing: Announced on social media

### Launch Day
1. **Switch to production Vipps credentials**
2. **Enable egg routes in production**
3. **Add initial inventory**
4. **Announce launch**
5. **Monitor closely for first 24 hours**

### Post-Launch
- Monitor orders daily
- Adjust inventory based on demand
- Collect customer feedback
- Fix bugs immediately
- Celebrate success! 🎉

---

## 📊 Architecture Overview

```
Tinglumgård Unified Platform
├── / (Main landing)
├── /oppdelingsplan (Pig boxes) ← Existing
│   ├── /bestill
│   └── /min-side
├── /rugeegg (Eggs) ← NEW
│   ├── /raser
│   ├── /raser/[slug]
│   ├── /handlekurv
│   ├── /bestill
│   └── /mine-bestillinger
└── /admin (Unified Admin)
    ├── Mode Toggle: Pigs | Eggs | Combined
    ├── Orders (filtered by product_type)
    ├── Inventory (breed calendar for eggs, season for pigs)
    ├── Customers (unified)
    ├── Payments (unified)
    └── Activity Log (unified)
```

---

## 🔍 Troubleshooting

### Problem: "relation egg_breeds does not exist"
**Solution:** Run the database migration in Supabase SQL Editor

### Problem: API routes return 500 errors
**Solution:** Check Supabase connection and table permissions (RLS policies)

### Problem: Admin doesn't show egg orders
**Solution:** Verify `product_type` column was added to orders table, check fetch logic

### Problem: Cart minimum not working
**Solution:** Check cart context logic, verify getTotalEggs() calculation

### Problem: Styles look broken
**Solution:** Ensure glassmorphism styles were added to globals.css

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `EGG_INTEGRATION_MIGRATION.sql` | Database schema for eggs |
| `EGG_INTEGRATION_PLAN.md` | Detailed integration guide |
| `EGG_INTEGRATION_README.md` | This quick-start guide |
| `scripts/integrate-eggs.sh` | Automated integration script |
| `app/rugeegg/*` | Egg customer-facing pages |
| `components/eggs/*` | Egg-specific components |
| `contexts/eggs/*` | Egg state management |
| `lib/eggs/*` | Egg utilities and types |
| `app/api/eggs/*` | Egg API endpoints |

---

## 💡 Tips for Success

1. **Test in Development First**
   - Never run migrations directly in production
   - Use Supabase branching if available

2. **Backup Before Migration**
   - Export current database
   - Take snapshot of Supabase project

3. **Monitor After Launch**
   - Watch Supabase logs
   - Check Vercel/Netlify logs
   - Set up error tracking (Sentry)

4. **Iterate Based on Feedback**
   - Users will find edge cases
   - Be ready to adapt

5. **Document Changes**
   - Keep EGG_INTEGRATION_PLAN.md updated
   - Note any customizations you make

---

## 🤝 Support

If you run into issues:
1. Check the troubleshooting section above
2. Review `EGG_INTEGRATION_PLAN.md` for details
3. Check Supabase logs for database errors
4. Check browser console for frontend errors

---

## ✨ What You've Achieved

You now have:
- ✅ Unified database supporting both products
- ✅ Beautiful Nordic minimal egg e-commerce
- ✅ Sophisticated cart with mix-and-match
- ✅ Single admin panel managing everything
- ✅ Mode toggle for product-specific views
- ✅ Ready for Vipps payment integration
- ✅ Scalable architecture for future products

**You're ready to launch!** 🚀

---

*Built with care for Tinglumgård. From local farm to thriving dual-product e-commerce platform.*
