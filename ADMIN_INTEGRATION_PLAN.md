# 🎯 Complete Admin Integration Plan
## Unified Pig + Egg Admin Dashboard

---

## Current State Analysis

### ✅ What Works (Pig Admin)
- Dashboard with metrics
- Order management (view, filter, bulk actions)
- Customer database
- System health monitoring
- Communication center
- Admin messaging panel
- Inventory management (seasonal, kg-based)
- Box configuration (8kg/12kg)
- Delivery calendar
- Rebate codes manager
- Extras catalog manager
- Notification settings
- Analytics

### ⚠️ What's Missing (Egg Admin)
- Dashboard metrics for eggs
- Order display (eggs use different schema)
- Inventory management (week-based, not seasonal)
- Breed management (CRUD operations)
- Week-based delivery calendar
- Analytics for egg orders
- No breed configuration UI
- No egg-specific extras

### 🎯 Current Product Mode Toggle
- ✅ UI toggle exists (Pigs | Eggs | Combined)
- ❌ Not connected to data filtering
- ❌ Not affecting which panels show

---

## Phase 1: Data Layer Integration

### 1.1 Unified Order Interface
**File:** `app/admin/page.tsx`

**Problem:** Current `Order` interface only supports pig boxes
```typescript
interface Order {
  box_size: number;  // ❌ Eggs don't have box_size
  ribbe_choice: string;  // ❌ Eggs don't have this
  // Missing egg-specific fields
}
```

**Solution:** Create unified order type
```typescript
interface UnifiedOrder {
  id: string;
  order_number: string;
  product_type: 'pig_box' | 'eggs';
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;

  // Pig-specific (optional)
  box_size?: number;
  ribbe_choice?: string;
  fresh_delivery?: boolean;
  extra_products?: any[];

  // Egg-specific (optional)
  breed_id?: string;
  breed_name?: string;
  quantity?: number;
  week_number?: number;
  delivery_monday?: Date;

  // Common fields
  status: string;
  delivery_type: string;
  notes: string;
  admin_notes: string;
  total_amount: number;
  deposit_amount: number;
  remainder_amount: number;
  created_at: string;
  locked_at: string | null;
  marked_delivered_at: string | null;
  at_risk: boolean;
  payments: any[];
}
```

### 1.2 Fetch Both Order Types
**File:** `app/admin/page.tsx` - Update `loadOrders()`

```typescript
async function loadOrders() {
  setOrdersLoading(true);
  try {
    // Fetch pig orders
    const pigResponse = await fetch(`/api/admin/orders?${params}`);
    const pigData = await pigResponse.json();
    const pigOrders = (pigData.orders || []).map(o => ({
      ...o,
      product_type: 'pig_box',
    }));

    // Fetch egg orders
    const eggResponse = await fetch(`/api/eggs/orders`);
    const eggData = await eggResponse.json();
    const eggOrders = (eggData || []).map(o => ({
      ...o,
      product_type: 'eggs',
      breed_name: o.egg_breeds?.name,
      delivery_type: o.delivery_method,
    }));

    // Combine and set
    const allOrders = [...pigOrders, ...eggOrders];
    setOrders(allOrders);
  } catch (error) {
    console.error('Failed to load orders:', error);
  } finally {
    setOrdersLoading(false);
  }
}
```

### 1.3 Filter Orders by Product Mode
**File:** `app/admin/page.tsx`

```typescript
const filteredOrders = useMemo(() => {
  let filtered = orders;

  // Filter by product mode
  if (productMode === 'pigs') {
    filtered = filtered.filter(o => o.product_type === 'pig_box');
  } else if (productMode === 'eggs') {
    filtered = filtered.filter(o => o.product_type === 'eggs');
  }
  // 'combined' shows all

  // Apply status filter
  if (statusFilter !== 'all') {
    filtered = filtered.filter(o => o.status === statusFilter);
  }

  // Apply search
  if (searchTerm) {
    filtered = filtered.filter(o =>
      o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  return filtered;
}, [orders, productMode, statusFilter, searchTerm]);
```

---

## Phase 2: Dashboard Metrics

### 2.1 Create Unified Dashboard Metrics
**File:** `components/admin/DashboardMetrics.tsx`

**Current:** Only shows pig metrics (boxes sold, revenue, etc.)

**Enhancement:** Add mode prop and show relevant metrics

```typescript
interface DashboardMetricsProps {
  productMode: 'pigs' | 'eggs' | 'combined';
  metrics: {
    pigs?: {
      totalOrders: number;
      totalRevenue: number;
      boxesSold: number;
      pendingDeposits: number;
    };
    eggs?: {
      totalOrders: number;
      totalRevenue: number;
      eggsSold: number;
      pendingDeposits: number;
      topBreed: string;
    };
  };
}

export function DashboardMetrics({ productMode, metrics }: DashboardMetricsProps) {
  if (productMode === 'pigs') {
    return <PigMetrics data={metrics.pigs} />;
  }

  if (productMode === 'eggs') {
    return <EggMetrics data={metrics.eggs} />;
  }

  // Combined view
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PigMetrics data={metrics.pigs} />
      <EggMetrics data={metrics.eggs} />
    </div>
  );
}
```

### 2.2 Create Egg Metrics Component
**File:** `components/admin/EggMetrics.tsx` (NEW)

```typescript
export function EggMetrics({ data }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        🥚 Egg Orders
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Orders"
          value={data.totalOrders}
          icon={ShoppingCart}
        />
        <MetricCard
          label="Revenue"
          value={`${data.totalRevenue.toLocaleString()} kr`}
          icon={TrendingUp}
        />
        <MetricCard
          label="Eggs Sold"
          value={data.eggsSold}
          icon={Package}
        />
        <MetricCard
          label="Top Breed"
          value={data.topBreed}
          icon={Star}
        />
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-900">
              {data.pendingDeposits} orders awaiting deposit
            </p>
            <p className="text-sm text-yellow-700">
              Follow up with customers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 2.3 Update Dashboard Data Fetching
**File:** `app/admin/page.tsx` - Update `loadDashboard()`

```typescript
async function loadDashboard() {
  setDashboardLoading(true);
  try {
    // Fetch pig metrics
    const pigResponse = await fetch('/api/admin/dashboard');
    const pigData = await pigResponse.json();

    // Fetch egg metrics
    const eggResponse = await fetch('/api/admin/eggs/dashboard');
    const eggData = await eggResponse.json();

    setDashboardMetrics({
      pigs: pigData,
      eggs: eggData,
    });
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  } finally {
    setDashboardLoading(false);
  }
}
```

### 2.4 Create Egg Dashboard API
**File:** `app/api/admin/eggs/dashboard/route.ts` (NEW)

```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Get total orders
    const { count: totalOrders } = await supabaseAdmin
      .from('egg_orders')
      .select('*', { count: 'exact', head: true });

    // Get total revenue
    const { data: orders } = await supabaseAdmin
      .from('egg_orders')
      .select('total_amount');

    const totalRevenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) / 100 || 0;

    // Get eggs sold
    const { data: ordersList } = await supabaseAdmin
      .from('egg_orders')
      .select('quantity');

    const eggsSold = ordersList?.reduce((sum, o) => sum + o.quantity, 0) || 0;

    // Get pending deposits
    const { count: pendingDeposits } = await supabaseAdmin
      .from('egg_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'deposit_paid');

    // Get top breed
    const { data: breedStats } = await supabaseAdmin
      .from('egg_orders')
      .select('breed_id, egg_breeds(name), quantity')
      .not('breed_id', 'is', null);

    const breedCounts = {};
    breedStats?.forEach(order => {
      const breedName = order.egg_breeds?.name || 'Unknown';
      breedCounts[breedName] = (breedCounts[breedName] || 0) + order.quantity;
    });

    const topBreed = Object.entries(breedCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    return NextResponse.json({
      totalOrders: totalOrders || 0,
      totalRevenue,
      eggsSold,
      pendingDeposits: pendingDeposits || 0,
      topBreed,
    });
  } catch (error: any) {
    console.error('Error fetching egg dashboard:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Phase 3: Orders Tab Enhancement

### 3.1 Update Order Table Display
**File:** `app/admin/page.tsx` - Orders tab section

**Current:** Shows pig-specific columns (box size, ribbe choice)

**Enhancement:** Dynamic columns based on product type

```typescript
function OrderRow({ order }: { order: UnifiedOrder }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={selectedOrders.has(order.id)}
          onChange={() => toggleOrderSelection(order.id)}
          className="rounded"
        />
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{order.order_number}</span>
          {order.product_type === 'eggs' && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              🥚 Egg
            </span>
          )}
          {order.product_type === 'pig_box' && (
            <span className="px-2 py-0.5 bg-pink-100 text-pink-800 text-xs rounded-full">
              🐷 Pig
            </span>
          )}
        </div>
      </td>

      <td className="px-6 py-4">
        <div>
          <div className="font-medium text-gray-900">{order.customer_name}</div>
          <div className="text-sm text-gray-500">{order.customer_email}</div>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        {order.product_type === 'pig_box' && (
          <span className="text-sm">{order.box_size} kg</span>
        )}
        {order.product_type === 'eggs' && (
          <div className="text-sm">
            <div className="font-medium">{order.breed_name}</div>
            <div className="text-gray-500">{order.quantity} eggs</div>
          </div>
        )}
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={order.status} />
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {order.product_type === 'pig_box' && order.delivery_type}
        {order.product_type === 'eggs' && (
          <div>
            <div>{order.delivery_type}</div>
            <div className="text-gray-500">Week {order.week_number}</div>
          </div>
        )}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        {(order.total_amount / 100).toLocaleString()} kr
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {new Date(order.created_at).toLocaleDateString('no-NO')}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => viewOrderDetail(order)}
          className="text-blue-600 hover:text-blue-900"
        >
          View
        </button>
      </td>
    </tr>
  );
}
```

### 3.2 Create Egg Order Detail Modal
**File:** `components/admin/EggOrderDetailModal.tsx` (NEW)

```typescript
export function EggOrderDetailModal({ order, onClose }) {
  return (
    <Modal isOpen onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            🥚 Egg Order {order.order_number}
          </h2>
          <button onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Customer Info */}
        <section className="mb-6">
          <h3 className="font-semibold mb-3">Customer</h3>
          <div className="space-y-2 text-sm">
            <div><strong>Name:</strong> {order.customer_name}</div>
            <div><strong>Email:</strong> {order.customer_email}</div>
            <div><strong>Phone:</strong> {order.customer_phone || 'N/A'}</div>
          </div>
        </section>

        {/* Breed & Delivery Info */}
        <section className="mb-6">
          <h3 className="font-semibold mb-3">Order Details</h3>
          <div className="space-y-2 text-sm">
            <div><strong>Breed:</strong> {order.breed_name}</div>
            <div><strong>Quantity:</strong> {order.quantity} eggs</div>
            <div><strong>Week:</strong> Week {order.week_number}, {order.year}</div>
            <div><strong>Delivery:</strong> {new Date(order.delivery_monday).toLocaleDateString('no-NO')}</div>
            <div><strong>Method:</strong> {order.delivery_method}</div>
          </div>
        </section>

        {/* Payment Info */}
        <section className="mb-6">
          <h3 className="font-semibold mb-3">Payment</h3>
          <div className="space-y-2 text-sm">
            <div><strong>Subtotal:</strong> {(order.subtotal / 100).toLocaleString()} kr</div>
            <div><strong>Delivery:</strong> {(order.delivery_fee / 100).toLocaleString()} kr</div>
            <div><strong>Total:</strong> {(order.total_amount / 100).toLocaleString()} kr</div>
            <div><strong>Deposit:</strong> {(order.deposit_amount / 100).toLocaleString()} kr</div>
            <div><strong>Remainder:</strong> {(order.remainder_amount / 100).toLocaleString()} kr</div>
          </div>
        </section>

        {/* Status */}
        <section className="mb-6">
          <h3 className="font-semibold mb-3">Status</h3>
          <StatusBadge status={order.status} />
        </section>

        {/* Notes */}
        {order.notes && (
          <section className="mb-6">
            <h3 className="font-semibold mb-3">Customer Notes</h3>
            <p className="text-sm text-gray-700">{order.notes}</p>
          </section>
        )}

        {/* Admin Notes */}
        <section>
          <h3 className="font-semibold mb-3">Admin Notes</h3>
          <textarea
            value={order.admin_notes || ''}
            onChange={(e) => updateAdminNotes(order.id, e.target.value)}
            className="w-full border rounded p-2 text-sm"
            rows={3}
            placeholder="Add internal notes..."
          />
        </section>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button className="btn-primary">
            Mark as Shipped
          </button>
          <button className="btn-secondary">
            Send Email
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

### 3.3 Unified Order Detail Modal
**File:** `components/admin/OrderDetailModal.tsx` - Update

```typescript
export function OrderDetailModal({ order, onClose }) {
  if (order.product_type === 'eggs') {
    return <EggOrderDetailModal order={order} onClose={onClose} />;
  }

  // Existing pig order modal
  return <PigOrderDetailModal order={order} onClose={onClose} />;
}
```

---

## Phase 4: Inventory Management

### 4.1 Create Egg Inventory Tab
**File:** `app/admin/page.tsx`

Add new tab:
```typescript
const tabs = [
  // ... existing tabs
  { id: 'egg-inventory', label: 'Egg Inventory', icon: Calendar },
  // ... rest
];
```

### 4.2 Create Egg Inventory Component
**File:** `components/admin/EggInventoryManagement.tsx` (NEW)

```typescript
export function EggInventoryManagement() {
  const [breeds, setBreeds] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedBreed, setSelectedBreed] = useState<string | null>(null);

  useEffect(() => {
    loadBreeds();
    loadInventory();
  }, []);

  async function loadBreeds() {
    const res = await fetch('/api/eggs/breeds');
    const data = await res.json();
    setBreeds(data);
  }

  async function loadInventory() {
    const res = await fetch('/api/eggs/inventory');
    const data = await res.json();
    setInventory(data);
  }

  const filteredInventory = selectedBreed
    ? inventory.filter(i => i.breed_id === selectedBreed)
    : inventory;

  return (
    <div className="space-y-6">
      {/* Breed Filter */}
      <div className="flex items-center gap-4">
        <label className="font-semibold">Filter by Breed:</label>
        <select
          value={selectedBreed || ''}
          onChange={(e) => setSelectedBreed(e.target.value || null)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Breeds</option>
          {breeds.map(breed => (
            <option key={breed.id} value={breed.id}>
              {breed.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary ml-auto"
        >
          <Plus className="w-4 h-4" />
          Add Inventory Week
        </button>
      </div>

      {/* Inventory Calendar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInventory.map(item => (
          <InventoryCard
            key={item.id}
            item={item}
            onUpdate={loadInventory}
          />
        ))}
      </div>
    </div>
  );
}

function InventoryCard({ item, onUpdate }) {
  const remaining = item.eggs_available - item.eggs_allocated;
  const percentage = (item.eggs_allocated / item.eggs_available) * 100;

  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{item.egg_breeds.name}</h3>
          <p className="text-sm text-gray-600">
            Week {item.week_number}, {item.year}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(item.delivery_monday).toLocaleDateString('no-NO')}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span>Allocated</span>
          <span>{item.eggs_allocated} / {item.eggs_available}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all",
              percentage >= 90 ? "bg-red-500" :
              percentage >= 70 ? "bg-yellow-500" :
              "bg-green-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {remaining} eggs remaining
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => editInventory(item)}
          className="flex-1 text-sm px-3 py-2 border rounded hover:bg-gray-50"
        >
          Edit
        </button>
        <button
          onClick={() => changeStatus(item)}
          className="flex-1 text-sm px-3 py-2 border rounded hover:bg-gray-50"
        >
          {item.status === 'open' ? 'Close' : 'Open'}
        </button>
      </div>
    </div>
  );
}
```

### 4.3 Show/Hide Inventory Based on Mode
**File:** `app/admin/page.tsx`

```typescript
{activeTab === 'inventory' && (
  <>
    {(productMode === 'pigs' || productMode === 'combined') && (
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">🐷 Pig Inventory</h2>
        <InventoryManagement />
      </div>
    )}

    {(productMode === 'eggs' || productMode === 'combined') && (
      <div>
        <h2 className="text-xl font-bold mb-4">🥚 Egg Inventory</h2>
        <EggInventoryManagement />
      </div>
    )}
  </>
)}
```

---

## Phase 5: Breed Management

### 5.1 Create Breeds Tab
**File:** `app/admin/page.tsx`

Add tab only visible in eggs/combined mode:
```typescript
const tabs = useMemo(() => {
  const baseTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    // ... existing
  ];

  // Add egg-specific tabs
  if (productMode === 'eggs' || productMode === 'combined') {
    baseTabs.push(
      { id: 'breeds', label: 'Breeds', icon: Tag }
    );
  }

  return baseTabs;
}, [productMode]);
```

### 5.2 Create Breed Management Component
**File:** `components/admin/BreedManagement.tsx` (NEW)

```typescript
export function BreedManagement() {
  const [breeds, setBreeds] = useState([]);
  const [editingBreed, setEditingBreed] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadBreeds();
  }, []);

  async function loadBreeds() {
    const res = await fetch('/api/admin/eggs/breeds');
    const data = await res.json();
    setBreeds(data);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Breed Management</h2>
        <button
          onClick={() => {
            setEditingBreed(null);
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add New Breed
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {breeds.map(breed => (
          <BreedCard
            key={breed.id}
            breed={breed}
            onEdit={() => {
              setEditingBreed(breed);
              setShowModal(true);
            }}
            onToggleActive={() => toggleBreedActive(breed)}
          />
        ))}
      </div>

      {showModal && (
        <BreedModal
          breed={editingBreed}
          onClose={() => setShowModal(false)}
          onSave={() => {
            loadBreeds();
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function BreedCard({ breed, onEdit, onToggleActive }) {
  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
          style={{ backgroundColor: breed.accent_color }}
        >
          {breed.name.charAt(0)}
        </div>
        <div className="flex gap-2">
          {breed.active ? (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Active
            </span>
          ) : (
            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
              Inactive
            </span>
          )}
        </div>
      </div>

      <h3 className="text-xl font-bold mb-2">{breed.name}</h3>
      <p className="text-sm text-gray-600 mb-4">{breed.description}</p>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Price:</span>
          <span className="font-semibold">{breed.price_per_egg / 100} kr/egg</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Min Order:</span>
          <span>{breed.min_order_quantity} eggs</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Egg Color:</span>
          <span>{breed.egg_color}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Production:</span>
          <span>{breed.annual_production}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-2 border rounded hover:bg-gray-50 text-sm"
        >
          Edit
        </button>
        <button
          onClick={onToggleActive}
          className="flex-1 px-3 py-2 border rounded hover:bg-gray-50 text-sm"
        >
          {breed.active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
}
```

---

## Phase 6: Analytics Enhancement

### 6.1 Mode-Specific Analytics
**File:** `app/admin/page.tsx` - Analytics tab

```typescript
{activeTab === 'analytics' && (
  <div className="space-y-8">
    {(productMode === 'pigs' || productMode === 'combined') && (
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          🐷 Pig Analytics
        </h2>
        <PigAnalytics data={analytics?.pigs} />
      </div>
    )}

    {(productMode === 'eggs' || productMode === 'combined') && (
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          🥚 Egg Analytics
        </h2>
        <EggAnalytics data={analytics?.eggs} />
      </div>
    )}
  </div>
)}
```

### 6.2 Create Egg Analytics Component
**File:** `components/admin/EggAnalytics.tsx` (NEW)

```typescript
export function EggAnalytics({ data }) {
  return (
    <div className="space-y-6">
      {/* Revenue Chart */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Revenue by Week</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data?.revenueByWeek}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="#78350F" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Breed Popularity */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Orders by Breed</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.ordersByBreed}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="breed" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="orders" fill="#78350F" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Avg Order Value</div>
          <div className="text-2xl font-bold">{data?.avgOrderValue} kr</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Conversion Rate</div>
          <div className="text-2xl font-bold">{data?.conversionRate}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Repeat Customers</div>
          <div className="text-2xl font-bold">{data?.repeatCustomers}%</div>
        </Card>
      </div>
    </div>
  );
}
```

---

## Phase 7: Shared Features

### 7.1 Unified Customer Database
**Current:** Works for both, just needs filtering

**Enhancement:**
```typescript
// In CustomerDatabase component
const filteredCustomers = customers.filter(customer => {
  // Filter by product mode
  if (productMode === 'pigs') {
    return customer.orders.some(o => o.product_type === 'pig_box');
  }
  if (productMode === 'eggs') {
    return customer.orders.some(o => o.product_type === 'eggs');
  }
  return true; // combined
});
```

### 7.2 Unified Communication Center
**Enhancement:** Add product type to messages

```typescript
// Tag messages with product type
<span className={cn(
  "px-2 py-1 text-xs rounded-full",
  message.product_type === 'eggs' ? "bg-yellow-100 text-yellow-800" : "bg-pink-100 text-pink-800"
)}>
  {message.product_type === 'eggs' ? '🥚' : '🐷'}
</span>
```

---

## Phase 8: API Endpoints

### 8.1 Required Egg Admin APIs
**Create these files:**

1. **`app/api/admin/eggs/breeds/route.ts`** - GET/POST/PUT/DELETE breeds
2. **`app/api/admin/eggs/inventory/route.ts`** - Manage inventory
3. **`app/api/admin/eggs/analytics/route.ts`** - Get analytics data
4. **`app/api/admin/eggs/dashboard/route.ts`** - Dashboard metrics (already planned)

### 8.2 Update Existing Admin APIs
**File:** `app/api/admin/orders/route.ts`

Add support for filtering by product type:
```typescript
const { searchParams } = new URL(request.url);
const productType = searchParams.get('product_type');

if (productType === 'eggs') {
  // Fetch from egg_orders
} else if (productType === 'pig_box') {
  // Fetch from orders (existing)
} else {
  // Fetch both and combine
}
```

---

## Implementation Order

### Week 1: Foundation
**Days 1-2:**
- [ ] Phase 1: Data Layer Integration
  - Update Order interface
  - Fetch both order types
  - Filter by product mode

**Days 3-4:**
- [ ] Phase 2: Dashboard Metrics
  - Create egg dashboard API
  - Create EggMetrics component
  - Update DashboardMetrics with mode support

**Day 5:**
- [ ] Phase 3.1: Orders Tab Enhancement
  - Update order table display
  - Dynamic columns

### Week 2: Core Features
**Days 1-2:**
- [ ] Phase 3.2-3.3: Order Details
  - Create EggOrderDetailModal
  - Unified modal routing

**Days 3-5:**
- [ ] Phase 4: Inventory Management
  - Create EggInventoryManagement component
  - Inventory card UI
  - Add/edit inventory modals

### Week 3: Advanced Features
**Days 1-3:**
- [ ] Phase 5: Breed Management
  - Create BreedManagement component
  - Breed cards
  - Add/edit breed modals
  - Breed CRUD APIs

**Days 4-5:**
- [ ] Phase 6: Analytics
  - Create EggAnalytics component
  - Analytics API
  - Charts and visualizations

### Week 4: Polish & Integration
**Days 1-2:**
- [ ] Phase 7: Shared Features
  - Update customer database filtering
  - Update communication center
  - Update notification settings

**Days 3-4:**
- [ ] Phase 8: API Endpoints
  - Complete all admin APIs
  - Test thoroughly
  - Add error handling

**Day 5:**
- [ ] Testing & Refinement
  - End-to-end testing
  - Bug fixes
  - Performance optimization

---

## Testing Checklist

### Dashboard
- [ ] Pig metrics show correctly in Pigs mode
- [ ] Egg metrics show correctly in Eggs mode
- [ ] Both show in Combined mode
- [ ] Mode toggle updates metrics

### Orders
- [ ] Pig orders visible in Pigs mode
- [ ] Egg orders visible in Eggs mode
- [ ] Both visible in Combined mode
- [ ] Order detail modal shows correct info for each type
- [ ] Bulk actions work for filtered orders

### Inventory
- [ ] Pig inventory shows in Pigs/Combined mode
- [ ] Egg inventory shows in Eggs/Combined mode
- [ ] Can add/edit egg inventory
- [ ] Week-based calendar works
- [ ] Status changes update correctly

### Breeds
- [ ] Breed tab only shows in Eggs/Combined mode
- [ ] Can view all breeds
- [ ] Can add new breed
- [ ] Can edit existing breed
- [ ] Can activate/deactivate breed
- [ ] Changes reflect in customer site

### Analytics
- [ ] Pig analytics in Pigs mode
- [ ] Egg analytics in Eggs mode
- [ ] Both in Combined mode
- [ ] Charts render correctly
- [ ] Data updates live

### Shared Features
- [ ] Customers filtered by product type
- [ ] Messages tagged with product type
- [ ] Activity log shows both types
- [ ] System health monitors both

---

## File Structure Summary

```
app/
├── admin/
│   └── page.tsx                    [MODIFY: Add mode filtering]
├── api/
│   ├── admin/
│   │   ├── eggs/
│   │   │   ├── dashboard/
│   │   │   │   └── route.ts        [NEW]
│   │   │   ├── breeds/
│   │   │   │   └── route.ts        [NEW]
│   │   │   ├── inventory/
│   │   │   │   └── route.ts        [NEW]
│   │   │   └── analytics/
│   │   │       └── route.ts        [NEW]
│   │   └── orders/
│   │       └── route.ts            [MODIFY: Support product_type]
│   └── eggs/
│       └── ...                     [EXISTING: Already created]

components/
├── admin/
│   ├── DashboardMetrics.tsx        [MODIFY: Add mode support]
│   ├── EggMetrics.tsx              [NEW]
│   ├── OrderDetailModal.tsx        [MODIFY: Route by type]
│   ├── EggOrderDetailModal.tsx     [NEW]
│   ├── InventoryManagement.tsx     [EXISTING: Pig inventory]
│   ├── EggInventoryManagement.tsx  [NEW]
│   ├── BreedManagement.tsx         [NEW]
│   ├── EggAnalytics.tsx            [NEW]
│   ├── CustomerDatabase.tsx        [MODIFY: Filter by type]
│   └── CommunicationCenter.tsx     [MODIFY: Tag by type]
```

---

## Success Criteria

✅ **Functional:**
- Admin can toggle between Pigs, Eggs, Combined
- All data filters correctly based on mode
- Egg-specific features (breeds, week inventory) work
- Pig features remain fully functional
- No breaking changes to existing pig admin

✅ **UX:**
- Mode toggle is prominent and intuitive
- Clear visual distinction between product types
- Consistent design language
- Fast mode switching (< 100ms)

✅ **Code Quality:**
- TypeScript types for all new components
- Reusable components where possible
- No code duplication
- Comprehensive error handling

✅ **Performance:**
- Lazy load egg data only when needed
- Optimistic UI updates
- Pagination for large datasets

---

## Risk Mitigation

**Risk 1:** Breaking existing pig admin
- **Mitigation:** Keep pig code intact, add egg code alongside
- **Test:** Full regression test suite before launch

**Risk 2:** Performance degradation with dual data
- **Mitigation:** Lazy loading, conditional fetching based on mode
- **Test:** Load test with 1000+ orders of each type

**Risk 3:** UI confusion between products
- **Mitigation:** Clear visual indicators (emoji, colors, badges)
- **Test:** User testing with non-technical admin

**Risk 4:** Data inconsistency
- **Mitigation:** Transaction handling, rollback on errors
- **Test:** Chaos testing, network failure scenarios

---

## Next Immediate Action

**Start with Phase 1, Day 1:**

1. Update `Order` interface in `app/admin/page.tsx`
2. Modify `loadOrders()` to fetch both types
3. Add `filteredOrders` useMemo with mode filtering
4. Test order display switches correctly

**Estimated time:** 2-3 hours

**Want me to implement Phase 1 now?** 🚀
