-- =============================================================================
-- Upgrade all email templates to unified farm-brand design system
-- Brand: warm brown (#2C1810), gold accent (#8B6914), warm backgrounds
-- All inline styles, table-based buttons, info cards, status badges
-- =============================================================================

BEGIN;

-- ─── Design token reference (used inline below) ────────────────────────────
-- brand-dark:    #2C1810   (header, primary buttons)
-- brand-accent:  #8B6914   (gold accent, step numbers, links)
-- brand-muted:   #FAF8F5   (info card backgrounds)
-- border:        #E8DFD5   (card borders, dividers)
-- text-primary:  #1C1210   (main body text)
-- text-secondary:#6B5B4E   (secondary text, labels)
-- success:       #2D6A4F / bg #ECFDF5 / border #BBF7D0
-- warning:       #B45309 / bg #FFFBEB / border #FDE68A
-- error:         #991B1B / bg #FEF2F2 / border #FECACA
-- heading font:  Georgia, 'Times New Roman', serif
-- body font:     Arial, Helvetica, sans-serif

-- ═══════════════════════════════════════════════════════════════════════════
-- PIG TEMPLATES
-- ═══════════════════════════════════════════════════════════════════════════

-- pig.order.deposit.confirmed.customer ────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Bestilling bekreftet</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Vi har mottatt forskuddet for <strong>{{order_number}}</strong>. Din Mangalitsa-kasse er reservert!</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Kasse</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{box_label}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Ribbevalg</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{ribbe_choice}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Levering</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{delivery_label}}</td></tr>
</table></td></tr></table>
{{extras_html}}
{{discount_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Forskudd betalt</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Restbetaling</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">Totalt</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Hva skjer n&aring;?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Vi f&oslash;lger opp bestillingen videre</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Du f&aring;r p&aring;minnelse f&oslash;r restforfall</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Du finner all status p&aring; Min side</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">&Aring;pne Min side</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Order confirmed</span></p>
<p>Hi {{customer_first_name}},</p>
<p>We have received the deposit for <strong>{{order_number}}</strong>. Your Mangalitsa box is reserved!</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Box</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{box_label}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Rib option</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{ribbe_choice}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Delivery</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{delivery_label}}</td></tr>
</table></td></tr></table>
{{extras_html}}
{{discount_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Deposit paid</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Remaining</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">Total</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">What happens next?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">We continue processing your order</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">You receive reminders before remainder due date</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">You can follow all updates on My Page</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Open My Page</a>
</td></tr></table>$$
WHERE template_key = 'pig.order.deposit.confirmed.customer';

-- pig.order.remainder.paid.customer ──────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Betaling fullf&oslash;rt</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Vi har mottatt restbetalingen for <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">Total betalt</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Hva skjer n&aring;?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Ordren g&aring;r videre til neste produksjonssteg</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Du f&aring;r ny oppdatering n&aring;r status endres</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Se detaljer p&aring; Min side</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se bestillingen</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Payment completed</span></p>
<p>Hi {{customer_first_name}},</p>
<p>We have received the remainder payment for <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">Total paid</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">What happens next?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">The order moves to the next production step</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">You receive another update when status changes</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">View details on My Page</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View order</a>
</td></tr></table>$$
WHERE template_key = 'pig.order.remainder.paid.customer';

-- pig.remainder.reminder ─────────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">P&aring;minnelse</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Dette er en vennlig p&aring;minnelse om restbetaling for <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr><td align="center" style="padding:20px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;">
<span style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#2C1810;line-height:1.2;">{{remainder_amount_nok}}</span>
<br><span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B5B4E;margin-top:4px;display:inline-block;">Restbetaling</span>
</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Forfall</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{due_date}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Tid igjen</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{days_left}} dager</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">&Aring;pne Min side</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Reminder</span></p>
<p>Hi {{customer_first_name}},</p>
<p>This is a friendly reminder for <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr><td align="center" style="padding:20px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;">
<span style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#2C1810;line-height:1.2;">{{remainder_amount_nok}}</span>
<br><span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B5B4E;margin-top:4px;display:inline-block;">Remaining amount</span>
</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Due date</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{due_date}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Time left</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{days_left}} days</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Open My Page</a>
</td></tr></table>$$
WHERE template_key = 'pig.remainder.reminder';

-- pig.remainder.explainer.full ───────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p>Hei {{customer_first_name}},</p>
<p>Takk for bestillingen din. Her er oversikten over restbetalingen for <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Restbetaling</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Forfallsdato</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{due_date}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Hva skjer n&aring;?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Betal restbel&oslash;pet innen forfall</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Vi klargj&oslash;r bestillingen etter registrert betaling</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Du f&aring;r oppdateringer fortl&oslash;pende p&aring; Min side</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">&Aring;pne Min side</a>
</td></tr></table>$$,
  body_en = $$<p>Hi {{customer_first_name}},</p>
<p>Thank you for your order. Here is the remainder payment overview for <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Remaining</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Due date</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{due_date}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">What happens next?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Pay the remaining amount before the deadline</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">We prepare your order once payment is registered</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">You can follow all updates on My Page</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Open My Page</a>
</td></tr></table>$$
WHERE template_key = 'pig.remainder.explainer.full';

-- pig.remainder.explainer.reduced ────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Allerede betalt</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Vi har registrert at restbetalingen for <strong>{{order_number}}</strong> allerede er betalt. Du trenger ikke foreta deg noe.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">&Aring;pne Min side</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Already paid</span></p>
<p>Hi {{customer_first_name}},</p>
<p>We have already registered the remainder payment for <strong>{{order_number}}</strong>. No action needed.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Open My Page</a>
</td></tr></table>$$
WHERE template_key = 'pig.remainder.explainer.reduced';

-- ═══════════════════════════════════════════════════════════════════════════
-- EGG TEMPLATES
-- ═══════════════════════════════════════════════════════════════════════════

-- egg.order.deposit.confirmed.customer ───────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Bestilling bekreftet</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Vi har mottatt forskuddet for rugeeggordren <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Rase</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{breed_name}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Uke</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{week_number}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Grunnordre</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{base_quantity}} egg</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Tillegg</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{additions_quantity}} egg</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Totalt</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{total_quantity}} egg</td></tr>
</table></td></tr></table>
{{additions_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Forskudd betalt</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Restbetaling</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">Totalt</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Hva skjer n&aring;?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Vi holder kapasiteten avsatt til ordren din</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Du f&aring;r restp&aring;minnelser etter oppsatt plan</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Du kan f&oslash;lge bestillingen p&aring; Min side</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">&Aring;pne Min side</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Order confirmed</span></p>
<p>Hi {{customer_first_name}},</p>
<p>We have received the deposit for hatching egg order <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Breed</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{breed_name}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Week</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{week_number}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Base order</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{base_quantity}} eggs</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Added lines</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{additions_quantity}} eggs</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Total</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{total_quantity}} eggs</td></tr>
</table></td></tr></table>
{{additions_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Deposit paid</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Remaining</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">Total</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">What happens next?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">We keep your reserved capacity</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">You receive remainder reminders on schedule</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">You can follow the order on My Page</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Open My Page</a>
</td></tr></table>$$
WHERE template_key = 'egg.order.deposit.confirmed.customer';

-- egg.remainder.reminder ─────────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">P&aring;minnelse</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Restbetalingen for rugeeggordren <strong>{{order_number}}</strong> gjenstår.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr><td align="center" style="padding:20px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;">
<span style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#2C1810;line-height:1.2;">{{remainder_amount_nok}}</span>
<br><span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B5B4E;margin-top:4px;display:inline-block;">Restbetaling</span>
</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Forfall</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{due_date}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Tid igjen</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{days_left}} dager</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">&Aring;pne bestillingen p&aring; Min side</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Reminder</span></p>
<p>Hi {{customer_first_name}},</p>
<p>The remainder for hatching egg order <strong>{{order_number}}</strong> is still outstanding.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr><td align="center" style="padding:20px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;">
<span style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#2C1810;line-height:1.2;">{{remainder_amount_nok}}</span>
<br><span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B5B4E;margin-top:4px;display:inline-block;">Remaining amount</span>
</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Due date</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{due_date}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Time left</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{days_left}} days</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Open your order on My Page</a>
</td></tr></table>$$
WHERE template_key = 'egg.remainder.reminder';

-- egg.order.shipped.customer ─────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Sendt</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Vi har sendt bestillingen din <strong>{{order_number}}</strong> med Posten.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Sporingsnummer</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;"><a href="{{tracking_url}}" style="color:#8B6914;">{{tracking_number}}</a></td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Levering</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">Uke {{delivery_week}} ({{delivery_date}})</td></tr>
</table></td></tr></table>
{{order_lines_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Forskudd</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Rest</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">Total</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Hva skjer n&aring;?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">F&oslash;lg sporingen hos Posten</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Kontroller eggene ved mottak</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">G&aring; til Min side hvis du trenger hjelp</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">&Aring;pne bestillingen p&aring; Min side</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Shipped</span></p>
<p>Hi {{customer_first_name}},</p>
<p>Your order <strong>{{order_number}}</strong> has been shipped with Posten.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Tracking</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;"><a href="{{tracking_url}}" style="color:#8B6914;">{{tracking_number}}</a></td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Delivery</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">Week {{delivery_week}} ({{delivery_date}})</td></tr>
</table></td></tr></table>
{{order_lines_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Deposit</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Remaining</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">Total</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">What happens next?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Track the parcel with Posten</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Check the eggs on arrival</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Use My Page if you need help</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Open your order on My Page</a>
</td></tr></table>$$
WHERE template_key = 'egg.order.shipped.customer';

-- egg.order.forfeited ────────────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#991B1B;background:#FEF2F2;border:1px solid #FECACA;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Kansellert</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Bestillingen <strong>{{order_number}}</strong> er kansellert fordi restbetalingen ikke ble registrert innen fristen.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Hva skjer n&aring;?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Ordren er lukket og reservasjonen frigitt</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Du kan legge inn ny bestilling hvis det finnes kapasitet</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Se detaljer og videre valg p&aring; Min side</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se detaljer p&aring; Min side</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#991B1B;background:#FEF2F2;border:1px solid #FECACA;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Cancelled</span></p>
<p>Hi {{customer_first_name}},</p>
<p>Order <strong>{{order_number}}</strong> was cancelled because the remainder was not registered before the deadline.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">What happens next?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">The order is closed and the reservation is released</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">You can place a new order if capacity is available</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">See details and next options on My Page</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View details on My Page</a>
</td></tr></table>$$
WHERE template_key = 'egg.order.forfeited';

-- ═══════════════════════════════════════════════════════════════════════════
-- CHICKEN TEMPLATES
-- ═══════════════════════════════════════════════════════════════════════════

-- chicken.order.deposit.confirmed.customer ───────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Bestilling bekreftet</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Forskuddet er mottatt for <strong>{{order_number}}</strong>.</p>
{{order_lines_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Hentedato</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{pickup_date}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Metode</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{delivery_label}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Forskudd betalt</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Rest ved henting</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">Totalt</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Hva skjer n&aring;?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Vi sender varsler f&oslash;r henting</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Restbetaling registreres ved henting</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Du f&oslash;lger alt p&aring; Min side</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">&Aring;pne Min side</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Order confirmed</span></p>
<p>Hi {{customer_first_name}},</p>
<p>The deposit has been received for <strong>{{order_number}}</strong>.</p>
{{order_lines_html_en}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Pickup date</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{pickup_date}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Method</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{delivery_label}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Deposit paid</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Remaining at pickup</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">Total</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">What happens next?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">We send reminders before pickup</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Remaining payment is registered at pickup</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">You can follow everything on My Page</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Open My Page</a>
</td></tr></table>$$
WHERE template_key = 'chicken.order.deposit.confirmed.customer';

-- chicken.ready_for_pickup ───────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Klar for henting</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Bestilling <strong>{{order_number}}</strong> er klar for henting.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Hentedato</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{pickup_date}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Restbetaling</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{remainder_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se detaljer p&aring; Min side</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Ready for pickup</span></p>
<p>Hi {{customer_first_name}},</p>
<p>Order <strong>{{order_number}}</strong> is ready for pickup.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Pickup date</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{pickup_date}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Remaining</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{remainder_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View details on My Page</a>
</td></tr></table>$$
WHERE template_key = 'chicken.ready_for_pickup';

-- chicken.pickup.reminder ────────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">P&aring;minnelse</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Dette er en p&aring;minnelse om henting for <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Hentedato</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{pickup_date}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Tid igjen</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{days_left}} dager</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Restbetaling</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{remainder_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se detaljer p&aring; Min side</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Reminder</span></p>
<p>Hi {{customer_first_name}},</p>
<p>This is a pickup reminder for <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Pickup date</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{pickup_date}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Time left</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{days_left}} days</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Remaining</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{remainder_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View details on My Page</a>
</td></tr></table>$$
WHERE template_key = 'chicken.pickup.reminder';

-- chicken.remainder.collected ────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Kvittering</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Restbetalingen for <strong>{{order_number}}</strong> er registrert ved henting.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;">Registrert bel&oslash;p</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;">{{remainder_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se bestillingen p&aring; Min side</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Receipt</span></p>
<p>Hi {{customer_first_name}},</p>
<p>The remainder payment for <strong>{{order_number}}</strong> was registered at pickup.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;">Registered amount</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;">{{remainder_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View your order on My Page</a>
</td></tr></table>$$
WHERE template_key = 'chicken.remainder.collected';

-- ═══════════════════════════════════════════════════════════════════════════
-- SUPPORT TEMPLATES (styled blockquotes)
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE email_templates SET
  body_no = $$<p>Hei {{customer_first_name}},</p>
<p>Vi har mottatt meldingen din.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Referanse</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{thread_id}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Emne</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{subject_line}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr>
<td style="border-left:4px solid #E8DFD5;background:#FAF8F5;padding:14px 16px;border-radius:0 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1C1210;white-space:pre-wrap;">{{message_text}}</td>
</tr></table>
<p><strong>Du kan svare direkte p&aring; denne e-posten</strong>, eller g&aring; til <a href="{{portal_url}}" style="color:#8B6914;">{{portal_label}}</a>.</p>
<p style="font-size:13px;color:#6B5B4E;">Forventet svartid: Innen 24 timer p&aring; hverdager</p>$$,
  body_en = $$<p>Hi {{customer_first_name}},</p>
<p>We have received your message.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Reference</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{thread_id}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Subject</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{subject_line}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr>
<td style="border-left:4px solid #E8DFD5;background:#FAF8F5;padding:14px 16px;border-radius:0 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1C1210;white-space:pre-wrap;">{{message_text}}</td>
</tr></table>
<p><strong>You can reply directly to this email</strong>, or visit <a href="{{portal_url}}" style="color:#8B6914;">{{portal_label}}</a>.</p>
<p style="font-size:13px;color:#6B5B4E;">Expected response time: Within 24 hours on business days</p>$$
WHERE template_key = 'support.message.customer.confirmation';

UPDATE email_templates SET
  body_no = $$<p>Hei {{customer_first_name}},</p>
<p>Du har f&aring;tt et svar fra {{admin_name}}.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr>
<td style="border-left:4px solid #2D6A4F;background:#ECFDF5;padding:14px 16px;border-radius:0 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1C1210;white-space:pre-wrap;">{{reply_text}}</td>
</tr></table>
<p><strong>Du kan svare direkte p&aring; denne e-posten</strong>, eller g&aring; til <a href="{{portal_url}}" style="color:#8B6914;">{{portal_label}}</a> for &aring; se hele samtalen.</p>$$,
  body_en = $$<p>Hi {{customer_first_name}},</p>
<p>You have received a reply from {{admin_name}}.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr>
<td style="border-left:4px solid #2D6A4F;background:#ECFDF5;padding:14px 16px;border-radius:0 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1C1210;white-space:pre-wrap;">{{reply_text}}</td>
</tr></table>
<p><strong>You can reply directly to this email</strong>, or visit <a href="{{portal_url}}" style="color:#8B6914;">{{portal_label}}</a> to see the full conversation.</p>$$
WHERE template_key = 'support.reply.customer.notification';

-- ═══════════════════════════════════════════════════════════════════════════
-- REMAINING PIG TEMPLATES
-- ═══════════════════════════════════════════════════════════════════════════

-- pig.order.ready_for_pickup ─────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Klar til henting</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Bestillingen <strong>{{order_number}}</strong> er klar!</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Levering</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{delivery_label}}</td></tr>
</table></td></tr></table>
<p>Vi gleder oss til du f&aring;r smake!</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se bestillingen</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Ready for pickup</span></p>
<p>Hi {{customer_first_name}},</p>
<p>Order <strong>{{order_number}}</strong> is ready!</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Delivery</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{delivery_label}}</td></tr>
</table></td></tr></table>
<p>We hope you enjoy it!</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View order</a>
</td></tr></table>$$
WHERE template_key = 'pig.order.ready_for_pickup';

-- pig.order.locked.finalized ─────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Ordre l&aring;st</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Bestillingen <strong>{{order_number}}</strong> er n&aring; l&aring;st og ferdigstilt. Ingen ytterligere endringer kan gj&oslash;res.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Hva skjer n&aring;?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Ordren g&aring;r til produksjon</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Du f&aring;r beskjed n&aring;r den er klar</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se bestillingen</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Order locked</span></p>
<p>Hi {{customer_first_name}},</p>
<p>Order <strong>{{order_number}}</strong> is now locked and finalized. No further changes can be made.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">What happens next?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Your order goes into production</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">You will be notified when it is ready</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View order</a>
</td></tr></table>$$
WHERE template_key = 'pig.order.locked.finalized';

-- pig.order.cancelled ────────────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#991B1B;background:#FEF2F2;border:1px solid #FECACA;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Kansellert</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Bestillingen <strong>{{order_number}}</strong> er kansellert.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">&Aring;rsak</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{cancel_reason}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Refusjon</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{refund_text}}</td></tr>
</table></td></tr></table>
<p>Har du sp&oslash;rsm&aring;l? Svar gjerne p&aring; denne e-posten.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se bestillingen</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#991B1B;background:#FEF2F2;border:1px solid #FECACA;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Cancelled</span></p>
<p>Hi {{customer_first_name}},</p>
<p>Order <strong>{{order_number}}</strong> has been cancelled.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Reason</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{cancel_reason}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Refund</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{refund_text}}</td></tr>
</table></td></tr></table>
<p>Have questions? Feel free to reply to this email.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View order</a>
</td></tr></table>$$
WHERE template_key = 'pig.order.cancelled';

-- pig.order.refund.requested ─────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p>Hei {{customer_first_name}},</p>
<p>Vi har registrert en refusjon for <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Type</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{refund_type_label}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Bel&oslash;p</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{refund_amount_nok}}</td></tr>
</table></td></tr></table>
<p style="font-size:13px;color:#6B5B4E;">Normal behandlingstid: 5&ndash;7 virkedager.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se bestillingen</a>
</td></tr></table>$$,
  body_en = $$<p>Hi {{customer_first_name}},</p>
<p>A refund has been registered for <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Type</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{refund_type_label}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Amount</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{refund_amount_nok}}</td></tr>
</table></td></tr></table>
<p style="font-size:13px;color:#6B5B4E;">Normal processing time: 5&ndash;7 business days.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View order</a>
</td></tr></table>$$
WHERE template_key = 'pig.order.refund.requested';

-- ═══════════════════════════════════════════════════════════════════════════
-- REMAINING EGG TEMPLATES
-- ═══════════════════════════════════════════════════════════════════════════

-- egg.order.remainder.paid.customer ──────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Betaling fullf&oslash;rt</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Vi har mottatt restbetalingen for <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Antall egg</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{total_quantity}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Restbetaling</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;font-weight:700;border-top:2px solid #E8DFD5;">Total betalt</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
{{additions_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Hva skjer n&aring;?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Ordren g&aring;r til klarering og pakking</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Du f&aring;r sporingsinformasjon n&aring;r pakken sendes</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se bestillingen</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Payment completed</span></p>
<p>Hi {{customer_first_name}},</p>
<p>We have received the remainder payment for <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Total eggs</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{total_quantity}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Remainder paid</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;font-weight:700;border-top:2px solid #E8DFD5;">Total paid</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
{{additions_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">What happens next?</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Your order goes to preparation and packing</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">You will receive tracking info when the parcel ships</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View order</a>
</td></tr></table>$$
WHERE template_key = 'egg.order.remainder.paid.customer';

-- egg.delivery.day_before ────────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Sendes i morgen</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Bestilling <strong>{{order_number}}</strong> er planlagt for sending <strong>{{delivery_date}}</strong>.</p>
<p>&Oslash;nsker du &aring; legge til noe ekstra f&oslash;r vi pakker? Du kan fortsatt gj&oslash;re endringer i dag.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{upsell_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Legg til ekstra</a>
</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0;"><tr><td align="center" style="border-radius:8px;border:2px solid #E8DFD5;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;color:#2C1810;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;">Se bestillingen</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Ships tomorrow</span></p>
<p>Hi {{customer_first_name}},</p>
<p>Order <strong>{{order_number}}</strong> is scheduled for shipment on <strong>{{delivery_date}}</strong>.</p>
<p>Want to add anything extra before we pack? You can still make changes today.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{upsell_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Add extras</a>
</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0;"><tr><td align="center" style="border-radius:8px;border:2px solid #E8DFD5;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;color:#2C1810;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;">View order</a>
</td></tr></table>$$
WHERE template_key = 'egg.delivery.day_before';

-- egg.hatch.followup ─────────────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p>Hei {{customer_first_name}},</p>
<p>Vi h&aring;per rugeeggene utvikler seg fint! Husk &aring; holde stabil temperatur og fuktighet.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Tips for god klekking</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Hold temperaturen p&aring; 37,5&ndash;37,8 &deg;C</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Fuktighet p&aring; ca. 45&ndash;55 % f&oslash;rste 18 dager</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Snu eggene minst 3 ganger daglig</td></tr>
</table></td></tr></table>
<p>Har du sp&oslash;rsm&aring;l? <a href="{{message_url}}" style="color:#8B6914;font-weight:600;">Send oss en melding</a>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:20px 0;"><tr><td style="padding:16px;">
<p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;color:#1C1210;">Pr&oslash;v v&aring;r Mangalitsa-gris!</p>
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">F&aring; 10 % rabatt p&aring; forskuddet med kode <strong>{{deposit_discount_code}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{pork_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:10px 20px;border-radius:8px;border:2px solid #2C1810;">Utforsk Mangalitsa</a>
</td></tr></table>
</td></tr></table>$$,
  body_en = $$<p>Hi {{customer_first_name}},</p>
<p>We hope your hatching eggs are developing well! Remember to maintain stable temperature and humidity.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Tips for successful hatching</td></tr><tr><td style="padding:12px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">1</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Keep temperature at 37.5&ndash;37.8 &deg;C</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">2</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Humidity at approx. 45&ndash;55 % for the first 18 days</td></tr>
<tr><td style="padding:6px 10px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#8B6914;vertical-align:top;width:32px;text-align:center;">3</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Turn eggs at least 3 times daily</td></tr>
</table></td></tr></table>
<p>Questions? <a href="{{message_url}}" style="color:#8B6914;font-weight:600;">Send us a message</a>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:20px 0;"><tr><td style="padding:16px;">
<p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;color:#1C1210;">Try our Mangalitsa pork!</p>
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Get 10% off the deposit with code <strong>{{deposit_discount_code}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{pork_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:10px 20px;border-radius:8px;border:2px solid #2C1810;">Explore Mangalitsa</a>
</td></tr></table>
</td></tr></table>$$
WHERE template_key = 'egg.hatch.followup';

-- ═══════════════════════════════════════════════════════════════════════════
-- REMAINING CHICKEN TEMPLATES
-- ═══════════════════════════════════════════════════════════════════════════

-- chicken.order.remainder.paid.customer ──────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Betaling fullf&oslash;rt</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Vi har mottatt restbetalingen for <strong>{{order_number}}</strong>. Ordren er n&aring; fullt betalt.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Henting</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{pickup_date}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;font-weight:700;border-top:2px solid #E8DFD5;">Total betalt</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se bestillingen</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Payment completed</span></p>
<p>Hi {{customer_first_name}},</p>
<p>We have received the remainder payment for <strong>{{order_number}}</strong>. The order is now fully paid.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Pickup</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{pickup_date}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;font-weight:700;border-top:2px solid #E8DFD5;">Total paid</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View order</a>
</td></tr></table>$$
WHERE template_key = 'chicken.order.remainder.paid.customer';

-- chicken.order.followup ─────────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p>Hei {{customer_first_name}},</p>
<p>Takk for bestillingen av kyllinger! Vi h&aring;per de trives godt hos deg.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:20px 0;"><tr><td style="padding:16px;">
<p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;color:#1C1210;">Pr&oslash;v v&aring;r Mangalitsa-gris!</p>
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">F&aring; 10 % rabatt p&aring; forskuddet med kode <strong>KYLLING10</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{pork_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:10px 20px;border-radius:8px;border:2px solid #2C1810;">Utforsk Mangalitsa</a>
</td></tr></table>
</td></tr></table>
<p>Har du sp&oslash;rsm&aring;l om kyllingene? <a href="{{message_url}}" style="color:#8B6914;font-weight:600;">Send oss en melding</a>.</p>$$,
  body_en = $$<p>Hi {{customer_first_name}},</p>
<p>Thank you for your chicken order! We hope they are settling in well.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:20px 0;"><tr><td style="padding:16px;">
<p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;color:#1C1210;">Try our Mangalitsa pork!</p>
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Get 10% off the deposit with code <strong>KYLLING10</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{pork_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:10px 20px;border-radius:8px;border:2px solid #2C1810;">Explore Mangalitsa</a>
</td></tr></table>
</td></tr></table>
<p>Questions about your chickens? <a href="{{message_url}}" style="color:#8B6914;font-weight:600;">Send us a message</a>.</p>$$
WHERE template_key = 'chicken.order.followup';

-- ═══════════════════════════════════════════════════════════════════════════
-- ADMIN TEMPLATES
-- ═══════════════════════════════════════════════════════════════════════════

-- admin.order.deposit.confirmed.pig ──────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Ny grisordre</span></p>
<p>Ny bestilling <strong>{{order_number}}</strong> er registrert.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Kunde</td></tr><tr><td style="padding:8px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Navn</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{customer_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">E-post</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_email}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Telefon</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_phone}}</td></tr>
</table></td></tr></table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Ordredetaljer</td></tr><tr><td style="padding:8px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Kasse</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{box_label}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Ribbevalg</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{ribbe_choice}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Levering</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{delivery_label}}</td></tr>
</table></td></tr></table></td></tr></table>
{{extras_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;"><tr><td style="padding:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Betaling</td></tr><tr><td style="padding:8px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Forskudd</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Rabatt</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{discount_amount_nok}}</td></tr>
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Rest</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">Totalt</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se i admin</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">New pig order</span></p>
<p>New order <strong>{{order_number}}</strong> has been registered.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Customer</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{customer_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Email</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_email}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Phone</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_phone}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Box</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{box_label}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Rib</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{ribbe_choice}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Delivery</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{delivery_label}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Deposit</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Remainder</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;font-weight:700;border-top:2px solid #E8DFD5;">Total</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View in admin</a>
</td></tr></table>$$
WHERE template_key = 'admin.order.deposit.confirmed.pig';

-- admin.order.deposit.confirmed.egg ──────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Ny eggordre</span></p>
<p>Ny bestilling <strong>{{order_number}}</strong> er registrert.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Kunde</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{customer_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">E-post</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_email}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Telefon</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_phone}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Rase</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{breed_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Uke</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{week_number}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Levering</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{delivery_date}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Grunnantall</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{base_quantity}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Tillegg</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{additions_quantity}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Totalt antall</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{total_quantity}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Pris/egg</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{price_per_egg_nok}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Leveringsm&aring;te</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{delivery_method_label}}</td></tr>
</table></td></tr></table>
{{additions_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Forskudd</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Rest</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">Totalt</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se i admin</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">New egg order</span></p>
<p>New order <strong>{{order_number}}</strong> has been registered.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Customer</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{customer_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Email</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_email}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Phone</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_phone}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Breed</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{breed_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Week</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{week_number}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Delivery</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{delivery_date}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Total qty</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{total_quantity}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Price/egg</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{price_per_egg_nok}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Deposit</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Remainder</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;font-weight:700;border-top:2px solid #E8DFD5;">Total</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View in admin</a>
</td></tr></table>$$
WHERE template_key = 'admin.order.deposit.confirmed.egg';

-- admin.order.deposit.confirmed.chicken ──────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Ny kyllingordre</span></p>
<p>Ny bestilling <strong>{{order_number}}</strong> er registrert.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Kunde</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{customer_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">E-post</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_email}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Telefon</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_phone}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Rase</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{breed_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Fugler</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{total_birds_label}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Henting</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Uke {{pickup_week}} &ndash; {{pickup_date}}</td></tr>
</table></td></tr></table>
{{order_lines_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Forskudd</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Rest</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">Totalt</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se i admin</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">New chicken order</span></p>
<p>New order <strong>{{order_number}}</strong> has been registered.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Customer</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{customer_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Email</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_email}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Phone</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_phone}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Breed</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{breed_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Birds</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{total_birds_label_en}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Pickup</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Week {{pickup_week}} &ndash; {{pickup_date}}</td></tr>
</table></td></tr></table>
{{order_lines_html_en}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Deposit</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Remainder</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;">Total</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View in admin</a>
</td></tr></table>$$
WHERE template_key = 'admin.order.deposit.confirmed.chicken';

-- ═══════════════════════════════════════════════════════════════════════════
-- REMAINING SUPPORT TEMPLATES (admin-facing)
-- ═══════════════════════════════════════════════════════════════════════════

-- support.message.admin.new ──────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Ny kundemelding</span></p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Tr&aring;d</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{thread_id}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Kunde</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">E-post</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_email}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Telefon</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_phone}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Ordre</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{order_number}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Type</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{message_type}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Emne</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{subject_line}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr>
<td style="border-left:4px solid #E8DFD5;background:#FAF8F5;padding:14px 16px;border-radius:0 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1C1210;white-space:pre-wrap;">{{message_text}}</td>
</tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">New customer message</span></p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Thread</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{thread_id}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Customer</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Email</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_email}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Phone</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_phone}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Order</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{order_number}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Type</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{message_type}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Subject</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{subject_line}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr>
<td style="border-left:4px solid #E8DFD5;background:#FAF8F5;padding:14px 16px;border-radius:0 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1C1210;white-space:pre-wrap;">{{message_text}}</td>
</tr></table>$$
WHERE template_key = 'support.message.admin.new';

-- support.reply.admin.notification ───────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Kundesvar</span></p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Tr&aring;d</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{thread_id}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Kunde</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">E-post</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_email}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Ordre</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{order_number}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Emne</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{subject_line}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr>
<td style="border-left:4px solid #E8DFD5;background:#FAF8F5;padding:14px 16px;border-radius:0 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1C1210;white-space:pre-wrap;">{{reply_text}}</td>
</tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Customer reply</span></p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Thread</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{thread_id}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Customer</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Email</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_email}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Order</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{order_number}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Subject</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{subject_line}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr>
<td style="border-left:4px solid #E8DFD5;background:#FAF8F5;padding:14px 16px;border-radius:0 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1C1210;white-space:pre-wrap;">{{reply_text}}</td>
</tr></table>$$
WHERE template_key = 'support.reply.admin.notification';

-- support.contact.admin.new ──────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Ny henvendelse</span></p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Kunde</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{customer_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">E-post</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_email}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Telefon</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_phone}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Ordre</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{order_number}}</td></tr>
</table></td></tr></table>
{{order_details}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr>
<td style="border-left:4px solid #E8DFD5;background:#FAF8F5;padding:14px 16px;border-radius:0 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1C1210;white-space:pre-wrap;">{{message_text}}</td>
</tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">New inquiry</span></p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Customer</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{customer_name}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Email</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_email}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Phone</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{customer_phone}}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Order</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">{{order_number}}</td></tr>
</table></td></tr></table>
{{order_details}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr>
<td style="border-left:4px solid #E8DFD5;background:#FAF8F5;padding:14px 16px;border-radius:0 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1C1210;white-space:pre-wrap;">{{message_text}}</td>
</tr></table>$$
WHERE template_key = 'support.contact.admin.new';

-- support.contact.customer.confirmation ──────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p>Hei {{customer_first_name}},</p>
<p>Vi har mottatt henvendelsen din og vil ta kontakt s&aring; snart som mulig.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Ordre</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{order_number}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr>
<td style="border-left:4px solid #E8DFD5;background:#FAF8F5;padding:14px 16px;border-radius:0 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1C1210;white-space:pre-wrap;">{{message_text}}</td>
</tr></table>
<p style="font-size:13px;color:#6B5B4E;">Forventet svartid: Innen 24 timer p&aring; hverdager</p>$$,
  body_en = $$<p>Hi {{customer_first_name}},</p>
<p>We have received your inquiry and will get back to you as soon as possible.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;">Order</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{order_number}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;"><tr>
<td style="border-left:4px solid #E8DFD5;background:#FAF8F5;padding:14px 16px;border-radius:0 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1C1210;white-space:pre-wrap;">{{message_text}}</td>
</tr></table>
<p style="font-size:13px;color:#6B5B4E;">Expected response time: Within 24 hours on business days</p>$$
WHERE template_key = 'support.contact.customer.confirmation';

-- ═══════════════════════════════════════════════════════════════════════════
-- WAITLIST & WISHLIST TEMPLATES
-- ═══════════════════════════════════════════════════════════════════════════

-- egg.waitlist.available ─────────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Egg tilgjengelig</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Gode nyheter! <strong>{{breed_name}}</strong> rugeegg er n&aring; tilgjengelig for uke {{week_number}} (levering {{delivery_date}}).</p>
<p>Du har <strong>{{reservation_window_minutes}} minutter</strong> med prioritert tilgang til &aring; bestille.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{inventory_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Bestill n&aring;</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Eggs available</span></p>
<p>Hi {{customer_first_name}},</p>
<p>Great news! <strong>{{breed_name}}</strong> hatching eggs are now available for week {{week_number}} (delivery {{delivery_date}}).</p>
<p>You have <strong>{{reservation_window_minutes}} minutes</strong> of priority access to order.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{inventory_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Order now</a>
</td></tr></table>$$
WHERE template_key = 'egg.waitlist.available';

-- wishlist.received ──────────────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p>Hei {{customer_first_name}},</p>
<p>Vi har mottatt &oslash;nskelisten din for uke {{week_number}} ({{delivery_date}}).</p>
{{wishlist_lines_html}}
<p>Vi gj&oslash;r v&aring;rt beste for &aring; tildele s&aring; mange egg som mulig. Du f&aring;r beskjed n&aring;r vi har oppdatert ordren.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se bestillingen</a>
</td></tr></table>$$,
  body_en = $$<p>Hi {{customer_first_name}},</p>
<p>We have received your wishlist for week {{week_number}} ({{delivery_date}}).</p>
{{wishlist_lines_html}}
<p>We will do our best to allocate as many eggs as possible. You will be notified when we have updated your order.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View order</a>
</td></tr></table>$$
WHERE template_key = 'wishlist.received';

-- wishlist.allocated ─────────────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Egg tildelt</span></p>
<p>Hei {{customer_first_name}},</p>
<p>Vi har tildelt ekstra egg fra &oslash;nskelisten din for uke {{week_number}} ({{delivery_date}}).</p>
{{allocated_lines_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se oppdatert ordre</a>
</td></tr></table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Eggs allocated</span></p>
<p>Hi {{customer_first_name}},</p>
<p>We have allocated extra eggs from your wishlist for week {{week_number}} ({{delivery_date}}).</p>
{{allocated_lines_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View updated order</a>
</td></tr></table>$$
WHERE template_key = 'wishlist.allocated';

-- wishlist.not_allocated ─────────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p>Hei {{customer_first_name}},</p>
<p>Dessverre hadde vi ikke nok ekstra egg tilgjengelig for uke {{week_number}} ({{delivery_date}}) denne gangen.</p>
<p>Du kan sende en ny &oslash;nskeliste for kommende uker.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">Se bestillingen</a>
</td></tr></table>$$,
  body_en = $$<p>Hi {{customer_first_name}},</p>
<p>Unfortunately we did not have enough extra eggs available for week {{week_number}} ({{delivery_date}}) this time.</p>
<p>You can submit a new wishlist for upcoming weeks.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td align="center" style="border-radius:8px;background:#2C1810;">
<a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #2C1810;">View order</a>
</td></tr></table>$$
WHERE template_key = 'wishlist.not_allocated';

COMMIT;
