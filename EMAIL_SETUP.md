# Email Setup Guide - Tinglumgård

## Configure tinglum.com Domain with Resend

### 1. Create Resend Account
1. Go to https://resend.com
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key

### 2. Add Domain to Resend
1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain: `tinglum.com`
4. Resend will provide DNS records to add

### 3. Configure DNS Records
Add these DNS records to your tinglum.com domain (at your domain registrar):

```
Type: TXT
Name: @
Value: [Resend will provide this value]

Type: CNAME
Name: resend._domainkey
Value: [Resend will provide this value]

Type: MX
Name: @
Priority: 10
Value: feedback-smtp.us-east-1.amazonses.com
```

### 4. Update Environment Variables
In your `.env.local` file (or production environment):

```bash
# Resend API Key (from step 1)
RESEND_API_KEY=re_123abc456def

# From email address - use your verified domain
EMAIL_FROM=post@tinglum.com

# Or use a specific sender name:
EMAIL_FROM=Tinglumgård <post@tinglum.com>
```

### 5. Verify Domain
1. After adding DNS records, return to Resend dashboard
2. Click "Verify" on your domain
3. Verification can take a few minutes to 48 hours
4. Once verified, you can send emails from `@tinglum.com`

## Email Features Now Available

### Admin Panel - Communication Tab

**Send Individual Emails:**
- Select email template
- Customize subject and message
- Variables: `{CUSTOMER_NAME}`, `{ORDER_NUMBER}`

**Send to All Customers:**
- Click "Send til alle kunder" button
- Sends to all unique customer emails
- Confirmation dialog before sending
- Success/failure tracking

**Email Templates Available:**
1. Depositum påminnelse
2. Restbeløp påminnelse
3. Klar for henting
4. Tilpasset melding

**Communication History:**
- View all sent emails
- Shows recipient, subject, timestamp
- Links to original order
- Last 100 emails displayed

## Order Deletion with Vipps Refunds

In the admin panel, you can now:

1. **Delete Orders:**
   - Navigate to order detail
   - Select "Delete Order" action
   - Choose whether to process Vipps refund
   - System automatically:
     - Refunds all completed Vipps payments
     - Restores inventory
     - Deletes all related records

2. **Vipps Refund Process:**
   - Attempts refund for each completed payment
   - Uses original Vipps order ID
   - Refund description: "Refund for deleted order [ORDER_NUMBER]"
   - Logs success/failure
   - Admin can process manually if automatic fails

## Testing Emails

Before going live:

1. **Test with Your Email:**
   - Send test email to your own address
   - Verify template rendering
   - Check variables are replaced

2. **Check Spam Folder:**
   - First emails may land in spam
   - Mark as "Not Spam" to improve deliverability

3. **Monitor Resend Dashboard:**
   - View delivery status
   - Check bounce/complaint rates
   - Monitor sending limits

## Sending Limits

Resend free tier:
- 100 emails/day
- 3,000 emails/month

For higher volume, upgrade to paid plan:
- Pro: 50,000 emails/month
- Scale: Custom volumes

## Best Practices

1. **Test Before Bulk Send:**
   - Always send test to yourself first
   - Verify all variables work correctly

2. **Subject Line:**
   - Keep under 50 characters
   - Make it clear and actionable
   - Use customer's order number for context

3. **Email Content:**
   - Be concise and clear
   - Include clear call-to-action
   - Always include contact information

4. **Timing:**
   - Avoid sending late at night
   - Business hours typically better
   - Space out bulk sends (system adds 100ms delay)

## Troubleshooting

**Emails not sending:**
- Check RESEND_API_KEY is set correctly
- Verify domain in Resend dashboard
- Check DNS records are propagated
- Look at server logs for errors

**Emails in spam:**
- Ensure DNS records are correct
- Add SPF, DKIM, DMARC records
- Warm up domain by sending gradually
- Avoid spam trigger words

**Variables not replaced:**
- Ensure using exact format: `{CUSTOMER_NAME}`
- Check template has variables defined
- Verify order has customer data

## Support

For Resend support:
- Documentation: https://resend.com/docs
- Email: support@resend.com
- Dashboard: https://resend.com/dashboard
