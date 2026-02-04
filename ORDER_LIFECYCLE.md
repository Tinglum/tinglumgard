# Tinglumgard Order Lifecycle Documentation

This document explains the complete order lifecycle, including when emails are sent, what status messages are shown, and where orders can be found.

## Order Statuses

The system uses the following order statuses:

| Status | Description | When Set |
|--------|-------------|----------|
| `draft` | Order created, awaiting deposit payment | When order is first created in checkout |
| `deposit_paid` | Deposit (50%) has been paid | When Vipps deposit webhook confirms payment |
| `paid` | Full payment completed | When Vipps remainder webhook confirms payment |
| `ready_for_pickup` | Order is ready for pickup/delivery | Manually set by admin |
| `completed` | Order has been picked up/delivered | Manually set by admin |
| `cancelled` | Order has been cancelled | Manually set by admin or system |

## Complete Order Flow

### 1. Order Creation (Status: `draft`)

**What Happens:**
- User completes checkout form on `/bestill`
- Order is created with `user_id: null` (anonymous order)
- Inventory is deducted
- Order status set to `draft`
- User redirected to Vipps Checkout for deposit payment

**Email Sent:**
✓ Order confirmation email (ONLY if customer email was provided in checkout form)
- Subject: "Bestilling mottatt - [ORDER_NUMBER]"
- Content: Order details, deposit amount, next steps
- Sent from: `app/api/checkout/route.ts:136-160`

**Where to Find Order:**
- Confirmation page: `/bestill/bekreftelse?orderId=[ID]` (accessible without login for anonymous orders)
- My Orders page: Not yet visible (no user_id linkage)

**UI Messages:**
- Confirmation page shows: "Ordre opprettet!"
- Status: "Venter på forskudd"
- Warning banner: "Betaling ikke fullført"

---

### 2. Deposit Payment (Status: `draft` → `deposit_paid`)

**What Happens:**
- User completes payment in Vipps Checkout
- Vipps sends webhook to `/api/webhooks/vipps`
- Payment record status updated from `pending` to `completed`
- Order status updated to `deposit_paid`
- If user is logged in (via Vipps OAuth), order is linked to their user_id

**Email Sent:**
✓ Deposit confirmation email
- Subject: "Forskudd bekreftet - [ORDER_NUMBER]"
- Content: Deposit amount confirmed, remainder amount, next steps, link to My Orders
- Sent from: `app/api/webhooks/vipps/route.ts` (after payment verification)

**Where to Find Order:**
- Confirmation page: `/bestill/bekreftelse?orderId=[ID]`
- My Orders page: `/min-side` (if user is logged in with Vipps)

**UI Messages:**
- Confirmation page shows: "Betaling mottatt!"
- Status: "Forskudd betalt - venter på rest"
- Success banner: "Forskudd bekreftet! ✓"
- Step 1: "Forskudd betalt ✓"

---

### 3. Remainder Payment (Status: `deposit_paid` → `paid`)

**What Happens:**
- User clicks "Betal restbeløp" button on My Orders page
- Redirected to Vipps Checkout for remainder payment
- Vipps sends webhook to `/api/webhooks/vipps`
- Payment record status updated to `completed`
- Order status updated to `paid`

**Email Sent:**
✓ Remainder payment confirmation email
- Subject: "Betaling fullført - [ORDER_NUMBER]"
- Content: Total amount paid, pickup information, order locking information
- Sent from: `app/api/webhooks/vipps/route.ts` (after payment verification)

**Where to Find Order:**
- My Orders page: `/min-side`
- Confirmation page: `/bestill/bekreftelse?orderId=[ID]`

**UI Messages:**
- Confirmation page shows: "Betaling mottatt!"
- Status: "Fullstendig betalt"
- Success banner: "Fullstendig betalt! ✓"

---

### 4. Order Locking (Status: remains `paid`)

**What Happens:**
- Automated cron job runs ~2 weeks before pickup date
- Orders are locked (no more modifications allowed)
- `locked_at` timestamp is set

**Email Sent:**
✓ Order locked notification (via scheduled Supabase function)
- Subject: "Ordre [ORDER_NUMBER] låst - Ferdigstilt"
- Content: Order finalized, no more changes, preparing for pickup
- Template: `lib/email/templates.ts:getOrderLockedTemplate()`

**Where to Find Order:**
- My Orders page: `/min-side` (with lock icon, no edit button)

**UI Messages:**
- My Orders page shows lock icon
- Edit button hidden
- Status badge indicates order is locked

---

### 5. Ready for Pickup (Status: `paid` → `ready_for_pickup`)

**What Happens:**
- Admin manually marks order as ready via admin panel
- Order status updated to `ready_for_pickup`

**Email Sent:**
❌ No email currently sent (TODO: Add pickup ready notification)

**Where to Find Order:**
- My Orders page: `/min-side`

**UI Messages:**
- Status: "Klar for henting"

---

### 6. Order Completed (Status: `ready_for_pickup` → `completed`)

**What Happens:**
- Admin manually marks order as completed when picked up/delivered
- Order status updated to `completed`
- `marked_delivered_at` timestamp is set

**Email Sent:**
❌ No email currently sent (TODO: Add delivery confirmation email)

**Where to Find Order:**
- My Orders page: `/min-side`

**UI Messages:**
- Status: "Fullført"

---

## Email Configuration

### Current Status

The email system is configured but **requires valid Mailgun credentials** to function.

**Current configuration in `.env.local`:**
```
MAILGUN_API_KEY=your-mailgun-api-key  ← NEEDS TO BE REPLACED
MAILGUN_DOMAIN=yourdomain.com        ← NEEDS TO BE REPLACED
EMAIL_FROM=noreply@yourdomain.com    ← NEEDS TO BE REPLACED
```

### How to Fix Email Sending

1. **Get a Mailgun API key:**
   - Sign up at https://app.mailgun.com
   - Create a new API key
   - Verify your sending domain (e.g., `tinglum.no`)

2. **Update `.env.local`:**
   ```bash
   MAILGUN_API_KEY=key_your_actual_api_key_here
   MAILGUN_DOMAIN=tinglum.no
   EMAIL_FROM=noreply@tinglum.no  # or your verified domain
   ```

3. **Redeploy the application** for environment variables to take effect

### Email Templates

All email templates are defined in `lib/email/templates.ts`:
- `getOrderConfirmationTemplate()` - Initial order confirmation
- `getRemainderReminderTemplate()` - Reminder to pay remainder (sent via scheduled job)
- `getOrderLockedTemplate()` - Order has been locked notification

Deposit and remainder confirmation emails are defined inline in the webhook handler at `app/api/webhooks/vipps/route.ts`.

---

## Finding Orders Throughout the Lifecycle

### Anonymous Orders (No Login)
- **Immediately after checkout:** Users can access the confirmation page via the URL they're redirected to
- **Later access:** Cannot find order without login (no user_id linkage)

### Logged-in Orders (Via Vipps OAuth)
- **My Orders page:** All orders linked to the user's Vipps account
- **Confirmation page:** Accessible via direct URL
- **Order linking:** Anonymous orders are automatically linked when user logs in and accesses the order

### Order Visibility Rules

Defined in `app/api/orders/[id]/route.ts:31-49`:

1. **Authenticated users:** Can see orders where `user_id` matches their session
2. **Anonymous orders:** Can be accessed by anyone, then auto-linked if user is logged in
3. **Other users' orders:** Returns 404 (not found) for security

---

## Payment Status Polling

The confirmation page includes payment status polling to handle delayed webhooks:

- **Location:** `app/bestill/bekreftelse/page.tsx:53-82`
- **Interval:** Every 3 seconds
- **Max attempts:** 10 times (30 seconds total)
- **Purpose:** Webhooks from Vipps can be delayed, polling provides immediate UI updates

---

## Webhook Processing

**Endpoint:** `/api/webhooks/vipps`

**Process:**
1. Receive webhook payload from Vipps
2. Extract `sessionId` or `reference` from payload
3. Find payment record by `vipps_session_id`
4. Update payment status to `completed`
5. Update order status based on payment type:
   - Deposit → `deposit_paid`
   - Remainder → `paid`
6. Send confirmation email to customer
7. Return 200 OK to Vipps

**Error Handling:**
- If payment not found: Return 404
- If order update fails: Return 500
- If email fails: Log error but don't fail webhook (return 200 OK)

---

## TODO: Improvements Needed

### High Priority
- [ ] Configure Mailgun credentials in production environment
- [ ] Test complete email flow end-to-end
- [ ] Add pickup ready notification email
- [ ] Add delivery confirmation email

### Medium Priority
- [ ] Add order search functionality for admins
- [ ] Implement order history view for users
- [ ] Add email notification preferences

### Low Priority
- [ ] Add SMS notifications (alternative to email)
- [ ] Create email templates with farm branding
- [ ] Add order tracking timeline visualization

---

## Testing the Order Flow

### Manual Testing Steps

1. **Create Order:**
   - Go to `/bestill`
   - Fill out form with test email
   - Complete checkout
   - Verify order confirmation email received

2. **Pay Deposit:**
   - Complete Vipps payment (test mode)
   - Wait for webhook (check Netlify function logs)
   - Verify deposit confirmation email received
   - Check confirmation page updates status

3. **Login with Vipps:**
   - Click "Logg inn med Vipps" on My Orders page
   - Complete OAuth flow
   - Verify order appears in My Orders list

4. **Pay Remainder:**
   - Click "Betal restbeløp" button
   - Complete Vipps payment
   - Verify remainder confirmation email received
   - Check order status updates to "Fullstendig betalt"

5. **Check Order Visibility:**
   - Verify order appears on My Orders page
   - Verify confirmation page accessible via URL
   - Test editing order details (before cutoff)

---

## Support Information

If customers report issues with:
- **Not receiving emails:** Check Mailgun API key configuration and email logs
- **Cannot find order:** Ensure they're logged in with Vipps, check user_id linkage
- **Payment not updating:** Check webhook logs, verify Vipps credentials
- **Cannot edit order:** Verify cutoff date configuration, check locked_at status
