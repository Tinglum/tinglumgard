# Scheduling, Remainder Payment & Emails - Setup Guide

## Overview

This implementation adds automated scheduling for remainder payment reminders, order locking, and at-risk detection.

---

## Environment Variables

Add the following to your `.env` file:

```bash
# Email Service (Mailgun)
MAILGUN_API_KEY=key-...
MAILGUN_DOMAIN=tinglum.com
MAILGUN_REGION=eu
EMAIL_FROM=post@tinglum.com

# App URL (for email links and payment returns)
NEXT_PUBLIC_APP_URL=https://tinglum.no
```

---

## Edge Functions Deployed

Three edge functions have been deployed to Supabase:

### 1. `send-remainder-reminders`
**Purpose**: Sends remainder payment reminder emails to customers

**When**: Week 44 (configured in `app_config.reminder_week`)

**What it does**:
- Checks if current week matches configured reminder week
- Finds orders with deposit paid but no remainder payment
- Calculates remainder amount including all add-ons and extras
- Sends email with payment link to customer
- Marks order with `reminder_sent_at` timestamp

**Test manually**:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-remainder-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

### 2. `lock-orders`
**Purpose**: Locks orders in Week 46, preventing further modifications

**When**: Week 46 (configured in `app_config.lock_week`)

**What it does**:
- Checks if current week matches configured lock week
- Finds all unlocked orders with status `deposit_paid` or `paid`
- Sets `locked_at` timestamp
- Updates status to `paid`
- Sends "Order Locked" email confirmation

**Test manually**:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/lock-orders \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

### 3. `check-at-risk-orders`
**Purpose**: Marks orders as "at risk" when remainder payment is overdue

**When**: After payment deadline week (configured in `app_config.payment_deadline`)

**What it does**:
- Checks if current week is past configured deadline
- Finds orders with deposit paid but no remainder payment
- Sets `at_risk = true` on these orders
- Admin sees count in alert banner

**Test manually**:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-at-risk-orders \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## Cron Setup Instructions

### Option 1: Supabase Platform (Recommended)

Unfortunately, Supabase Edge Functions don't have built-in cron scheduling yet. Use one of the external options below.

### Option 2: External Cron Service (GitHub Actions)

Create `.github/workflows/daily-jobs.yml`:

```yaml
name: Daily Scheduled Jobs

on:
  schedule:
    # Run daily at 09:00 UTC (10:00 CET)
    - cron: '0 9 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  run-scheduled-jobs:
    runs-on: ubuntu-latest
    steps:
      - name: Send Remainder Reminders
        run: |
          curl -X POST ${{ secrets.SUPABASE_FUNCTION_URL }}/send-remainder-reminders \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"

      - name: Lock Orders
        run: |
          curl -X POST ${{ secrets.SUPABASE_FUNCTION_URL }}/lock-orders \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"

      - name: Check At-Risk Orders
        run: |
          curl -X POST ${{ secrets.SUPABASE_FUNCTION_URL }}/check-at-risk-orders \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

Add secrets to GitHub repository:
- `SUPABASE_FUNCTION_URL`: `https://YOUR_PROJECT.supabase.co/functions/v1`
- `SUPABASE_ANON_KEY`: Your Supabase anon key

### Option 3: Cron-Job.org

1. Visit https://cron-job.org
2. Create account
3. Add three jobs:
   - **Job 1**: `POST https://YOUR_PROJECT.supabase.co/functions/v1/send-remainder-reminders`
   - **Job 2**: `POST https://YOUR_PROJECT.supabase.co/functions/v1/lock-orders`
   - **Job 3**: `POST https://YOUR_PROJECT.supabase.co/functions/v1/check-at-risk-orders`
4. Set schedule: Daily at 09:00
5. Add header: `Authorization: Bearer YOUR_ANON_KEY`

### Option 4: EasyCron

1. Visit https://www.easycron.com
2. Create free account (supports 3 cron jobs)
3. Add three cron jobs with URLs above
4. Set to run daily

---

## Database Configuration

Update week configurations in `app_config` table:

```sql
-- Set reminder week (when to send remainder payment emails)
UPDATE app_config
SET value = '{"year": 2024, "week": 44, "day": 5, "reason": "Week 44 Friday - reminder week"}'::jsonb
WHERE key = 'reminder_week';

-- Set payment deadline (when orders become "at risk")
UPDATE app_config
SET value = '{"year": 2024, "week": 44, "day": 5, "reason": "Week 44 Friday - payment deadline"}'::jsonb
WHERE key = 'payment_deadline';

-- Set lock week (when orders are locked)
UPDATE app_config
SET value = '{"year": 2024, "week": 46, "reason": "Week 46 - orders locked"}'::jsonb
WHERE key = 'lock_week';
```

---

## Testing the System

### Test Remainder Payment Flow

1. **Create test order**:
   - Go to `/bestill`
   - Complete order with deposit payment via Vipps
   - Verify deposit payment is completed

2. **Check customer portal**:
   - Go to `/min-side`
   - Should see "Betal restbeløp" button
   - Should show "✓ Depositum betalt"

3. **Click "Betal restbeløp"**:
   - Creates Vipps payment for remainder
   - Redirects to Vipps
   - Complete payment
   - Returns to `/min-side`
   - Should now show "✓ Restbetaling betalt"

### Test Email System (Manual)

```bash
# Test sending remainder reminder
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-remainder-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Check function logs in Supabase Dashboard > Edge Functions > send-remainder-reminders > Logs
```

### Test At-Risk Detection

1. **Create test scenario**:
   ```sql
   -- Temporarily change payment deadline to past week
   UPDATE app_config
   SET value = '{"year": 2024, "week": 1, "reason": "Test - past deadline"}'::jsonb
   WHERE key = 'payment_deadline';
   ```

2. **Run at-risk check**:
   ```bash
   curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-at-risk-orders \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

3. **Check admin panel**:
   - Go to `/admin`
   - Should see amber alert banner with count
   - Orders should show red "✕ Rest" indicator

4. **Reset config**:
   ```sql
   UPDATE app_config
   SET value = '{"year": 2024, "week": 44, "day": 5, "reason": "Week 44 Friday - payment deadline"}'::jsonb
   WHERE key = 'payment_deadline';
   ```

### Test Order Locking

1. **Create test scenario**:
   ```sql
   -- Temporarily change lock week to current week
   UPDATE app_config
   SET value = '{"year": 2024, "week": 3, "reason": "Test - lock week"}'::jsonb
   WHERE key = 'lock_week';
   ```

2. **Run lock orders**:
   ```bash
   curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/lock-orders \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

3. **Verify**:
   - Check `/min-side` - should show "Ordre låst" badge
   - Edit button should be hidden
   - Customer should have received "Order Locked" email

4. **Reset config**

---

## Test Checklist

### Email Templates
- [ ] Remainder reminder email renders correctly in Norwegian
- [ ] Remainder reminder email renders correctly in English
- [ ] Payment link in email works
- [ ] Order locked email renders correctly
- [ ] All emails display properly on mobile

### Remainder Payment
- [ ] "Betal restbeløp" button appears when deposit paid
- [ ] Button hidden when remainder already paid
- [ ] Button hidden when order is locked
- [ ] Clicking button creates Vipps payment
- [ ] Remainder amount calculation is correct (base + add-ons + extras)
- [ ] Payment redirect returns to `/min-side`
- [ ] Webhook updates payment status
- [ ] Order shows "✓ Restbetaling betalt" after completion

### Admin Panel
- [ ] At-risk count shows in alert banner
- [ ] At-risk orders have red "✕ Rest" indicator
- [ ] CSV export includes all new fields
- [ ] Orders can be filtered by status
- [ ] Search finds orders by number/name/email

### Edge Functions
- [ ] `send-remainder-reminders` only runs in correct week
- [ ] Reminder emails only sent to orders with deposit paid, no remainder
- [ ] `reminder_sent_at` timestamp is set after sending
- [ ] `lock-orders` only runs in correct week
- [ ] Locked orders have `locked_at` timestamp
- [ ] `check-at-risk-orders` only runs after deadline
- [ ] At-risk flag set correctly

### Database
- [ ] New columns exist: `locked_at`, `at_risk`, `reminder_sent_at`, `vipps_remainder_order_id`
- [ ] Indexes created for performance
- [ ] Config entries exist for all three weeks
- [ ] Remainder payments stored in `payments` table

### Customer Portal
- [ ] Locked orders show lock icon
- [ ] At-risk orders show warning badge
- [ ] Payment status displays correctly
- [ ] Edit button hidden for locked orders

---

## Troubleshooting

### Emails Not Sending

1. Check Mailgun API key is set correctly
2. Verify `EMAIL_FROM` domain is verified in Mailgun
3. Check edge function logs in Supabase dashboard
4. Test Mailgun directly: https://documentation.mailgun.com/en/latest/api-sending.html

### Remainder Payment Not Working

1. Check Vipps credentials in `.env`
2. Verify `NEXT_PUBLIC_APP_URL` is set correctly
3. Check browser console for errors
4. Verify order has deposit payment completed
5. Check database: `SELECT * FROM payments WHERE order_id = 'ORDER_ID';`

### Cron Jobs Not Running

1. Verify cron service is active
2. Check authorization header is correct
3. Test edge functions manually with curl
4. Check edge function logs for errors

### At-Risk Orders Not Showing

1. Verify current week is past deadline week
2. Check `payment_deadline` config in database
3. Run `check-at-risk-orders` function manually
4. Query database: `SELECT * FROM orders WHERE at_risk = true;`

---

## Production Deployment

1. **Set environment variables** in production
2. **Verify email domain** in Mailgun
3. **Update week configs** to correct production values
4. **Set up cron jobs** using preferred method
5. **Test all functions** in production environment
6. **Monitor logs** for first few days
7. **Verify emails** are being sent correctly

---

## Monitoring

### Check Email Delivery

Mailgun Dashboard: https://app.mailgun.com

### Check Edge Function Logs

Supabase Dashboard > Edge Functions > [function-name] > Logs

### Check Database State

```sql
-- Check reminder sent status
SELECT order_number, customer_email, reminder_sent_at
FROM orders
WHERE reminder_sent_at IS NOT NULL;

-- Check locked orders
SELECT order_number, locked_at, status
FROM orders
WHERE locked_at IS NOT NULL;

-- Check at-risk orders
SELECT order_number, customer_name, at_risk
FROM orders
WHERE at_risk = true;

-- Check remainder payments
SELECT o.order_number, p.payment_type, p.status, p.amount_nok
FROM orders o
JOIN payments p ON p.order_id = o.id
WHERE p.payment_type = 'remainder';
```

---

## Support

For issues:
1. Check logs in Supabase Dashboard
2. Review troubleshooting section
3. Test manually with curl commands
4. Verify database state with SQL queries
