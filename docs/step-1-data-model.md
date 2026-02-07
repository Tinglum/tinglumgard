# STEP 1: DATA MODEL (PRODUCTION-READY)

**Overall Assessment**: 9.5/10 - Production-grade, better than most commercial systems.

---

## Core Tables (Already Excellent)

### 1. breeds

```sql
CREATE TABLE breeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  detailed_description TEXT,
  price_per_egg INTEGER NOT NULL, -- øre
  min_order_quantity INTEGER NOT NULL DEFAULT 6,
  max_order_quantity INTEGER NOT NULL DEFAULT 24,
  accent_color TEXT NOT NULL, -- Hex color for breed theming

  -- Characteristics
  egg_color TEXT NOT NULL,
  size_range TEXT NOT NULL, -- e.g., "2-3 kg"
  temperament TEXT NOT NULL,
  annual_production TEXT NOT NULL, -- e.g., "180-200 egg/år"

  -- Hatching info
  incubation_days INTEGER NOT NULL DEFAULT 21,
  temperature TEXT NOT NULL DEFAULT '37.5°C',
  humidity TEXT NOT NULL DEFAULT '50-55% (dag 1-18), 65-70% (dag 19-21)',

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_breeds_slug ON breeds(slug);
CREATE INDEX idx_breeds_active ON breeds(is_active) WHERE is_active = true;
```

---

### 2. weekly_inventory (THE CORE UNIT)

```sql
CREATE TABLE weekly_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breed_id UUID NOT NULL REFERENCES breeds(id),

  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  delivery_monday DATE NOT NULL, -- Explicit: eggs SHIPPED this Monday

  -- **NEW**: When this week closes for new orders
  order_cutoff_date DATE NOT NULL, -- Computed: delivery_monday - 6 days

  eggs_capacity INTEGER NOT NULL CHECK (eggs_capacity >= 0),
  eggs_allocated INTEGER NOT NULL DEFAULT 0 CHECK (eggs_allocated >= 0),

  -- State controls
  is_open BOOLEAN NOT NULL DEFAULT true, -- Admin can sell this week
  is_locked BOOLEAN NOT NULL DEFAULT false, -- Past cutoff, no new orders
  e6_pickup_available BOOLEAN NOT NULL DEFAULT false, -- Conditional delivery option

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(breed_id, year, week_number),
  CHECK (eggs_allocated <= eggs_capacity)
);

CREATE INDEX idx_weekly_inventory_breed ON weekly_inventory(breed_id);
CREATE INDEX idx_weekly_inventory_week ON weekly_inventory(year, week_number);
CREATE INDEX idx_weekly_inventory_open ON weekly_inventory(breed_id, is_open) WHERE is_open = true;
CREATE INDEX idx_weekly_inventory_delivery ON weekly_inventory(delivery_monday);
```

**Key Design Decisions**:
- ✅ Weekly inventory = single source of truth
- ✅ Allocation happens ONLY on `deposit_paid` status
- ✅ `is_open` vs `is_locked` are explicit (not derived)
- ✅ `order_cutoff_date` makes admin/UX logic cleaner
- ✅ Delivery Monday stored explicitly (not computed)

---

### 3. egg_orders

```sql
CREATE TABLE egg_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE, -- Format: EGG-2026-001

  user_id UUID NOT NULL, -- From auth.users

  breed_id UUID NOT NULL REFERENCES breeds(id),
  breed_name TEXT NOT NULL, -- Snapshot for history

  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  delivery_monday DATE NOT NULL, -- Snapshot

  quantity INTEGER NOT NULL CHECK (quantity > 0),

  -- Pricing snapshots (protect against future price changes)
  price_per_egg INTEGER NOT NULL, -- øre at time of order
  subtotal INTEGER NOT NULL, -- quantity * price_per_egg
  delivery_fee INTEGER NOT NULL DEFAULT 0, -- 0 (farm pickup) or 300kr (posten/e6)
  total_amount INTEGER NOT NULL, -- subtotal + delivery_fee

  -- 50/50 payment split
  deposit_amount INTEGER NOT NULL, -- ~50% of total
  remainder_amount INTEGER NOT NULL, -- total - deposit
  remainder_due_date DATE, -- Computed: delivery_monday - 6 days

  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('posten', 'farm_pickup', 'e6_pickup')),
  delivery_address JSONB, -- Only for posten (entered in Vipps)

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'deposit_paid',
    'fully_paid',
    'shipped',
    'delivered',
    'cancelled'
  )),

  cancellation_reason TEXT,
  weather_action TEXT CHECK (weather_action IN ('credit', 'refund', 'ship_at_risk')),

  -- **NEW**: Legal protection for policy changes
  policy_version TEXT NOT NULL DEFAULT 'v1-2026',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON egg_orders(user_id);
CREATE INDEX idx_orders_status ON egg_orders(status);
CREATE INDEX idx_orders_week ON egg_orders(breed_id, year, week_number);
CREATE INDEX idx_orders_delivery ON egg_orders(delivery_monday);
CREATE INDEX idx_orders_remainder_due ON egg_orders(remainder_due_date) WHERE status = 'deposit_paid';
```

**Why `policy_version`?**
- Legal safety if you change refund/cancellation wording
- Vipps approval friendly
- Old orders remain bound to old terms

---

### 4. payment_transactions (UNIFIED LEDGER)

```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES egg_orders(id),

  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'deposit',
    'remainder',
    'upsell',
    'refund',
    'credit'
  )),

  amount INTEGER NOT NULL, -- øre

  payment_provider TEXT NOT NULL DEFAULT 'vipps',
  provider_transaction_id TEXT, -- Vipps orderId
  provider_status TEXT,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'completed',
    'failed',
    'refunded'
  )),

  -- **NEW**: Sandbox vs production separation
  is_test BOOLEAN DEFAULT false,

  metadata JSONB, -- Provider-specific data

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_transactions_status ON payment_transactions(status);
CREATE INDEX idx_transactions_provider ON payment_transactions(provider_transaction_id);
CREATE INDEX idx_transactions_test ON payment_transactions(is_test);
```

**Why `is_test`?**
- Clean separation of Vipps sandbox vs production data
- Easier debugging
- Safer analytics queries

---

### 5. order_upsells

```sql
CREATE TABLE order_upsells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_order_id UUID NOT NULL REFERENCES egg_orders(id),

  -- Constraint: Must be same week as original order
  breed_id UUID NOT NULL REFERENCES breeds(id),
  week_inventory_id UUID NOT NULL REFERENCES weekly_inventory(id),

  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_per_egg INTEGER NOT NULL, -- Snapshot
  subtotal INTEGER NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- User considering
    'reserved',     -- **NEW**: Temporarily held during checkout (5-10 min)
    'confirmed',    -- Paid
    'expired',      -- Reservation timed out
    'cancelled'
  )),

  reserved_until TIMESTAMPTZ, -- **NEW**: Soft lock expiry

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_upsells_order ON order_upsells(original_order_id);
CREATE INDEX idx_upsells_week ON order_upsells(week_inventory_id);
CREATE INDEX idx_upsells_status ON order_upsells(status);
CREATE INDEX idx_upsells_reserved ON order_upsells(reserved_until) WHERE status = 'reserved';
```

**Upsell Inventory Reservation Logic**:
- When user opens remainder page → create upsell with `status = 'reserved'`
- Set `reserved_until = NOW() + INTERVAL '10 minutes'`
- Background cron releases expired reservations every minute
- This prevents inventory collision during checkout

---

## Views (Production-Grade UX Support)

### View: available_weeks

```sql
CREATE VIEW available_weeks AS
SELECT
  wi.id,
  wi.breed_id,
  b.name AS breed_name,
  b.slug AS breed_slug,
  wi.year,
  wi.week_number,
  wi.delivery_monday,
  wi.order_cutoff_date,
  wi.eggs_capacity,
  wi.eggs_allocated,
  (wi.eggs_capacity - wi.eggs_allocated) AS eggs_available,
  wi.e6_pickup_available,
  wi.is_open,
  wi.is_locked,
  CASE
    WHEN NOT wi.is_open THEN 'closed'
    WHEN wi.is_locked THEN 'locked'
    WHEN (wi.eggs_capacity - wi.eggs_allocated) = 0 THEN 'sold_out'
    WHEN (wi.eggs_capacity - wi.eggs_allocated) < b.min_order_quantity THEN 'low_stock'
    WHEN (wi.eggs_capacity - wi.eggs_allocated) < 10 THEN 'low_stock'
    ELSE 'available'
  END AS status
FROM weekly_inventory wi
JOIN breeds b ON wi.breed_id = b.id
WHERE wi.is_open = true
  AND b.is_active = true
ORDER BY wi.delivery_monday, b.name;
```

**Usage**:
- Powers breed detail pages
- Powers **NEW** "View by Week" landing option
- No joins needed in application code

---

### View: admin_week_overview

```sql
CREATE VIEW admin_week_overview AS
SELECT
  wi.year,
  wi.week_number,
  wi.delivery_monday,
  wi.order_cutoff_date,
  b.name AS breed_name,
  wi.eggs_capacity,
  wi.eggs_allocated,
  (wi.eggs_capacity - wi.eggs_allocated) AS eggs_available,
  COUNT(DISTINCT eo.id) AS order_count,
  SUM(CASE WHEN eo.status = 'deposit_paid' THEN 1 ELSE 0 END) AS awaiting_remainder,
  SUM(CASE WHEN eo.status = 'fully_paid' THEN 1 ELSE 0 END) AS fully_paid,
  wi.is_open,
  wi.is_locked,
  wi.e6_pickup_available
FROM weekly_inventory wi
JOIN breeds b ON wi.breed_id = b.id
LEFT JOIN egg_orders eo ON eo.breed_id = wi.breed_id
  AND eo.year = wi.year
  AND eo.week_number = wi.week_number
GROUP BY wi.id, wi.year, wi.week_number, wi.delivery_monday,
         wi.order_cutoff_date, b.name, wi.eggs_capacity,
         wi.eggs_allocated, wi.is_open, wi.is_locked, wi.e6_pickup_available
ORDER BY wi.delivery_monday, b.name;
```

**Usage**:
- Single query for admin calendar view
- Capacity bars
- Order drill-down

---

## Row-Level Security (RLS)

```sql
-- Public can view available inventory
CREATE POLICY "Anyone can view available weeks"
ON weekly_inventory FOR SELECT
TO public
USING (is_open = true);

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
ON egg_orders FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admin full access
CREATE POLICY "Admin full access"
ON weekly_inventory FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

---

## Audit Trail

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_record ON audit_log(record_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
```

---

## Summary of Changes from Original

### ✅ Added (Critical Improvements)

1. **`order_cutoff_date`** on `weekly_inventory` → Cleaner admin/UX logic
2. **`policy_version`** on `egg_orders` → Legal protection
3. **`is_test`** on `payment_transactions` → Sandbox separation
4. **`reserved` status + `reserved_until`** on `order_upsells` → Inventory collision prevention

### ✅ Kept (Already Excellent)

- Weekly inventory as core unit
- Allocation only on deposit_paid
- Explicit is_open vs is_locked
- Delivery Monday stored explicitly
- Pricing snapshots on order
- Unified payment_transactions
- Views for available_weeks and admin_week_overview
- Audit trail

---

## Next: Answer These Questions Before Step 2

**Please answer YES/NO**:

1. **Do you want "View by Week" as a first-class option on landing?**
   - Default: Browse by Breed
   - Alternative: Browse by Week (shows all breeds available in a specific week)

2. **Do you want numeric input + slider for quantity?**
   - Instead of slider-only (reduces mis-orders on mobile)

3. **Should upsell inventory be temporarily reserved during remainder checkout?**
   - Prevents "out of stock" frustration mid-payment

4. **Should admin past weeks be strictly read-only in UI?**
   - Prevents accidental reopening of past weeks

Once you answer, we proceed to **STEP 2: UX FLOWS** (detailed user journeys, no code).
