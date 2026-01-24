# Testing Order Modification Cutoff Behavior

This document describes how to test the order modification lock behavior with date mocking.

## Overview

Orders can be modified until the end of week 46, 2024. After this cutoff, all orders become read-only.

## Testing with Mock Date

The API endpoint `/api/orders/[id]` accepts an `x-mock-date` header to override the current date for testing purposes.

### Test Scenarios

#### 1. Before Cutoff (Can Edit)

Test that orders can be modified before the cutoff week:

```bash
# Mock date in week 45, 2024 (November 10, 2024)
curl -X PATCH \
  'http://localhost:3000/api/orders/YOUR_ORDER_ID' \
  -H 'Content-Type: application/json' \
  -H 'x-mock-date: 2024-11-10' \
  -H 'Cookie: tinglum_session=YOUR_SESSION_TOKEN' \
  -d '{
    "deliveryType": "shipping",
    "freshDelivery": true,
    "notes": "Test modification"
  }'

# Expected: 200 OK, order updated successfully
```

#### 2. During Cutoff Week (Can Edit)

Test that orders can still be modified during week 46:

```bash
# Mock date in week 46, 2024 (November 17, 2024)
curl -X PATCH \
  'http://localhost:3000/api/orders/YOUR_ORDER_ID' \
  -H 'Content-Type: application/json' \
  -H 'x-mock-date: 2024-11-17' \
  -H 'Cookie: tinglum_session=YOUR_SESSION_TOKEN' \
  -d '{
    "deliveryType": "pickup",
    "freshDelivery": false
  }'

# Expected: 200 OK, order updated successfully
```

#### 3. After Cutoff (Cannot Edit)

Test that orders are locked after week 46:

```bash
# Mock date in week 47, 2024 (November 25, 2024)
curl -X PATCH \
  'http://localhost:3000/api/orders/YOUR_ORDER_ID' \
  -H 'Content-Type: application/json' \
  -H 'x-mock-date: 2024-11-25' \
  -H 'Cookie: tinglum_session=YOUR_SESSION_TOKEN' \
  -d '{
    "deliveryType": "shipping"
  }'

# Expected: 403 Forbidden
# Response: {"error":"Order modification period has ended"}
```

#### 4. Future Year (Cannot Edit)

Test that orders are locked in future years:

```bash
# Mock date in 2025
curl -X PATCH \
  'http://localhost:3000/api/orders/YOUR_ORDER_ID' \
  -H 'Content-Type: application/json' \
  -H 'x-mock-date: 2025-01-15' \
  -H 'Cookie: tinglum_session=YOUR_SESSION_TOKEN' \
  -d '{
    "deliveryType": "pickup"
  }'

# Expected: 403 Forbidden
# Response: {"error":"Order modification period has ended"}
```

## Frontend Testing

The frontend automatically checks the cutoff date and shows/hides edit buttons accordingly.

### Manual Testing in Browser

1. **Before Cutoff**: Open browser DevTools and modify the date returned by `/api/config`:
   - Set cutoff to future week: `{"year": 2025, "week": 10}`
   - Visit `/min-side`
   - "Endre bestilling" button should be visible

2. **After Cutoff**: Modify config to past week:
   - Set cutoff to past week: `{"year": 2024, "week": 2}`
   - Visit `/min-side`
   - Lock icon and "Endringsperioden er utløpt" message should show
   - "Endre bestilling" button should not be visible

## Database Configuration

Update the cutoff date in the database:

```sql
-- Set cutoff to week 50, 2024
UPDATE app_config
SET value = '{"year": 2024, "week": 50, "reason": "Production schedule finalized"}'::jsonb
WHERE key = 'order_modification_cutoff';
```

Check current cutoff:

```sql
SELECT * FROM app_config WHERE key = 'order_modification_cutoff';
```

## Week Number Calculator

To determine the week number for any date:

```javascript
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

// Examples:
getWeekNumber(new Date('2024-11-10')); // Week 45, 2024
getWeekNumber(new Date('2024-11-17')); // Week 46, 2024
getWeekNumber(new Date('2024-11-25')); // Week 47, 2024
```

## Important Notes

1. The `x-mock-date` header is only for testing. In production, remove this feature or restrict it to admin users.
2. The frontend calculates weeks client-side, while the API uses server-side calculation.
3. Week numbers follow ISO 8601 standard.
4. Changes are persisted to `add_ons_json` column in the `orders` table.
5. `last_modified_at` timestamp is updated on every successful modification.
