# Payment Status Fix - Critical Issue

## Problem

When a user's Vipps payment fails or is cancelled, they are still redirected to the confirmation page which shows "Betaling mottatt!" (Payment received!) even though the payment is still `pending` in the database.

### Root Cause

1. **Return URL always redirects**: Vipps `returnUrl` is set to `/bestill/bekreftelse?orderId={order.id}` which takes users to the confirmation page regardless of payment outcome
2. **Confirmation page showed success prematurely**: The page checked `order.status === 'deposit_paid'` to show success, but should check the actual `payment.status`
3. **Webhook delay**: The webhook that updates order status from `draft` to `deposit_paid` only fires when payment succeeds, creating a race condition

### What Happens

**Failed Payment Flow:**
1. User initiates deposit payment
2. Payment record created with `status: 'pending'`
3. User goes to Vipps, payment fails (bank rejection, user cancels, etc.)
4. Vipps redirects to `/bestill/bekreftelse?orderId=xxx` anyway
5. Confirmation page loads and shows success because code wasn't checking payment status properly
6. **Order shows as "paid" in admin even though payment is pending!**

## Solution Implemented

### 1. Updated Confirmation Page (`app/bestill/bekreftelse/page.tsx`)

**Changed title based on actual payment status:**
```typescript
// BEFORE - Only checked order.status
<h1>
  {order.status === 'deposit_paid' || order.status === 'paid' ? 'Betaling mottatt!' : 'Ordre opprettet!'}
</h1>

// AFTER - Checks actual payment.status
<h1>
  {paymentStatus === 'completed' ? 'Betaling mottatt!' :
   paymentStatus === 'failed' ? 'Betaling feilet' :
   'Venter på betalingsbekreftelse...'}
</h1>
```

**Updated status indicators:**
- ✅ Green checkmark = Payment completed
- ⏳ Yellow clock = Payment pending (waiting for confirmation)
- ❌ Red X = Payment failed

**Added clear status messages:**
- **Pending**: Explains payment is being processed, could mean cancelled/blocked
- **Failed**: Clear error message
- **Draft but payment completed**: Shows "updating status..." message

### 2. Payment Status Logic

The page now uses the `paymentStatus` state which is derived from:
```typescript
const depositPayment = data.payments?.find(p => p.payment_type === 'deposit');
if (depositPayment) {
  setPaymentStatus(depositPayment.status); // 'pending', 'completed', or 'failed'
}
```

### 3. Polling for Updates

The page polls the API every 3 seconds for up to 30 seconds to catch webhook updates:
```typescript
// Automatically refreshes when webhook updates payment status
useEffect(() => {
  if (paymentStatus === 'completed') return; // Stop if completed

  const interval = setInterval(async () => {
    // Check for payment status update
    if (depositPayment.status === 'completed') {
      setPaymentStatus('completed');
      setOrder(updatedData);
    }
  }, 3000);
}, [paymentStatus]);
```

## Testing Checklist

- [x] Fixed confirmation page to show correct status
- [ ] Test with successful payment - should show green ✅ "Betaling mottatt!"
- [ ] Test with cancelled payment - should show yellow ⏳ "Venter på betalingsbekreftelse..."
- [ ] Test with bank rejection - should show yellow ⏳ then auto-update when webhook fails it
- [ ] Verify admin panel doesn't show pending payments as paid
- [ ] Test that polling catches webhook updates within 30 seconds

## Additional Recommendations

### 1. Add Payment Status to Admin Panel

The admin should clearly show payment status:
```typescript
// In OrderDetailModal or orders list
{depositPayment && (
  <span className={
    depositPayment.status === 'completed' ? 'bg-green-100 text-green-800' :
    depositPayment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800'
  }>
    {depositPayment.status === 'completed' ? '✅ Betalt' :
     depositPayment.status === 'pending' ? '⏳ Venter' :
     '❌ Feilet'}
  </span>
)}
```

### 2. Consider Alternative Return URLs

Vipps supports different return URLs based on outcome:
- `returnUrl` - Always called after user interaction
- Could check query params from Vipps to determine outcome before showing success

### 3. Add Manual Payment Retry

For pending/failed payments, add a "Prøv igjen" button:
```typescript
{paymentStatus === 'pending' || paymentStatus === 'failed' && (
  <button onClick={retryPayment}>
    Prøv betaling igjen
  </button>
)}
```

### 4. Webhook Verification

Currently webhook verification is commented out (line 59-60 in webhook route):
```typescript
// TODO: Verify callbackAuthorizationToken matches what we sent
```

This should be implemented to prevent fake webhook calls.

## Database State After Fix

**Pending Payment:**
- `orders.status` = `'draft'`
- `payments.status` = `'pending'`
- Admin sees: "Utkast" (Draft)
- User sees: "⏳ Venter på betalingsbekreftelse..."

**Completed Payment (after webhook):**
- `orders.status` = `'deposit_paid'`
- `payments.status` = `'completed'`
- Admin sees: "Depositum betalt"
- User sees: "✅ Betaling mottatt!"

## Impact

**Before Fix:**
- ❌ False positives - users think payment succeeded when it didn't
- ❌ Admin confusion - orders show as paid but no money received
- ❌ Customer support issues - "I paid but you say I didn't"

**After Fix:**
- ✅ Accurate status display
- ✅ Clear messaging for pending/failed states
- ✅ Automatic updates when webhook arrives
- ✅ Admin sees true payment state
