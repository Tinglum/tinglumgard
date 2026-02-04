# Referral System Implementation Guide

## ✅ Completed

1. **Database Migration** - `supabase/migrations/20260130_create_referral_system.sql`
2. **API Endpoints**:
   - `GET/POST /api/referrals` - Manage user's referral code
   - `POST /api/referrals/validate` - Validate code during checkout
3. **Components**:
   - `ReferralCodeInput.tsx` - Input component for checkout
   - `ReferralDashboard.tsx` - Full dashboard for Min Side

## 🚧 TODO: Integration Steps

### Step 1: Add Referral Tab to Min Side

**File:** `app/min-side/page.tsx`

Add a new tab for referrals:

```tsx
import { ReferralDashboard } from '@/components/ReferralDashboard';

// Add to tabs
const tabs = [
  { id: 'orders', label: 'Mine bestillinger' },
  { id: 'referrals', label: 'Vennerabatt', icon: Gift },
];

// In the tab content:
{activeTab === 'referrals' && <ReferralDashboard />}
```

### Step 2: Add Referral Code Input to Checkout

**File:** `app/bestill/page.tsx`

1. Import the component:
```tsx
import { ReferralCodeInput } from '@/components/ReferralCodeInput';
```

2. Add state for referral:
```tsx
const [referralData, setReferralData] = useState<{
  code: string;
  discountPercentage: number;
  discountAmount: number;
  referrerUserId: string;
} | null>(null);
```

3. Calculate adjusted forskudd:
```tsx
const depositAmount = calculateDeposit(boxSize, pricing);
const referralDiscount = referralData?.discountAmount || 0;
const finalDepositAmount = depositAmount - referralDiscount;
```

4. Add the input component (place before payment section):
```tsx
<ReferralCodeInput
  depositAmount={depositAmount}
  onCodeApplied={setReferralData}
  onCodeRemoved={() => setReferralData(null)}
/>
```

5. Update the summary display:
```tsx
<div className="space-y-2">
  <div className="flex justify-between">
    <span>Forskudd (50%)</span>
    <span>{depositAmount.toLocaleString('nb-NO')} kr</span>
  </div>
  {referralData && (
    <div className="flex justify-between text-green-600">
      <span>Vennerabatt (-20%)</span>
      <span>-{referralDiscount.toLocaleString('nb-NO')} kr</span>
    </div>
  )}
  <div className="flex justify-between font-bold text-lg border-t pt-2">
    <span>Totalt å betale nå</span>
    <span>{finalDepositAmount.toLocaleString('nb-NO')} kr</span>
  </div>
</div>
```

### Step 3: Update Order Creation API

**File:** `app/api/orders/route.ts` (or wherever orders are created)

1. Accept referral data in the request:
```tsx
const {
  /* existing fields */,
  referralCode,
  referralDiscount,
  referredByUserId
} = await request.json();
```

2. Create the order with referral fields:
```tsx
const { data: order } = await supabaseAdmin
  .from('orders')
  .insert({
    // ... existing fields
    referral_code_used: referralCode,
    referral_discount_amount: referralDiscount || 0,
    referred_by_user_id: referredByUserId,
    deposit_amount: depositAmount - (referralDiscount || 0),
  })
  .select()
  .single();
```

3. Create referral tracking record:
```tsx
if (referralCode && referredByUserId) {
  // Get the referral code record
  const { data: codeRecord } = await supabaseAdmin
    .from('referral_codes')
    .select('*')
    .eq('code', referralCode)
    .single();

  // Calculate credit for referrer (10% of original forskudd)
  const creditAmount = Math.round(depositAmount * 0.10);

  // Create referral tracking
  await supabaseAdmin
    .from('referrals')
    .insert({
      referral_code_id: codeRecord.id,
      referrer_user_id: referredByUserId,
      referee_user_id: session.userId,
      order_id: order.id,
      order_number: order.order_number,
      discount_percentage: 20.00,
      discount_amount_nok: referralDiscount,
      credit_percentage: 10.00,
      credit_amount_nok: creditAmount,
      referee_name: session.name,
      referee_phone: session.phoneNumber,
      referee_email: session.email,
    });
}
```

### Step 4: Update Vipps Payment Amount

**File:** Wherever Vipps payment is initiated

Make sure to use the `finalDepositAmount` (after referral discount) when creating the Vipps payment:

```tsx
const vippsAmount = depositAmount - (referralDiscount || 0);

// Pass to Vipps API
const paymentData = {
  amount: vippsAmount * 100, // Convert to øre
  // ... other fields
};
```

### Step 5: Show Credits on Remainder Payment

**File:** `components/OrderDetailsCard.tsx` or remainder payment component

1. Fetch available credits for user:
```tsx
const { data: referralData } = await fetch('/api/referrals');
const creditsAvailable = referralData?.stats?.creditsAvailable || 0;
```

2. Display credit option:
```tsx
{creditsAvailable > 0 && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold text-green-900">Vennerabatt kreditt tilgjengelig</p>
        <p className="text-sm text-green-700">
          Du har {creditsAvailable.toLocaleString('nb-NO')} kr i kreditt fra henvisninger
        </p>
      </div>
      <Button onClick={() => setApplyCredit(true)}>
        Bruk kreditt
      </Button>
    </div>
  </div>
)}
```

3. Apply credit to remainder:
```tsx
const remainderAmount = order.remainder_amount;
const creditToApply = Math.min(creditsAvailable, remainderAmount);
const finalRemainder = remainderAmount - creditToApply;
```

4. Update referrals when credit is used:
```tsx
// After successful payment with credit
await supabaseAdmin
  .from('referrals')
  .update({
    credit_applied: true,
    credit_applied_to_order_id: orderId,
    credit_applied_at: new Date().toISOString(),
  })
  .eq('referrer_user_id', userId)
  .eq('credit_applied', false)
  .limit(creditsUsedCount); // Apply to oldest first
```

## Database Setup

Run this in Supabase SQL Editor:

```sql
-- Run the migration
\i supabase/migrations/20260130_create_referral_system.sql
```

Or copy/paste the contents of the migration file.

## Testing Checklist

- [ ] Create a referral code in Min Side
- [ ] Copy the code
- [ ] Use it in checkout as a new customer (should show 20% discount)
- [ ] Verify referrer sees the referral in their dashboard
- [ ] Verify credit is added to referrer's account
- [ ] Apply credit to remainder payment
- [ ] Test validation: Cannot use own code
- [ ] Test validation: Cannot use if existing customer
- [ ] Test limit: After 5 referrals, see "unused bonus" message
- [ ] Test ordering another box increases limit by 5

## Key Business Rules

1. **New customers only** - Validated by checking orders table
2. **20% discount on forskudd** - Applied at checkout
3. **10% credit to referrer** - Stored for later use
4. **5 credits per box** - max_uses increases with each box ordered
5. **No self-referral** - Database constraint prevents this
6. **Cannot stack codes** - Only one referral code per order
7. **Credits can roll over** - Can save for next season or use on remainder

## Email Notifications (Optional Enhancement)

Consider adding:
- Email to referrer when someone uses their code
- Email to referee confirming their discount
- Email when credits are available to use

## Analytics to Track

- Total referrals generated
- Conversion rate of referral codes
- Average customer acquisition cost via referrals
- Most successful referrers (leaderboard?)
