# 🥚 Egg Product Integration Plan

## Overview
This document outlines the complete integration of the egg e-commerce system (egg3) into the main Tinglumgård application, creating a unified dual-product platform.

---

## Phase 1: Database Migration ✅

### File: `EGG_INTEGRATION_MIGRATION.sql`

**What it does:**
- Extends existing tables with `product_type` column ('pig_box' | 'eggs')
- Creates new egg-specific tables:
  - `egg_breeds` - Breed catalog (Ayam Cemani, Jersey Giant, etc.)
  - `egg_inventory` - Week-based availability per breed
  - `egg_orders` - Customer egg orders
  - `egg_payments` - Payment tracking for eggs
  - `admin_activity_log` - Unified activity log for both products
- Sets up RLS policies for security
- Creates indexes for performance
- Inserts 5 default breeds with real data

**To execute:**
```bash
# 1. Log into Supabase Dashboard
# 2. Go to SQL Editor
# 3. Copy/paste entire EGG_INTEGRATION_MIGRATION.sql
# 4. Click "Run"
```

---

## Phase 2: Code Structure Migration

### 2.1 Move Egg Components to Main App

**Copy from `egg3/` to main app:**

```bash
# Components
cp -r egg3/components/GlassCard.tsx components/eggs/
cp -r egg3/components/WeekSelector.tsx components/eggs/
cp -r egg3/components/QuantitySelector.tsx components/eggs/
cp -r egg3/components/Header.tsx components/eggs/EggHeader.tsx

# Contexts (merge with existing)
# egg3/lib/language-context.tsx → Update contexts/LanguageContext.tsx
# egg3/lib/cart-context.tsx → Create contexts/EggCartContext.tsx
# egg3/lib/order-context.tsx → Create contexts/EggOrderContext.tsx
```

### 2.2 Create Egg Routes

**New routes in main app:**
- `/rugeegg` - Egg landing page
- `/rugeegg/raser` - Breed list
- `/rugeegg/raser/[slug]` - Breed detail
- `/rugeegg/handlekurv` - Shopping cart
- `/rugeegg/bestill/levering` - Delivery selection
- `/rugeegg/bestill/betaling` - Payment
- `/rugeegg/bestill/bekreftelse` - Confirmation
- `/rugeegg/mine-bestillinger` - My orders

---

## Phase 3: API Routes

### 3.1 Create Egg API Endpoints

**File structure:**
```
app/api/eggs/
├── breeds/
│   ├── route.ts          # GET /api/eggs/breeds
│   └── [slug]/route.ts   # GET /api/eggs/breeds/:slug
├── inventory/
│   ├── route.ts          # GET /api/eggs/inventory
│   └── [id]/route.ts     # GET /api/eggs/inventory/:id
├── orders/
│   ├── route.ts          # POST /api/eggs/orders, GET user's orders
│   └── [id]/route.ts     # GET /api/eggs/orders/:id
└── cart/
    └── checkout/route.ts # POST /api/eggs/cart/checkout
```

**Example: `app/api/eggs/breeds/route.ts`**
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

---

## Phase 4: Unified Admin Panel

### 4.1 Add Mode Toggle to Admin

**Update `app/admin/page.tsx`:**

```typescript
// Add mode state
const [adminMode, setAdminMode] = useState<'pigs' | 'eggs' | 'combined'>('combined')

// Add mode toggle UI
<div className="flex items-center gap-2 mb-6">
  <button
    onClick={() => setAdminMode('pigs')}
    className={cn('px-4 py-2 rounded', adminMode === 'pigs' && 'bg-primary text-white')}
  >
    🐷 Pigs
  </button>
  <button
    onClick={() => setAdminMode('eggs')}
    className={cn('px-4 py-2 rounded', adminMode === 'eggs' && 'bg-primary text-white')}
  >
    🥚 Eggs
  </button>
  <button
    onClick={() => setAdminMode('combined')}
    className={cn('px-4 py-2 rounded', adminMode === 'combined' && 'bg-primary text-white')}
  >
    📊 Combined
  </button>
</div>
```

### 4.2 Filter Admin Data by Mode

**Apply to all admin views:**

```typescript
// Orders view
const filteredOrders = orders.filter(order => {
  if (adminMode === 'combined') return true
  if (adminMode === 'pigs') return order.product_type === 'pig_box'
  if (adminMode === 'eggs') return order.product_type === 'eggs'
  return true
})

// Similar filtering for:
// - Dashboard metrics
// - Inventory management
// - Customer database
// - Payment tracking
// - Activity log
```

### 4.3 Create Egg-Specific Admin Components

**New components:**
- `components/admin/EggBreedManager.tsx` - Manage breeds
- `components/admin/EggInventoryCalendar.tsx` - Week-based calendar
- `components/admin/EggOrderDetail.tsx` - Order detail modal

---

## Phase 5: Styling Integration

### 5.1 Add Glassmorphism to Main App

**Update `app/globals.css`:**

```css
/* Copy from egg3/app/globals.css */
@layer utilities {
  .glass-light {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .glass-strong {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .glass-dark {
    background: rgba(245, 245, 245, 0.8);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(229, 229, 229, 0.5);
  }

  .focus-ring {
    @apply focus:outline-none focus:ring-4 focus:ring-black/5;
  }
}
```

### 5.2 Add Egg-Specific Styles

Keep the Nordic minimal aesthetic from egg3:
- Space Grotesk for headings
- 8px spacing grid
- Subtle animations
- Breed accent colors

---

## Phase 6: Navigation Integration

### 6.1 Update Main Header

**Add egg navigation link:**

```typescript
// In main app Header component
<nav className="flex items-center gap-6">
  <Link href="/" className="text-sm font-medium">
    🐷 Ullgris
  </Link>
  <Link href="/rugeegg" className="text-sm font-medium">
    🥚 Rugeegg
  </Link>
  <Link href="/admin" className="text-sm font-medium">
    Admin
  </Link>
</nav>
```

### 6.2 Create Egg-Specific Header

Use the glassmorphism header from egg3 on egg routes:

```typescript
// app/rugeegg/layout.tsx
import { EggHeader } from '@/components/eggs/EggHeader'

export default function EggLayout({ children }) {
  return (
    <>
      <EggHeader />
      {children}
    </>
  )
}
```

---

## Phase 7: Payment Integration

### 7.1 Extend Vipps Integration

**Update existing Vipps webhooks:**

```typescript
// app/api/vipps/webhook/route.ts

// Add product type detection
const productType = metadata.product_type // 'pig_box' or 'eggs'

if (productType === 'eggs') {
  // Update egg_payments table
  await supabase
    .from('egg_payments')
    .update({ status: 'completed', paid_at: new Date() })
    .eq('vipps_order_id', vippsOrderId)
} else {
  // Existing pig box logic
}
```

### 7.2 Create Egg Payment Flow

Reuse existing Vipps logic but with egg-specific tables and order structure.

---

## Phase 8: Testing Checklist

### 8.1 Database Tests
- [ ] Migration runs without errors
- [ ] All tables created successfully
- [ ] RLS policies work correctly
- [ ] Indexes improve query performance
- [ ] Triggers update `updated_at` correctly

### 8.2 Frontend Tests
- [ ] Egg landing page loads
- [ ] Breed list displays all breeds
- [ ] Breed detail shows correct info
- [ ] Cart adds/removes items correctly
- [ ] 12 egg minimum enforced
- [ ] Ayam Cemani 6 egg exception works
- [ ] Checkout flow completes
- [ ] Order confirmation displays

### 8.3 Admin Tests
- [ ] Mode toggle switches views
- [ ] Pig orders filtered in "Pigs" mode
- [ ] Egg orders filtered in "Eggs" mode
- [ ] Combined mode shows both
- [ ] Breed management works
- [ ] Inventory calendar functional
- [ ] Order details load correctly

### 8.4 Payment Tests
- [ ] Test Vipps payment for eggs
- [ ] Deposit payment recorded
- [ ] Remainder payment recorded
- [ ] Webhooks update correct tables
- [ ] Payment status syncs properly

---

## Phase 9: Deployment

### 9.1 Environment Variables

Add to `.env.local`:
```bash
# Existing Vipps/Supabase vars remain

# Egg-specific
NEXT_PUBLIC_EGG_MIN_ORDER=12
NEXT_PUBLIC_AYAM_CEMANI_MIN=6
NEXT_PUBLIC_EGG_SHIPPING_FEE=30000  # 300 kr in øre
```

### 9.2 Build & Deploy

```bash
# 1. Test locally
npm run dev

# 2. Build
npm run build

# 3. Deploy to Vercel/Netlify
# Ensure all environment variables are set
```

---

## Phase 10: Go-Live Checklist

### Pre-Launch
- [ ] Database migration completed
- [ ] All API routes tested
- [ ] Admin panel fully functional
- [ ] Payment flow tested with test mode
- [ ] Email notifications configured
- [ ] Mobile responsive design verified
- [ ] Cross-browser testing completed
- [ ] SEO metadata added to egg pages

### Launch Day
- [ ] Switch to production Vipps credentials
- [ ] Enable egg inventory for first weeks
- [ ] Announce on Instagram/website
- [ ] Monitor error logs
- [ ] Test real order flow

### Post-Launch
- [ ] Monitor first orders closely
- [ ] Collect user feedback
- [ ] Fix any issues immediately
- [ ] Adjust inventory based on demand

---

## Quick Start Commands

```bash
# 1. Run database migration
# (Copy EGG_INTEGRATION_MIGRATION.sql into Supabase SQL Editor)

# 2. Install dependencies (if needed)
npm install

# 3. Start dev server
npm run dev

# 4. Open browser
# Main site: http://localhost:3000
# Eggs: http://localhost:3000/rugeegg
# Admin: http://localhost:3000/admin

# 5. Test with sample data
# - Browse breeds
# - Add to cart
# - Go through checkout
# - Check admin panel in "Eggs" mode
```

---

## Support & Troubleshooting

### Common Issues

**Issue: "relation egg_breeds does not exist"**
- Solution: Run the database migration in Supabase SQL Editor

**Issue: Cart not persisting**
- Solution: Check localStorage is enabled in browser

**Issue: Admin mode toggle not working**
- Solution: Clear browser cache and reload

**Issue: Payments failing**
- Solution: Verify Vipps credentials and product_type in metadata

---

## File Checklist

### Created Files
- ✅ `EGG_INTEGRATION_MIGRATION.sql` - Database schema
- ✅ `EGG_INTEGRATION_PLAN.md` - This document
- ⏳ API routes (to be created)
- ⏳ Egg components (to be migrated)
- ⏳ Admin updates (to be implemented)

### Modified Files
- ⏳ `app/admin/page.tsx` - Add mode toggle
- ⏳ `app/globals.css` - Add glassmorphism styles
- ⏳ `app/layout.tsx` - Add egg contexts
- ⏳ `contexts/LanguageContext.tsx` - Add egg translations

---

## Next Steps

1. **Run the database migration** in Supabase
2. **Copy components** from egg3 to main app
3. **Create API routes** for egg operations
4. **Update admin panel** with mode toggle
5. **Test everything** thoroughly
6. **Deploy** to production

---

*This integration preserves the authentic Nordic minimal design of the egg system while unifying it with the existing pig box admin for streamlined farm management.* 🚀
