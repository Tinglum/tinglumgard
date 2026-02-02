# Email & Messaging System Integration Guide

## Overview

Complete bidirectional email and messaging system allowing:
- Customers send messages → Get email confirmation + admin gets notified
- Admin replies via panel OR email → Customer gets notified both ways
- Customer replies via panel OR email → Admin gets notified both ways
- All communications stored in database regardless of origin

## Features Implemented

### 1. Admin Order Notifications ✅
When deposit payment is received:
- Admin receives email at `post@tinglum.com` (or EMAIL_FROM)
- Includes full order details, customer info, payment breakdown
- Template: `getAdminOrderNotificationTemplate()`

**Location:** [app/api/webhooks/vipps/route.ts](app/api/webhooks/vipps/route.ts)

### 2. Customer Message Confirmations ✅
When customer creates message via panel:
- Customer receives confirmation email with thread ID
- Message content is included for reference
- Can reply directly to email (goes to thread)
- Admin gets notification email with message details

**Location:** [app/api/messages/route.ts](app/api/messages/route.ts)

### 3. Admin Reply Notifications ✅
When admin replies via panel:
- Customer receives email notification
- Includes reply text and link to Min Side
- Can reply directly to email
- Thread ID in subject for linking

**Location:** [app/api/admin/messages/[id]/replies/route.ts](app/api/admin/messages/[id]/replies/route.ts)

### 4. Email Reply Webhook ✅
Handles inbound emails from both customers and admin:
- Parses email subject to extract thread ID
- Identifies sender (customer vs admin)
- Creates reply in database
- Sends notification to other party
- Updates message status

**Location:** [app/api/webhooks/email-reply/route.ts](app/api/webhooks/email-reply/route.ts)

### 5. Database Schema ✅
Thread tracking and email source tracking:
```sql
ALTER TABLE customer_messages ADD COLUMN email_thread_id TEXT UNIQUE;
ALTER TABLE message_replies ADD COLUMN source TEXT DEFAULT 'panel';
ALTER TABLE message_replies ADD COLUMN email_message_id TEXT;
```

**Location:** [supabase/migrations/20260202_email_thread_tracking.sql](supabase/migrations/20260202_email_thread_tracking.sql)

## Setup Instructions

### 1. Run Database Migration

```bash
# Apply the migration to add email tracking fields
psql $DATABASE_URL -f supabase/migrations/20260202_email_thread_tracking.sql
```

Or via Supabase dashboard:
1. Go to SQL Editor
2. Paste contents of `20260202_email_thread_tracking.sql`
3. Run query

### 2. Configure Mailgun for Inbound Emails

#### A. Set up Inbound Email Domain
1. Go to https://app.mailgun.com
2. Open Domains → tinglum.com
3. Verify DNS records (SPF, DKIM, MX)
4. Enable Receiving for the domain

#### B. Configure Route
1. Go to Routes
2. Create a route to forward inbound emails to:
   `https://tinglumgard.no/api/webhooks/email-reply`
3. Match recipient: `messages@tinglum.com` and `post@tinglum.com`

### 3. Environment Variables

Ensure these are set in your production environment (Netlify):

MAILGUN_API_KEY=key-YourKey
MAILGUN_DOMAIN=tinglum.com
MAILGUN_REGION=eu
MAILGUN_WEBHOOK_SIGNING_KEY=your-signing-key

EMAIL_FROM=Tinglumgård <post@tinglum.com>
EMAIL_REPLY_TO=messages@tinglum.com

NEXT_PUBLIC_APP_URL=https://tinglumgard.no

### 4. Test the Integration

#### Test 1: Customer Message Creation
1. Log in as customer
2. Go to Min Side → Messages
3. Create new message
4. Verify:
   - ✅ Message appears in database
   - ✅ Customer receives confirmation email
   - ✅ Admin receives notification email
   - ✅ Email subject contains `[msg_12345]` thread ID

#### Test 2: Admin Reply via Panel
1. Log in as admin
2. Go to Messages tab
3. Reply to customer message
4. Verify:
   - ✅ Reply saved to database
   - ✅ Customer receives email notification
   - ✅ Email subject contains thread ID
   - ✅ Customer can reply to email

#### Test 3: Customer Email Reply
1. As customer, reply to admin notification email
2. Verify:
   - ✅ Email webhook receives message
   - ✅ Reply appears in database with `source: 'email'`
   - ✅ Reply appears in customer's Min Side
   - ✅ Admin receives notification email

#### Test 4: Admin Email Reply
1. As admin, reply to customer message notification email
2. Verify:
   - ✅ Email webhook receives message
   - ✅ Reply appears in database with `source: 'email'`
   - ✅ Reply appears in admin panel
   - ✅ Customer receives notification email

#### Test 5: Order Notification
1. Create test order
2. Complete Vipps payment (or use webhook testing)
3. Verify:
   - ✅ Admin receives order notification email
   - ✅ Email contains all order details
   - ✅ Customer receives deposit confirmation

## Email Templates

### getAdminOrderNotificationTemplate
- **Used for:** Notifying admin of new paid orders
- **Parameters:** Full order details, customer info, payment breakdown
- **Subject:** `Ny ordre mottatt - {orderNumber}`

### getCustomerMessageConfirmationTemplate
- **Used for:** Confirming message receipt to customer
- **Parameters:** Customer name, message ID, subject, message text
- **Subject:** `[msg_{id}] Melding mottatt - {subject}`

### getAdminReplyNotificationTemplate
- **Used for:** Notifying customer of admin reply
- **Parameters:** Customer name, message ID, subject, reply text, admin name
- **Subject:** `[msg_{id}] Svar på: {subject}`

## Thread ID System

All emails include a thread ID in the subject:
```
[msg_12345] Subject of message
```

This enables:
- Linking email replies to original messages
- Maintaining conversation context
- Preventing duplicate message creation
- Tracking message history

Thread IDs are:
- Auto-generated on message creation
- Stored in `customer_messages.email_thread_id`
- Included in all email subjects
- Extracted by webhook to find correct message

## Email Reply Flow

### Customer → Admin
```
1. Customer sends message via panel
2. Message stored with thread ID: msg_12345
3. Customer receives confirmation email [msg_12345]
4. Admin receives notification email [msg_12345]
5. Admin replies via email
6. Webhook receives email
7. Extracts thread ID from subject
8. Creates reply with source='email'
9. Customer receives notification
10. Conversation continues...
```

### Admin → Customer
```
1. Admin replies via panel
2. Reply stored with source='panel'
3. Customer receives notification email [msg_12345]
4. Customer replies via email
5. Webhook receives email
6. Extracts thread ID
7. Creates reply with source='email'
8. Admin receives notification
9. Reply appears in panel
10. Conversation continues...
```

## Troubleshooting

### Emails not being received
- Check Mailgun dashboard for delivery status
- Verify DNS records are correct
- Check spam folder
- Verify EMAIL_FROM is set correctly

### Webhook not triggering
- Test webhook URL: `https://tinglumgard.no/api/webhooks/email-reply`
- Check Mailgun route/webhook logs
- Verify webhook secret (if using)
- Check server logs for errors

### Thread ID not matching
- Verify email subject contains `[msg_12345]` format
- Check that customer_messages.email_thread_id is set
- Run migration if column is missing

### Replies not showing in panel
- Check message_replies table for new entries
- Verify source field is set correctly
- Check that message status is updating

## Security Considerations

1. **Webhook Verification:** Mailgun webhook signatures are verified with MAILGUN_WEBHOOK_SIGNING_KEY.

2. **Email Validation:** Webhook validates sender email matches customer or admin domain.

3. **XSS Prevention:** All email content is sanitized before storage.

4. **Rate Limiting:** Consider adding rate limits to prevent abuse.

5. **Spam Detection:** Monitor for spam and implement filtering if needed.

## Monitoring

Track these metrics:
- Email delivery rate (Mailgun dashboard)
- Webhook success rate
- Reply source distribution (panel vs email)
- Average response time
- Customer satisfaction

## Future Enhancements

1. **Rich Text Editor:** Support formatted emails
2. **Attachments:** Handle file attachments in emails
3. **Auto-responders:** Automatic acknowledgment outside business hours
4. **Templates:** Pre-defined admin response templates
5. **Email Analytics:** Track open rates, click rates
6. **Multi-language:** Support English email templates

## Support

For issues or questions:
- Check Mailgun logs: https://app.mailgun.com/app/logs
- Check application logs in Netlify
- Review database for message entries
- Test webhook endpoint directly
