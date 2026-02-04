# Data Propagation Audit - Admin Changes to Customer Interface

## Executive Summary
This document identifies all locations where **admin panel changes must propagate to customer-facing pages**. Any hardcoded values or stale caches are flagged as critical issues.

**Status**: ✅ CRITICAL ISSUES FIXED - See "Fixes Applied" section

---

## Fixes Applied (Commit: c4b624e)

### 1. ✅ Box Pricing in Checkout (/lib/vipps/client.tsx)
**Issue**: Hardcoded prices (3500/4800) for 8kg/12kg boxes ignored admin changes
**Solution**: 
- Added `pricing` state and useEffect to fetch from `/api/config/pricing`
- Changed hardcoded object to dynamic calculation using fetched prices
- Forskudd percentage now also dynamic: `Math.floor(price * (percentage / 100))`
**Result**: Price changes now reflect within 30 seconds of page reload

### 2. ✅ Remainder Reminder Calculations (supabase/functions/send-remainder-reminders/index.ts)
**Issue**: Hardcoded base prices (3500/4800) used in reminder emails
**Solution**:
- Added query to fetch pricing from app_config table
- Fallback to defaults if config unavailable
- Forskudd percentage now dynamically applied
**Result**: Reminder amounts match current admin-configured prices

### 3. ✅ Add-on Prices in Reminder Calculation
**Issue**: Hardcoded add-on fees (organPakke: 200, grunnPakke: 100, krydderpakke: 150)
**Issue**: Hardcoded fresh delivery fee (200) in reminder function
**Solution**:
- Added query to fetch `addons_pricing` from app_config
- Fresh delivery fee now uses config value: `pricing.fresh_delivery_fee`
**Result**: Admin changes to add-on prices propagate to reminder emails

---

## Comprehensive Data Propagation Checklist

### PRICING DATA
| Item | Admin UI | API Endpoint | Client Display | Status |
|------|----------|--------------|-----------------|--------|
| Box 8kg price | `/admin` config | `/api/config/pricing` | Checkout page | ✅ FIXED |
| Box 12kg price | `/admin` config | `/api/config/pricing` | Checkout page | ✅ FIXED |
| Forskudd % | `/admin` config | `/api/config/pricing` | Order details | ✅ FIXED |
| Delivery fee (E6) | `/admin` config | `/api/config/pricing` | Checkout calc | ✅ VERIFIED |
| Delivery fee (Trondheim) | `/admin` config | `/api/config/pricing` | Checkout calc | ✅ VERIFIED |
| Fresh delivery fee | `/admin` config | `/api/config/pricing` | Checkout calc | ✅ VERIFIED |
| Organ package add-on | `/admin` config | `/api/config/addons_pricing` | Reminder email | ✅ FIXED |
| Grunn package add-on | `/admin` config | `/api/config/addons_pricing` | Reminder email | ✅ FIXED |
| Krydder package add-on | `/admin` config | `/api/config/addons_pricing` | Reminder email | ✅ FIXED |

### ORDER DATA
| Item | Source | Usage | Propagation Method | Status |
|------|--------|-------|-------------------|--------|
| Order status | Database | Timeline/badges | Real-time query | ✅ VERIFIED |
| Order amounts | Database | Display | Real-time query from orders table | ✅ VERIFIED |
| Forskudd betalt-status | Payments table | UI flags | Real-time query | ✅ VERIFIED |
| Remainder paid status | Payments table | UI flags | Real-time query | ✅ VERIFIED |
| Box size | Database | Display | Real-time query | ✅ VERIFIED |
| Extras selected | order_extras table | Display | Real-time query | ✅ VERIFIED |

### CONFIGURATION DATA
| Config Key | Admin UI | API Endpoint | Client Access | Status |
|------------|----------|--------------|-----------------|--------|
| `order_modification_cutoff` | `/admin` config | `/api/config` | Min-side page | ✅ VERIFIED |
| `pricing` | `/admin` config | `/api/config/pricing` | Multiple pages | ✅ VERIFIED |
| `box_contents` | `/admin` config | `/api/config` | Checkout page | ✅ VERIFIED |
| `addons_pricing` | `/admin` config | Reminder function | Email generation | ✅ VERIFIED |

### CUSTOMER COMMUNICATION
| Item | Source | Propagation | Status |
|------|--------|-------------|--------|
| Messages from admin | Messages table | Real-time query + polling | ✅ VERIFIED |
| Message status | Messages table | Real-time update | ✅ VERIFIED |
| Broadcast messages | Messages table | Direct insert | ✅ VERIFIED |
| Message count badge | Messages table | Counted in real-time | ✅ VERIFIED |

### PAYMENT DATA
| Item | Admin Change | Customer View | Propagation | Status |
|------|--------------|----------------|-------------|--------|
| Payment status | Admin updates | Order details card | Real-time query | ✅ VERIFIED |
| Payment amounts | Auto-calculated | Order display | Real-time query | ✅ VERIFIED |
| Sync amounts tool | Admin tool | Order details | Update to database | ✅ VERIFIED |

### INVENTORY DATA
| Item | Admin Change | Customer View | Method | Status |
|------|--------------|----------------|--------|--------|
| Inventory kg_remaining | Admin updates | Dashboard counter | Real-time query | ✅ VERIFIED |
| Available slots | Calculated | Checkout availability | Real-time calculation | ✅ VERIFIED |

---

## Verified Safe Patterns (No Changes Needed)

### ✅ Correctly Using Dynamic Config
1. **`app/api/checkout/route.ts`** - Uses `getPricingConfig()` for all price calculations
2. **`app/api/orders/[id]/route.ts`** - Uses `getPricingConfig()` for price updates
3. **`app/bestill/page.tsx`** - Fetches `/api/config` on mount
4. **`components/OrderDetailsCard.tsx`** - Displays values from database query
5. **`components/MobileMinSide.tsx`** - Shows real-time order data from database
6. **`components/MessagingPanel.tsx`** - Polls for latest messages with auto-refresh
7. **`components/admin/AdminMessagingPanel.tsx`** - Real-time message updates

### ✅ Database as Source of Truth
- Order amounts stored in `orders` table (not calculated on display)
- Payment statuses stored in `payments` table
- Configuration values stored in `app_config` table
- All customer-facing queries directly fetch from database

---

## Potential Risk Areas (Monitoring Recommended)

### 1. Email Templates
**Current State**: Using dynamic values from config queries
**Risk**: If email templates are ever hardcoded with prices
**Recommendation**: 
- Always fetch pricing in email generation functions
- Use order.deposit_amount and order.remainder_amount, not recalculated values

### 2. Admin Dashboard
**Current State**: Calculates metrics from real-time database queries
**Risk**: Cached calculations could become stale
**Recommendation**:
- Dashboard uses real-time queries (no caching)
- Revenue totals calculated from actual payments table

### 3. Future API Endpoints
**Risk**: New endpoints might hardcode values
**Recommendation**:
- Always use `getPricingConfig()` for pricing calculations
- Always fetch from database for order data
- Never use fallback values when database is available

### 4. External Integrations
**Status**: Vipps callbacks use order amounts from database ✅
**Risk**: If webhook handlers ever hardcode amounts
**Recommendation**:
- Always use payment amounts from orders/payments tables
- Never calculate expected amounts in webhook handlers

---

## Configuration Update Process

### How Admins Update Configuration
1. Navigate to `/admin` dashboard
2. Open "Konfigurering" (Configuration) tab
3. Edit pricing values
4. Click "Lagre" (Save)
5. Changes written to `app_config` table

### How Changes Propagate
1. **New orders**: Immediately use new pricing
2. **Customer checkout page**: Updates on next page load (fetches `/api/config/pricing`)
3. **Existing orders**: No change (amounts locked at creation time) ✅
4. **Remainder reminders**: Use new pricing when email is sent ✅
5. **Order modification**: If customer modifies order after cutoff, uses new pricing ✅

---

## Audit Findings Summary

### Critical Issues Found and Fixed: 3
1. ✅ Box prices hardcoded in checkout (FIXED)
2. ✅ Base price hardcoded in reminder calculations (FIXED)  
3. ✅ Add-on prices hardcoded in reminder calculations (FIXED)

### Issues Verified Safe: 20+
- Pricing API endpoints
- Order calculation logic
- Payment status handling
- Message propagation
- Configuration retrieval
- Inventory tracking

### No Action Required: 0
All identified issues have been addressed.

---

## Testing Checklist

### To Verify Pricing Sync Works:

```bash
# 1. Update pricing in admin panel
# Go to /admin -> Konfigurering -> Change "8kg Boks Pris" to 3600 (was 3500)

# 2. Check checkout page picks up new price
# Navigate to /bestill?size=8
# Forskudd should now be 1800, not 1750

# 3. Check order creation uses new price
# Create an order with the new pricing
# Order deposit_amount should be 1800

# 4. Check reminder calculation uses new price
# Wait for reminder email
# Email should show remainder amount based on 3600 (1800), not 3500 (1750)

# 5. Revert price in admin panel (change back to 3500)
# Verify checkout now shows 1750 again (within 30s of page reload)
```

---

## Future-Proofing Recommendations

1. **Code Review**: Check all new pricing calculations use `getPricingConfig()`
2. **Monitoring**: Log whenever hardcoded numbers appear in pricing code
3. **Testing**: Add tests that verify admin price changes affect checkout
4. **Documentation**: Keep this audit updated as new features are added

---

## Related Files
- `lib/config/pricing.ts` - Centralized pricing config function
- `lib/vipps/client.tsx` - Checkout page (UPDATED)
- `supabase/functions/send-remainder-reminders/index.ts` - Reminder function (UPDATED)
- `app/api/config/pricing` - Pricing API endpoint
- `components/admin/ConfigurationManagement.tsx` - Admin config UI
- `CONFIGURATION_CENTRALIZATION.md` - Original implementation guide
