# Configuration Centralization - Implementation Summary

All hard-coded pricing values have been centralized into the admin panel configuration system. This ensures that all prices throughout the application are dynamically loaded from the database and can be managed from a single location.

## Changes Made

### 1. New Pricing Configuration Library
**File**: `lib/config/pricing.ts`
- Created centralized utility function `getPricingConfig()`
- Fetches all pricing configuration from the database
- Returns consistent pricing structure used throughout the app
- Includes fallback values only if database is unavailable

**Configuration Keys**:
- `box_8kg_price` - Base price for 8kg box
- `box_12kg_price` - Base price for 12kg box
- `box_8kg_deposit_percentage` - Deposit percentage for 8kg box
- `box_12kg_deposit_percentage` - Deposit percentage for 12kg box
- `delivery_fee_pickup_e6` - Fee for E6 pickup
- `delivery_fee_trondheim` - Fee for Trondheim delivery
- `fresh_delivery_fee` - Additional fee for fresh delivery

### 2. API Routes Updated

#### `app/api/checkout/route.ts`
- ✅ Imports `getPricingConfig()`
- ✅ Fetches dynamic pricing on each checkout
- ✅ Uses config values for base prices, delivery fees, and deposit calculation
- ✅ Calculates deposit based on configurable percentage

#### `app/api/orders/[id]/route.ts`
- ✅ Imports `getPricingConfig()`
- ✅ Uses dynamic pricing when updating order box size
- ✅ Handles both E6 and Trondheim delivery fees separately
- ✅ Calculates deposit based on configurable percentage

#### `app/api/orders/[id]/deposit/route.ts`
- ✅ Now uses `order.deposit_amount` directly
- ✅ Removed hard-coded 1% calculation
- ✅ Respects custom deposit amounts set in admin

#### `app/api/orders/[id]/remainder/route.ts`
- ✅ Now uses `order.remainder_amount` directly
- ✅ Removed all hard-coded price calculations
- ✅ Respects custom remainder amounts set in admin

#### `app/api/config/route.ts`
- ✅ Imports `getPricingConfig()`
- ✅ Returns full pricing configuration for client-side use
- ✅ Exposes all pricing fields in API response

#### `app/api/admin/box-config/route.ts`
- ✅ Imports `getPricingConfig()`
- ✅ Uses dynamic prices for default box configurations
- ✅ No more hard-coded 6490/8990 prices

### 3. Frontend Pages Updated

#### `app/bestill/page.tsx`
- ✅ Fetches pricing config from `/api/config` on page load
- ✅ Calculates prices dynamically from config
- ✅ Stores pricing in state for reactive updates
- ✅ All price displays use dynamic values

#### `app/bestill/bekreftelse/page.tsx`
- ✅ Uses `order.deposit_amount` from order data
- ✅ Removed hard-coded deposit calculation
- ✅ Shows actual paid deposit amount

### 4. Admin Panel Enhanced

#### `components/admin/ConfigurationManagement.tsx`
- ✅ Added fields for all 7 pricing configuration keys
- ✅ Separate fields for:
  - 8kg and 12kg box prices
  - 8kg and 12kg deposit percentages
  - E6 pickup fee
  - Trondheim delivery fee
  - Fresh delivery fee
- ✅ Updated price examples to show calculated deposits
- ✅ Saves all values to database

#### `app/api/admin/configuration/route.ts`
- ✅ GET endpoint returns all pricing fields
- ✅ POST endpoint saves all 7 pricing keys to database
- ✅ Uses correct default values (3500, 4800, etc.)
- ✅ Properly serializes all values as strings for database

## Database Schema

The following keys should exist in the `config` table:

```sql
-- Pricing configuration
INSERT INTO config (key, value) VALUES
  ('box_8kg_price', '3500'),
  ('box_12kg_price', '4800'),
  ('box_8kg_deposit_percentage', '50'),
  ('box_12kg_deposit_percentage', '50'),
  ('delivery_fee_pickup_e6', '300'),
  ('delivery_fee_trondheim', '200'),
  ('fresh_delivery_fee', '500');
```

## How It Works

### Server-Side (API Routes)
1. API routes call `getPricingConfig()` when processing orders
2. Function fetches latest values from database
3. Calculations use dynamic values
4. Orders are created with correct current prices

### Client-Side (Frontend)
1. Pages fetch config from `/api/config` on mount
2. Config stored in component state
3. All price displays use state values
4. Updates happen on page reload

### Admin Management
1. Admin opens Configuration tab
2. All pricing fields are editable
3. Clicking "Save" updates database via `/api/admin/configuration`
4. Changes apply immediately to new orders
5. Existing orders retain their original amounts

## Testing Checklist

To verify everything works:

- [ ] Open admin panel, go to Configuration tab
- [ ] Verify all 7 pricing fields are visible and editable
- [ ] Change a price (e.g., 8kg box to 3600)
- [ ] Click "Save all changes"
- [ ] Go to order page (/bestill)
- [ ] Verify price shows new value
- [ ] Complete an order
- [ ] Check that order was created with new price
- [ ] Change deposit percentage (e.g., 8kg to 25%)
- [ ] Save and create new order
- [ ] Verify deposit is calculated as 25% of base price

## Benefits

1. **Single Source of Truth**: All prices come from database config
2. **No Code Changes**: Price adjustments done through admin UI
3. **Consistent Pricing**: Same values used everywhere
4. **Historical Accuracy**: Existing orders keep original prices
5. **Flexible Deposits**: Deposit percentages can be adjusted per box size
6. **Separate Delivery Fees**: E6 pickup and Trondheim delivery have different fees

## Migration Notes

If the config keys don't exist in the database yet, they will be created with default values on first save. The system uses these defaults:

- 8kg box: kr 3500 (50% deposit = kr 1750)
- 12kg box: kr 4800 (50% deposit = kr 2400)
- E6 pickup: kr 300
- Trondheim delivery: kr 200
- Fresh delivery: kr 500

All fallback values in the code match these defaults to ensure consistency.
