# Email Setup Guide - Tinglumgård

## Configure tinglum.com Domain with Mailgun

### 1. Create Mailgun Account
1. Go to https://www.mailgun.com
2. Sign up for an account
3. Navigate to Domains
4. Add domain: tinglum.com

### 2. Configure DNS Records
Add these DNS records to your tinglum.com domain (at your domain registrar):

**Sending records (SPF + DKIM):**
- TXT @ : v=spf1 include:mailgun.org ~all
- TXT email._domainkey : (Mailgun provides the DKIM value)

**Tracking record (optional but recommended):**
- CNAME email : eu.mailgun.org

**Receiving records (for inbound replies):**
- MX @ : mxa.eu.mailgun.org (Priority 10)
- MX @ : mxb.eu.mailgun.org (Priority 10)

### 3. Update Environment Variables
In your `.env.local` file (or production environment):

MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=tinglum.com
MAILGUN_REGION=eu

EMAIL_FROM=Tinglumgård <post@tinglum.com>
EMAIL_REPLY_TO=messages@tinglum.com

### 4. Enable Inbound Routes
In Mailgun Dashboard:
1. Go to Domains → tinglum.com
2. Open Routes / Receiving
3. Add route to forward inbound email to:
   https://tinglumgard.no/api/webhooks/email-reply

### 5. Verify Domain
1. After adding DNS records, return to Mailgun dashboard
2. Click "Verify" on your domain
3. Once verified, you can send from `@tinglum.com`

## Email Features Now Available

### Admin Panel - Communication Tab

**Send Individual Emails:**
- Select email template
- Customize subject and message
- Variables: {CUSTOMER_NAME}, {ORDER_NUMBER}

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

## Testing Emails

Before going live:

1. **Test with Your Email:**
   - Send test email to your own address
   - Verify template rendering
   - Check variables are replaced

2. **Check Spam Folder:**
   - First emails may land in spam
   - Mark as "Not Spam" to improve deliverability

3. **Monitor Mailgun Dashboard:**
   - View delivery status
   - Check bounce/complaint rates
   - Monitor sending limits

## Troubleshooting

**Emails not sending:**
- Check MAILGUN_API_KEY is set correctly
- Verify domain in Mailgun dashboard
- Check DNS records are propagated
- Look at server logs for errors

**Emails in spam:**
- Ensure DNS records are correct
- Add SPF, DKIM, DMARC records
- Warm up domain by sending gradually
- Avoid spam trigger words

**Variables not replaced:**
- Ensure using exact format: {CUSTOMER_NAME}
- Check template has variables defined
- Verify order has customer data

## Support

For Mailgun support:
- Documentation: https://documentation.mailgun.com
- Dashboard: https://app.mailgun.com
