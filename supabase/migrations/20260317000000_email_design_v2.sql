-- =============================================================================
-- Email Design V2: Complete rewrite of all email template bodies
-- Modern design with VML Outlook fallback buttons, gold-accented info cards,
-- progress indicators, and improved payment summaries.
-- Part 1: Pig templates only. More templates to follow.
-- =============================================================================

BEGIN;

-- ─── Design token reference (used inline below) ────────────────────────────
-- Brand dark:     #2C1810   (header bg, primary buttons)
-- Accent gold:    #8B6914   (gold accent, step numbers, card borders)
-- Warm bg:        #F5EFE7   (page background — handled by wrapper)
-- Card bg:        #FFFDF9   (card surfaces)
-- Muted bg:       #FAF8F5   (info card backgrounds)
-- Gold50:         #FFF9E6   (highlighted total row)
-- Text primary:   #1C1210
-- Text secondary: #6B5B4E
-- Text tertiary:  #9B8E82
-- Border:         #E8DFD5
-- Success:        #2D6A4F / #ECFDF5 / #BBF7D0
-- Warning:        #B45309 / #FFFBEB / #FDE68A
-- Error:          #991B1B / #FEF2F2 / #FECACA
-- Heading font:   Georgia, 'Times New Roman', serif
-- Body font:      Arial, Helvetica, sans-serif

-- ═══════════════════════════════════════════════════════════════════════════════
-- PIG TEMPLATES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. pig.order.deposit.confirmed.customer ────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Bestilling bekreftet</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hei {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">Takk! Vi har mottatt forskuddet for bestilling <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:8px;margin:0 0 20px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;width:120px;">Boks</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{box_label}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Ribbe</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{ribbe_choice}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Levering</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{delivery_label}}</td></tr>
</table></td></tr></table>
{{extras_html}}
{{discount_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FFFDF9;border:1px solid #E8DFD5;border-radius:8px;margin:0 0 24px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Forskudd betalt</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Restbetaling</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:10px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;background:#FFF9E6;">Totalt</td><td style="padding:10px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;background:#FFF9E6;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20px;"><tr><td style="padding:0 0 10px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Hva skjer n&aring;?</td></tr><tr><td style="padding:14px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">1</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">Vi reserverer din Mangalitsa-boks</td></tr>
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">2</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">Du f&aring;r beskjed n&aring;r ordren n&aelig;rmer seg levering</td></tr>
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">3</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">F&oslash;lg bestillingen p&aring; Min side</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">&Aring;pne Min side</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">&Aring;pne Min side</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Order confirmed</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hi {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">Thank you! We have received the deposit for order <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:8px;margin:0 0 20px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;width:120px;">Box</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{box_label}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Rib option</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{ribbe_choice}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Delivery</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{delivery_label}}</td></tr>
</table></td></tr></table>
{{extras_html}}
{{discount_html}}
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FFFDF9;border:1px solid #E8DFD5;border-radius:8px;margin:0 0 24px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Deposit paid</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Remaining</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:10px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;background:#FFF9E6;">Total</td><td style="padding:10px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;background:#FFF9E6;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20px;"><tr><td style="padding:0 0 10px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">What happens next?</td></tr><tr><td style="padding:14px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">1</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">We reserve your Mangalitsa box</td></tr>
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">2</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">You will be notified as your order approaches delivery</td></tr>
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">3</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">Follow your order on My Page</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">Open My Page</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">Open My Page</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$
WHERE template_key = 'pig.order.deposit.confirmed.customer';


-- ─── 2. pig.order.remainder.paid.customer ───────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Betaling fullf&oslash;rt</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hei {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">Fantastisk &mdash; bestillingen din <strong>{{order_number}}</strong> er n&aring; fullbetalt!</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:8px;margin:0 0 20px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;width:120px;">Boks</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{box_label}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Levering</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{delivery_label}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FFFDF9;border:1px solid #E8DFD5;border-radius:8px;margin:0 0 24px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:10px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;background:#FFF9E6;">Totalt betalt</td><td style="padding:10px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;background:#FFF9E6;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20px;"><tr><td style="padding:0 0 10px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Hva skjer n&aring;?</td></tr><tr><td style="padding:14px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">1</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">Vi forbereder bestillingen din</td></tr>
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">2</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">Du f&aring;r beskjed n&aring;r den er klar for henting/levering</td></tr>
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">3</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">Se detaljer p&aring; Min side</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">Se bestillingen</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">Se bestillingen</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Payment completed</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hi {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">Fantastic &mdash; your order <strong>{{order_number}}</strong> is now fully paid!</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:8px;margin:0 0 20px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;width:120px;">Box</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{box_label}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Delivery</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{delivery_label}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FFFDF9;border:1px solid #E8DFD5;border-radius:8px;margin:0 0 24px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:10px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;background:#FFF9E6;">Total paid</td><td style="padding:10px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;background:#FFF9E6;">{{total_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20px;"><tr><td style="padding:0 0 10px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">What happens next?</td></tr><tr><td style="padding:14px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">1</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">We are preparing your order</td></tr>
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">2</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">You will be notified when it is ready for pickup/delivery</td></tr>
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">3</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">View details on My Page</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">View order</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">View order</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$
WHERE template_key = 'pig.order.remainder.paid.customer';


-- ─── 3. pig.remainder.reminder (MAJOR OVERHAUL) ────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">P&aring;minnelse</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hei {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 8px;">Din bestilling <strong>{{order_number}}</strong> er ikke ferdig betalt.</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">Restbel&oslash;pet m&aring; betales innen fristen for &aring; sikre leveransen av din Mangalitsa-boks.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:8px;margin:0 0 20px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;width:130px;">Bestilling</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{order_number}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Produkt</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{box_label}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FFFDF9;border:1px solid #E8DFD5;border-radius:8px;margin:0 0 20px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Totalt</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{total_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Forskudd betalt</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:10px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;background:#FFF9E6;">Gjenstende</td><td style="padding:10px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;background:#FFF9E6;">{{remainder_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20px;"><tr><td align="center" style="padding:24px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;">
<span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;color:#6B5B4E;text-transform:uppercase;letter-spacing:0.5px;display:block;margin:0 0 6px;">Gjenstende bel&oslash;p</span>
<span style="font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:700;color:#2C1810;line-height:1.2;">{{remainder_amount_nok}}</span>
</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;margin:0 0 20px;"><tr><td style="padding:14px 18px;">
<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#B45309;font-weight:700;margin:0 0 4px;">Betalingsfrist: {{due_date}} ({{days_left}} dager igjen)</p>
</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FEF2F2;border-left:4px solid #FECACA;border-radius:8px;margin:0 0 20px;"><tr><td style="padding:14px 18px;">
<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#991B1B;line-height:1.5;margin:0;">Hvis restbel&oslash;pet ikke betales innen fristen, vil bestillingen dessverre bli kansellert.</p>
</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 24px;"><tr><td style="padding:10px 0;">
<p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B5B4E;margin:0 0 8px;">P&aring;minnelse {{reminder_number}} av {{total_reminders}}</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;height:6px;background:#E8DFD5;border-radius:3px;"><tr><td style="width:{{reminder_progress_pct}}%;background:#8B6914;border-radius:3px;height:6px;"></td><td style="height:6px;"></td></tr></table>
</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">Betal rest n&aring;</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">Betal rest n&aring;</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Reminder</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hi {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 8px;">Your order <strong>{{order_number}}</strong> has not been fully paid.</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">The remaining amount must be paid before the deadline to secure delivery of your Mangalitsa box.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:8px;margin:0 0 20px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;width:130px;">Order</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{order_number}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Product</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{box_label}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FFFDF9;border:1px solid #E8DFD5;border-radius:8px;margin:0 0 20px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Total</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{total_amount_nok}}</td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;">Deposit paid</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
<tr><td style="padding:10px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;border-top:2px solid #E8DFD5;background:#FFF9E6;">Remaining</td><td style="padding:10px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:700;text-align:right;border-top:2px solid #E8DFD5;background:#FFF9E6;">{{remainder_amount_nok}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20px;"><tr><td align="center" style="padding:24px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;">
<span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;color:#6B5B4E;text-transform:uppercase;letter-spacing:0.5px;display:block;margin:0 0 6px;">Remaining amount</span>
<span style="font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:700;color:#2C1810;line-height:1.2;">{{remainder_amount_nok}}</span>
</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;margin:0 0 20px;"><tr><td style="padding:14px 18px;">
<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#B45309;font-weight:700;margin:0 0 4px;">Payment deadline: {{due_date}} ({{days_left}} days remaining)</p>
</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FEF2F2;border-left:4px solid #FECACA;border-radius:8px;margin:0 0 20px;"><tr><td style="padding:14px 18px;">
<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#991B1B;line-height:1.5;margin:0;">If the remaining amount is not paid before the deadline, the order will unfortunately be cancelled.</p>
</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 24px;"><tr><td style="padding:10px 0;">
<p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B5B4E;margin:0 0 8px;">Reminder {{reminder_number}} of {{total_reminders}}</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;height:6px;background:#E8DFD5;border-radius:3px;"><tr><td style="width:{{reminder_progress_pct}}%;background:#8B6914;border-radius:3px;height:6px;"></td><td style="height:6px;"></td></tr></table>
</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">Pay remainder now</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">Pay remainder now</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$
WHERE template_key = 'pig.remainder.reminder';


-- ─── 4. pig.remainder.explainer.full ────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Viktig informasjon</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hei {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">Vi vil gjerne forklare hvordan restbetalingen for bestilling <strong>{{order_number}}</strong> fungerer.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:8px;margin:0 0 20px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;width:130px;">Restbel&oslash;p</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Betalingsfrist</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{due_date}}</td></tr>
</table></td></tr></table>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">Du har allerede betalt forskuddet. Restbel&oslash;pet forfaller f&oslash;r levering.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20px;"><tr><td style="padding:0 0 10px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">Slik fungerer det</td></tr><tr><td style="padding:14px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">1</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">Du mottar p&aring;minnelser frem mot fristen</td></tr>
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">2</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">Betal enkelt via lenken under</td></tr>
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">3</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">Levering sikres n&aring;r betalingen er registrert</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">Se bestillingen</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">Se bestillingen</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Important information</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hi {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">We would like to explain how the remainder payment for order <strong>{{order_number}}</strong> works.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:8px;margin:0 0 20px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;width:130px;">Remaining</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{remainder_amount_nok}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Due date</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{due_date}}</td></tr>
</table></td></tr></table>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">You have already paid the deposit. The remaining amount is due before delivery.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20px;"><tr><td style="padding:0 0 10px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;color:#1C1210;border-bottom:2px solid #8B6914;">How it works</td></tr><tr><td style="padding:14px 0 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">1</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">You will receive reminders leading up to the deadline</td></tr>
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">2</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">Pay easily using the link below</td></tr>
<tr><td style="padding:8px 12px 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#8B6914;vertical-align:top;width:36px;text-align:center;">3</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;line-height:1.5;">Delivery is secured once payment is registered</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">View order</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">View order</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$
WHERE template_key = 'pig.remainder.explainer.full';


-- ─── 5. pig.remainder.explainer.reduced ─────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Alt i orden</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hei {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 24px;">Restbetalingen for bestilling <strong>{{order_number}}</strong> er allerede registrert &mdash; du trenger ikke foreta deg noe.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">Se bestillingen</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">Se bestillingen</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">All in order</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hi {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 24px;">The remainder payment for order <strong>{{order_number}}</strong> has already been registered &mdash; no action needed on your part.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">View order</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">View order</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$
WHERE template_key = 'pig.remainder.explainer.reduced';


-- ─── 6. pig.order.ready_for_pickup ──────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Klar for henting</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hei {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">Din Mangalitsa-bestilling <strong>{{order_number}}</strong> er klar!</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:8px;margin:0 0 24px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;width:120px;">Henting</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{delivery_label}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">Se detaljer</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">Se detaljer</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Ready for pickup</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hi {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">Your Mangalitsa order <strong>{{order_number}}</strong> is ready!</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:8px;margin:0 0 24px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;width:120px;">Pickup</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{delivery_label}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">View details</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">View details</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$
WHERE template_key = 'pig.order.ready_for_pickup';


-- ─── 7. pig.order.locked.finalized ──────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Ordre l&aring;st</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hei {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 24px;">Bestilling <strong>{{order_number}}</strong> er n&aring; ferdigstilt og l&aring;st.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">Se bestillingen</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">Se bestillingen</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Order locked</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hi {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 24px;">Order <strong>{{order_number}}</strong> is now finalized and locked.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">View order</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">View order</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$
WHERE template_key = 'pig.order.locked.finalized';


-- ─── 8. pig.order.cancelled ─────────────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#991B1B;background:#FEF2F2;border:1px solid #FECACA;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Ordre kansellert</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hei {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Vi beklager, men bestilling <strong>{{order_number}}</strong> er kansellert.</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">&Aring;rsak: {{cancel_reason}}</p>
{{refund_text}}
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">Se bestillingen</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">Se bestillingen</a><!--<![endif]-->
  </td>
</tr>
</table>$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#991B1B;background:#FEF2F2;border:1px solid #FECACA;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Order cancelled</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hi {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">We are sorry, but order <strong>{{order_number}}</strong> has been cancelled.</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">Reason: {{cancel_reason}}</p>
{{refund_text}}
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">View order</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">View order</a><!--<![endif]-->
  </td>
</tr>
</table>$$
WHERE template_key = 'pig.order.cancelled';


-- ─── 9. pig.order.refund.requested ──────────────────────────────────────────
UPDATE email_templates SET
  body_no = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Refundering registrert</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hei {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">En refundering er registrert for bestilling <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:8px;margin:0 0 24px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;width:120px;">Bel&oslash;p</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{refund_amount_nok}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Type</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{refund_type_label}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">Se bestillingen</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">Se bestillingen</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$,
  body_en = $$<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Refund registered</span></p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 12px;">Hi {{customer_first_name}},</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1210;line-height:1.6;margin:0 0 20px;">A refund has been registered for order <strong>{{order_number}}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:8px;margin:0 0 24px;"><tr><td style="padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;width:120px;">Amount</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{refund_amount_nok}}</td></tr>
<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B5B4E;vertical-align:top;">Type</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;font-weight:600;">{{refund_type_label}}</td></tr>
</table></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
<tr>
  <td align="center" style="border-radius:10px;background:#2C1810;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{order_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2C1810" fillcolor="#2C1810"><v:textbox><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">View order</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{order_url}}" target="_blank" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid #2C1810;mso-hide:all;">View order</a><!--<![endif]-->
  </td>
</tr>
</table>
{{tip_html}}$$
WHERE template_key = 'pig.order.refund.requested';


-- ═══════════════════════════════════════════════════════════════════════════
-- Part 2: Egg templates
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── egg.order.deposit.confirmed.customer ───
UPDATE email_templates SET
  body_no = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#ECFDF5;color:#2D6A4F;border:1px solid #BBF7D0;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Bestilling bekreftet</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hei {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Takk! Vi har mottatt forskuddet for rugeegg-bestilling {{order_number}}.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:0 8px 8px 0;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Rase</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{breed_name}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Uke</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{week_number}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Grunnordre</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{base_quantity}} egg</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Tillegg</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{additions_quantity}} egg</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Totalt</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{total_quantity}} egg</td></tr>
      </table>
    </td></tr>
  </table>
  {{additions_html}}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:10px 0;font-size:14px;color:#6B5B4E;border-bottom:1px solid #E8DFD5;">Forskudd</td><td style="padding:10px 0;font-size:14px;color:#1C1210;text-align:right;border-bottom:1px solid #E8DFD5;">{{deposit_amount_nok}}</td></tr>
    <tr><td style="padding:10px 0;font-size:14px;color:#6B5B4E;border-bottom:1px solid #E8DFD5;">Restbetaling</td><td style="padding:10px 0;font-size:14px;color:#1C1210;text-align:right;border-bottom:1px solid #E8DFD5;">{{remainder_amount_nok}}</td></tr>
    <tr><td style="padding:12px 8px;font-size:15px;color:#1C1210;font-weight:700;background:#FFF9E6;border-radius:6px 0 0 6px;">Totalt</td><td style="padding:12px 8px;font-size:15px;color:#1C1210;font-weight:700;text-align:right;background:#FFF9E6;border-radius:0 6px 6px 0;">{{total_amount_nok}}</td></tr>
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">1</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Eggene reserveres til din bestilling</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">2</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Du f&aring;r beskjed n&aring;r eggene er klare for sending</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">3</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">F&oslash;lg bestillingen p&aring; Min side</td>
        </tr>
      </table>
    </td></tr>
  </table>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{my_page_url}}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">&Aring;pne Min side</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{my_page_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">&Aring;pne Min side</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$,
  body_en = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#ECFDF5;color:#2D6A4F;border:1px solid #BBF7D0;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Order confirmed</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Thank you! We have received the deposit for hatching egg order {{order_number}}.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:0 8px 8px 0;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Breed</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{breed_name}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Week</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{week_number}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Base order</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{base_quantity}} eggs</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Additions</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{additions_quantity}} eggs</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Total</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{total_quantity}} eggs</td></tr>
      </table>
    </td></tr>
  </table>
  {{additions_html}}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:10px 0;font-size:14px;color:#6B5B4E;border-bottom:1px solid #E8DFD5;">Deposit</td><td style="padding:10px 0;font-size:14px;color:#1C1210;text-align:right;border-bottom:1px solid #E8DFD5;">{{deposit_amount_nok}}</td></tr>
    <tr><td style="padding:10px 0;font-size:14px;color:#6B5B4E;border-bottom:1px solid #E8DFD5;">Remainder</td><td style="padding:10px 0;font-size:14px;color:#1C1210;text-align:right;border-bottom:1px solid #E8DFD5;">{{remainder_amount_nok}}</td></tr>
    <tr><td style="padding:12px 8px;font-size:15px;color:#1C1210;font-weight:700;background:#FFF9E6;border-radius:6px 0 0 6px;">Total</td><td style="padding:12px 8px;font-size:15px;color:#1C1210;font-weight:700;text-align:right;background:#FFF9E6;border-radius:0 6px 6px 0;">{{total_amount_nok}}</td></tr>
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">1</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">The eggs are reserved for your order</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">2</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">You will be notified when the eggs are ready for shipping</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">3</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Track your order on My Page</td>
        </tr>
      </table>
    </td></tr>
  </table>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{my_page_url}}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Open My Page</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{my_page_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Open My Page</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$
WHERE template_key = 'egg.order.deposit.confirmed.customer';


-- ─── egg.order.remainder.paid.customer ───
UPDATE email_templates SET
  body_no = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#ECFDF5;color:#2D6A4F;border:1px solid #BBF7D0;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Betaling fullf&oslash;rt</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hei {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Bestilling {{order_number}} er n&aring; fullbetalt!</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:0 8px 8px 0;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Antall</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{total_quantity}} egg</td></tr>
      </table>
    </td></tr>
  </table>
  {{additions_html}}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:12px 8px;font-size:15px;color:#1C1210;font-weight:700;background:#FFF9E6;border-radius:6px 0 0 6px;">Totalt</td><td style="padding:12px 8px;font-size:15px;color:#1C1210;font-weight:700;text-align:right;background:#FFF9E6;border-radius:0 6px 6px 0;">{{total_amount_nok}}</td></tr>
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">1</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Eggene pakkes og sendes</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">2</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Du f&aring;r sporingsnummer p&aring; e-post</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">3</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Se detaljer p&aring; Min side</td>
        </tr>
      </table>
    </td></tr>
  </table>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{my_page_url}}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">&Aring;pne Min side</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{my_page_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">&Aring;pne Min side</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$,
  body_en = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#ECFDF5;color:#2D6A4F;border:1px solid #BBF7D0;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Payment complete</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Order {{order_number}} is now fully paid!</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:0 8px 8px 0;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Quantity</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{total_quantity}} eggs</td></tr>
      </table>
    </td></tr>
  </table>
  {{additions_html}}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:12px 8px;font-size:15px;color:#1C1210;font-weight:700;background:#FFF9E6;border-radius:6px 0 0 6px;">Total</td><td style="padding:12px 8px;font-size:15px;color:#1C1210;font-weight:700;text-align:right;background:#FFF9E6;border-radius:0 6px 6px 0;">{{total_amount_nok}}</td></tr>
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">1</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">The eggs are being packed and shipped</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">2</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">You will receive a tracking number by email</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">3</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">View details on My Page</td>
        </tr>
      </table>
    </td></tr>
  </table>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{my_page_url}}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Open My Page</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{my_page_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Open My Page</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$
WHERE template_key = 'egg.order.remainder.paid.customer';


-- ─── egg.remainder.reminder ───
UPDATE email_templates SET
  body_no = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">P&aring;minnelse</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hei {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Din rugeegg-bestilling {{order_number}} er ikke ferdig betalt.</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Restbel&oslash;pet m&aring; betales innen fristen for &aring; sikre leveransen.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:0 8px 8px 0;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Bestilling</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{order_number}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Rase</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{breed_name}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Antall</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{total_quantity}} egg</td></tr>
      </table>
    </td></tr>
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:10px 0;font-size:14px;color:#6B5B4E;border-bottom:1px solid #E8DFD5;">Totalt</td><td style="padding:10px 0;font-size:14px;color:#1C1210;text-align:right;border-bottom:1px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
    <tr><td style="padding:10px 0;font-size:14px;color:#6B5B4E;border-bottom:1px solid #E8DFD5;">Forskudd betalt</td><td style="padding:10px 0;font-size:14px;color:#1C1210;text-align:right;border-bottom:1px solid #E8DFD5;">{{deposit_amount_nok}}</td></tr>
    <tr><td style="padding:12px 8px;font-size:15px;color:#1C1210;font-weight:700;background:#FFF9E6;border-radius:6px 0 0 6px;">Gjest&aring;ende</td><td style="padding:12px 8px;font-size:15px;color:#1C1210;font-weight:700;text-align:right;background:#FFF9E6;border-radius:0 6px 6px 0;">{{remainder_amount_nok}}</td></tr>
  </table>
  <div style="text-align:center;margin:0 0 24px;padding:20px;background:#FFF9E6;border-radius:10px;">
    <p style="font-size:13px;color:#6B5B4E;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">Gjest&aring;ende bel&oslash;p</p>
    <p style="font-family:Georgia,'Times New Roman',serif;font-size:32px;color:#1C1210;font-weight:700;margin:0;">{{remainder_amount_nok}}</p>
  </div>
  <div style="margin:0 0 24px;padding:16px 20px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;text-align:center;">
    <p style="font-size:15px;color:#B45309;font-weight:600;margin:0;">Betalingsfrist: {{due_date}} ({{days_left}} dager igjen)</p>
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #B45309;background:#FFFBEB;border-radius:0 8px 8px 0;">
    <tr><td style="padding:16px 20px;">
      <p style="font-size:14px;line-height:1.6;color:#B45309;margin:0;">Hvis restbel&oslash;pet ikke betales innen fristen, vil bestillingen bli kansellert og eggene frigitt til andre kunder.</p>
    </td></tr>
  </table>
  <p style="font-size:13px;color:#9B8E82;text-align:center;margin:0 0 24px;">P&aring;minnelse {{reminder_number}} av {{total_reminders}}</p>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{payment_url}}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Betal rest n&aring;</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{payment_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Betal rest n&aring;</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$,
  body_en = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Reminder</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Your hatching egg order {{order_number}} has not been fully paid.</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">The remaining balance must be paid before the deadline to secure delivery.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:0 8px 8px 0;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Order</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{order_number}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Breed</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{breed_name}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Quantity</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{total_quantity}} eggs</td></tr>
      </table>
    </td></tr>
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:10px 0;font-size:14px;color:#6B5B4E;border-bottom:1px solid #E8DFD5;">Total</td><td style="padding:10px 0;font-size:14px;color:#1C1210;text-align:right;border-bottom:1px solid #E8DFD5;">{{total_amount_nok}}</td></tr>
    <tr><td style="padding:10px 0;font-size:14px;color:#6B5B4E;border-bottom:1px solid #E8DFD5;">Deposit paid</td><td style="padding:10px 0;font-size:14px;color:#1C1210;text-align:right;border-bottom:1px solid #E8DFD5;">{{deposit_amount_nok}}</td></tr>
    <tr><td style="padding:12px 8px;font-size:15px;color:#1C1210;font-weight:700;background:#FFF9E6;border-radius:6px 0 0 6px;">Remaining</td><td style="padding:12px 8px;font-size:15px;color:#1C1210;font-weight:700;text-align:right;background:#FFF9E6;border-radius:0 6px 6px 0;">{{remainder_amount_nok}}</td></tr>
  </table>
  <div style="text-align:center;margin:0 0 24px;padding:20px;background:#FFF9E6;border-radius:10px;">
    <p style="font-size:13px;color:#6B5B4E;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">Remaining amount</p>
    <p style="font-family:Georgia,'Times New Roman',serif;font-size:32px;color:#1C1210;font-weight:700;margin:0;">{{remainder_amount_nok}}</p>
  </div>
  <div style="margin:0 0 24px;padding:16px 20px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;text-align:center;">
    <p style="font-size:15px;color:#B45309;font-weight:600;margin:0;">Payment deadline: {{due_date}} ({{days_left}} days left)</p>
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #B45309;background:#FFFBEB;border-radius:0 8px 8px 0;">
    <tr><td style="padding:16px 20px;">
      <p style="font-size:14px;line-height:1.6;color:#B45309;margin:0;">If the remaining balance is not paid before the deadline, your order will be cancelled and the eggs released to other customers.</p>
    </td></tr>
  </table>
  <p style="font-size:13px;color:#9B8E82;text-align:center;margin:0 0 24px;">Reminder {{reminder_number}} of {{total_reminders}}</p>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{payment_url}}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Pay remainder now</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{payment_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Pay remainder now</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$
WHERE template_key = 'egg.remainder.reminder';


-- ─── egg.order.shipped.customer ───
UPDATE email_templates SET
  body_no = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#ECFDF5;color:#2D6A4F;border:1px solid #BBF7D0;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Eggene er sendt!</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hei {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Rugeegg-bestilling {{order_number}} er n&aring; p&aring; vei til deg!</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:0 8px 8px 0;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Sporingsnummer</td><td style="padding:4px 0;font-size:14px;text-align:right;"><a href="{{tracking_url}}" style="color:#8B6914;font-weight:600;text-decoration:underline;">{{tracking_number}}</a></td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Leveringsuke</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{delivery_week}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Leveringsdato</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{delivery_date}}</td></tr>
      </table>
    </td></tr>
  </table>
  {{order_lines_html}}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">1</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">F&oslash;lg forsendelsen med sporingsnummeret</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">2</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Pakk ut eggene forsiktig ved ankomst</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">3</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Start ruging s&aring; snart som mulig</td>
        </tr>
      </table>
    </td></tr>
  </table>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{tracking_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Spor forsendelsen</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{tracking_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Spor forsendelsen</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$,
  body_en = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#ECFDF5;color:#2D6A4F;border:1px solid #BBF7D0;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Eggs shipped!</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Hatching egg order {{order_number}} is now on its way to you!</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:0 8px 8px 0;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Tracking number</td><td style="padding:4px 0;font-size:14px;text-align:right;"><a href="{{tracking_url}}" style="color:#8B6914;font-weight:600;text-decoration:underline;">{{tracking_number}}</a></td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Delivery week</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{delivery_week}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Delivery date</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{delivery_date}}</td></tr>
      </table>
    </td></tr>
  </table>
  {{order_lines_html}}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">1</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Track your shipment with the tracking number</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">2</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Unpack the eggs carefully upon arrival</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">3</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Start incubation as soon as possible</td>
        </tr>
      </table>
    </td></tr>
  </table>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{tracking_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Track shipment</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{tracking_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Track shipment</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$
WHERE template_key = 'egg.order.shipped.customer';


-- ─── egg.delivery.day_before ───
UPDATE email_templates SET
  body_no = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#ECFDF5;color:#2D6A4F;border:1px solid #BBF7D0;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Levering i morgen</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hei {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Rugeegg-bestilling {{order_number}} ankommer i morgen!</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">S&oslash;rg for &aring; ha rugemaskinen klar.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">1</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Sjekk at rugemaskinen holder 37.5&deg;C</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">2</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">La eggene temperere i romtemperatur i 12 timer</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">3</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Legg eggene forsiktig i maskinen</td>
        </tr>
      </table>
    </td></tr>
  </table>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{upsell_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Se flere rugetips</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{upsell_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Se flere rugetips</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$,
  body_en = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#ECFDF5;color:#2D6A4F;border:1px solid #BBF7D0;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Delivery tomorrow</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Hatching egg order {{order_number}} arrives tomorrow!</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Make sure to have your incubator ready.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">1</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Check that the incubator holds 37.5&deg;C</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">2</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Let the eggs acclimate at room temperature for 12 hours</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="border-top:1px solid #E8DFD5;padding:16px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:40px;vertical-align:top;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">3</span></td>
          <td style="vertical-align:top;padding-top:4px;font-size:15px;line-height:1.5;color:#1C1210;">Place the eggs carefully in the incubator</td>
        </tr>
      </table>
    </td></tr>
  </table>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{upsell_url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">See more hatching tips</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{upsell_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">See more hatching tips</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$
WHERE template_key = 'egg.delivery.day_before';


-- ─── egg.hatch.followup ───
UPDATE email_templates SET
  body_no = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#ECFDF5;color:#2D6A4F;border:1px solid #BBF7D0;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Hvordan gikk klekkingen?</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hei {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Det er noen dager siden du fikk eggene fra bestilling {{order_number}}. Vi h&aring;per alt gikk bra!</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Vi vil gjerne h&oslash;re hvordan det gikk. Del gjerne din erfaring.</p>
  {{deposit_discount_code}}
  <div style="text-align:center;margin:0 0 16px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{message_url}}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Send oss en melding</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{message_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Send oss en melding</a><!--<![endif]-->
  </div>
  <div style="text-align:center;margin:0 0 24px;">
    <a href="{{pork_url}}" style="display:inline-block;color:#8B6914;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;text-decoration:underline;">Se v&aring;re Mangalitsa-bokser</a>
  </div>
  {{tip_html}}
</div>$$,
  body_en = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#ECFDF5;color:#2D6A4F;border:1px solid #BBF7D0;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">How did the hatching go?</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">It has been a few days since you received the eggs from order {{order_number}}. We hope everything went well!</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">We would love to hear how it went. Feel free to share your experience.</p>
  {{deposit_discount_code}}
  <div style="text-align:center;margin:0 0 16px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{message_url}}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Send us a message</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{message_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Send us a message</a><!--<![endif]-->
  </div>
  <div style="text-align:center;margin:0 0 24px;">
    <a href="{{pork_url}}" style="display:inline-block;color:#8B6914;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;text-decoration:underline;">See our Mangalitsa boxes</a>
  </div>
  {{tip_html}}
</div>$$
WHERE template_key = 'egg.hatch.followup';


-- ─── egg.order.forfeited ───
UPDATE email_templates SET
  body_no = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#FEF2F2;color:#991B1B;border:1px solid #FECACA;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Bestilling kansellert</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hei {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Bestilling {{order_number}} er dessverre kansellert fordi restbetalingen ikke ble mottatt innen fristen.</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Forskuddet er ikke refunderbart.</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">&Oslash;nsker du &aring; bestille p&aring; nytt? Vi har fortsatt ledige uker.</p>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{inventory_url}}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Se tilgjengelige uker</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{inventory_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Se tilgjengelige uker</a><!--<![endif]-->
  </div>
</div>$$,
  body_en = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#FEF2F2;color:#991B1B;border:1px solid #FECACA;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Order cancelled</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Order {{order_number}} has unfortunately been cancelled because the remaining payment was not received before the deadline.</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">The deposit is non-refundable.</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Would you like to place a new order? We still have available weeks.</p>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{inventory_url}}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">See available weeks</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{inventory_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">See available weeks</a><!--<![endif]-->
  </div>
</div>$$
WHERE template_key = 'egg.order.forfeited';


-- ─── egg.waitlist.available ───
UPDATE email_templates SET
  body_no = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#ECFDF5;color:#2D6A4F;border:1px solid #BBF7D0;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Plass ledig!</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hei {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Gode nyheter! Det har blitt ledig plass for {{breed_name}} i uke {{week_number}}.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:0 8px 8px 0;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Rase</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{breed_name}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Uke</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{week_number}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Leveringsdato</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{delivery_date}}</td></tr>
      </table>
    </td></tr>
  </table>
  <p style="font-size:15px;line-height:1.6;color:#B45309;font-weight:600;text-align:center;margin:0 0 24px;">Plassen holdes i {{reservation_window_minutes}} minutter.</p>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{inventory_url}}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Reserver n&aring;</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{inventory_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Reserver n&aring;</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$,
  body_en = $$<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="display:inline-block;background:#ECFDF5;color:#2D6A4F;border:1px solid #BBF7D0;border-radius:999px;padding:6px 18px;font-size:14px;font-weight:600;">Spot available!</span>
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{customer_first_name}},</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Great news! A spot has opened up for {{breed_name}} in week {{week_number}}.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #8B6914;background:#FAF8F5;border-radius:0 8px 8px 0;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Breed</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{breed_name}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Week</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{week_number}}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Delivery date</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;font-weight:600;">{{delivery_date}}</td></tr>
      </table>
    </td></tr>
  </table>
  <p style="font-size:15px;line-height:1.6;color:#B45309;font-weight:600;text-align:center;margin:0 0 24px;">The spot is held for {{reservation_window_minutes}} minutes.</p>
  <div style="text-align:center;margin:0 0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{inventory_url}}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="#2C1810"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">Reserve now</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="{{inventory_url}}" style="display:inline-block;background:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Reserve now</a><!--<![endif]-->
  </div>
  {{tip_html}}
</div>$$
WHERE template_key = 'egg.waitlist.available';

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 3: Chicken, Support, Admin, Wishlist templates
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── chicken.order.deposit.confirmed.customer ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <span style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:#ECFDF5;color:#2D6A4F;font-size:13px;font-weight:600;">Bestilling bekreftet</span>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hei {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">Vi har mottatt forskuddet for kyllingbestilling {{order_number}}.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Rase</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{breed_name}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Antall</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{total_birds_label}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Hentedato</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{pickup_date}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Levering</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{delivery_label}}</td></tr>
        </table>
      </td></tr>
    </table>

    {{order_lines_html}}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border:1px solid #E8DFD5;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:12px 20px;font-size:14px;color:#6B5B4E;">Forskudd</td><td style="padding:12px 20px;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
      <tr><td style="padding:12px 20px;font-size:14px;color:#6B5B4E;">Rest ved henting</td><td style="padding:12px 20px;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
      <tr><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;background-color:#FFF9E6;">Totalt</td><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;text-align:right;background-color:#FFF9E6;">{{total_amount_nok}}</td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr>
        <td style="vertical-align:top;padding-right:16px;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">1</span></td>
        <td style="padding:4px 0;font-size:14px;color:#1C1210;line-height:1.5;">Kyllingene reserveres</td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding-right:16px;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">2</span></td>
        <td style="padding:4px 0;font-size:14px;color:#1C1210;line-height:1.5;">Du f&aring;r beskjed n&aring;r hentedato n&aelig;rmer seg</td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding-right:16px;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">3</span></td>
        <td style="padding:4px 0;font-size:14px;color:#1C1210;line-height:1.5;">F&oslash;lg bestillingen p&aring; Min side</td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{cta_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">{{cta_label}}</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{cta_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">{{cta_label}}</a>
      </td></tr>
    </table>

    {{tip_html}}

  </td></tr>
</table>$$,
  body_en = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <span style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:#ECFDF5;color:#2D6A4F;font-size:13px;font-weight:600;">Order confirmed</span>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hi {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">We have received the deposit for chicken order {{order_number}}.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Breed</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{breed_name}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Quantity</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{total_birds_label}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Pickup date</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{pickup_date}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Delivery</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{delivery_label}}</td></tr>
        </table>
      </td></tr>
    </table>

    {{order_lines_html}}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border:1px solid #E8DFD5;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:12px 20px;font-size:14px;color:#6B5B4E;">Deposit</td><td style="padding:12px 20px;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
      <tr><td style="padding:12px 20px;font-size:14px;color:#6B5B4E;">Remainder at pickup</td><td style="padding:12px 20px;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
      <tr><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;background-color:#FFF9E6;">Total</td><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;text-align:right;background-color:#FFF9E6;">{{total_amount_nok}}</td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr>
        <td style="vertical-align:top;padding-right:16px;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">1</span></td>
        <td style="padding:4px 0;font-size:14px;color:#1C1210;line-height:1.5;">Your chickens are reserved</td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding-right:16px;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">2</span></td>
        <td style="padding:4px 0;font-size:14px;color:#1C1210;line-height:1.5;">You will be notified as the pickup date approaches</td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding-right:16px;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">3</span></td>
        <td style="padding:4px 0;font-size:14px;color:#1C1210;line-height:1.5;">Track your order on My Page</td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{cta_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">{{cta_label}}</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{cta_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">{{cta_label}}</a>
      </td></tr>
    </table>

    {{tip_html}}

  </td></tr>
</table>$$
WHERE template_key = 'chicken.order.deposit.confirmed.customer';

-- ─── chicken.order.remainder.paid.customer ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <span style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:#ECFDF5;color:#2D6A4F;font-size:13px;font-weight:600;">Betaling fullf&oslash;rt</span>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hei {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">Bestilling {{order_number}} er n&aring; fullbetalt!</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Hentedato</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{pickup_date}}</td></tr>
        </table>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border:1px solid #E8DFD5;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;background-color:#FFF9E6;">Totalt</td><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;text-align:right;background-color:#FFF9E6;">{{total_amount_nok}}</td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr>
        <td style="vertical-align:top;padding-right:16px;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">1</span></td>
        <td style="padding:4px 0;font-size:14px;color:#1C1210;line-height:1.5;">Kyllingene forberedes til henting</td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding-right:16px;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">2</span></td>
        <td style="padding:4px 0;font-size:14px;color:#1C1210;line-height:1.5;">Du f&aring;r p&aring;minnelse f&oslash;r hentedato</td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding-right:16px;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#8B6914;font-weight:700;">3</span></td>
        <td style="padding:4px 0;font-size:14px;color:#1C1210;line-height:1.5;">Se detaljer p&aring; Min side</td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{cta_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">{{cta_label}}</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{cta_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">{{cta_label}}</a>
      </td></tr>
    </table>

    {{tip_html}}

  </td></tr>
</table>$$,
  body_en = NULL
WHERE template_key = 'chicken.order.remainder.paid.customer';

-- ─── chicken.ready_for_pickup ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <span style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:#ECFDF5;color:#2D6A4F;font-size:13px;font-weight:600;">Klar for henting!</span>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hei {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">Kyllingene fra bestilling {{order_number}} er klare for henting!</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{cta_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">Se bestillingen</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{cta_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">Se bestillingen</a>
      </td></tr>
    </table>

    {{tip_html}}

  </td></tr>
</table>$$,
  body_en = NULL
WHERE template_key = 'chicken.ready_for_pickup';

-- ─── chicken.pickup.reminder ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <span style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:#FFFBEB;color:#B45309;font-size:13px;font-weight:600;">Henting n&aelig;rmer seg</span>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hei {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">Hentedato for bestilling {{order_number}} n&aelig;rmer seg.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Hentedato</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{pickup_date}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Dager igjen</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{days_left}}</td></tr>
        </table>
      </td></tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{cta_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">{{cta_label}}</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{cta_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">{{cta_label}}</a>
      </td></tr>
    </table>

    {{tip_html}}

  </td></tr>
</table>$$,
  body_en = NULL
WHERE template_key = 'chicken.pickup.reminder';

-- ─── chicken.remainder.collected ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <span style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:#ECFDF5;color:#2D6A4F;font-size:13px;font-weight:600;">Kvittering</span>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hei {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">Vi bekrefter at restbetalingen p&aring; {{remainder_amount_nok}} for bestilling {{order_number}} er mottatt.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{cta_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">{{cta_label}}</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{cta_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">{{cta_label}}</a>
      </td></tr>
    </table>

    {{tip_html}}

  </td></tr>
</table>$$,
  body_en = NULL
WHERE template_key = 'chicken.remainder.collected';

-- ─── chicken.order.followup ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <p style="margin:0;font-size:16px;line-height:1.5;">Hei {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">Takk for at du handlet hos oss! Vi h&aring;per du er forn&oslash;yd med kyllingene fra bestilling {{order_number}}.</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">Har du sp&oslash;rsm&aring;l om stell eller f&ocirc;ring? Vi hjelper gjerne.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{message_url}}" style="height:44px;width:220px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">Send oss en melding</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{message_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">Send oss en melding</a>
      </td></tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 0;">
      <tr><td style="border:2px solid #E8DFD5;border-radius:10px;text-align:center;">
        <a href="{{pork_url}}" style="display:inline-block;color:#2C1810;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;">Se v&aring;re Mangalitsa-bokser</a>
      </td></tr>
    </table>

    {{tip_html}}

  </td></tr>
</table>$$,
  body_en = NULL
WHERE template_key = 'chicken.order.followup';

-- ─── support.message.customer.confirmation ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <p style="margin:0;font-size:16px;line-height:1.5;">Hei {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">Vi har mottatt meldingen din (sak {{thread_id}}).</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
      <tr><td style="border-left:4px solid #E8DFD5;padding:12px 20px;font-size:14px;color:#6B5B4E;line-height:1.6;font-style:italic;">{{message_text}}</td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Vi svarer s&aring; raskt vi kan.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{portal_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">{{portal_label}}</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{portal_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">{{portal_label}}</a>
      </td></tr>
    </table>

  </td></tr>
</table>$$,
  body_en = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <p style="margin:0;font-size:16px;line-height:1.5;">Hi {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">We have received your message (case {{thread_id}}).</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
      <tr><td style="border-left:4px solid #E8DFD5;padding:12px 20px;font-size:14px;color:#6B5B4E;line-height:1.6;font-style:italic;">{{message_text}}</td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">We will reply as soon as we can.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{portal_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">{{portal_label}}</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{portal_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">{{portal_label}}</a>
      </td></tr>
    </table>

  </td></tr>
</table>$$
WHERE template_key = 'support.message.customer.confirmation';

-- ─── support.reply.customer.notification ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <p style="margin:0;font-size:16px;line-height:1.5;">Hei {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">{{admin_name}} har svart p&aring; saken din ({{thread_id}}).</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
      <tr><td style="border-left:4px solid #2D6A4F;padding:12px 20px;font-size:14px;color:#6B5B4E;line-height:1.6;font-style:italic;">{{reply_text}}</td></tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{portal_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">Se svaret</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{portal_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">Se svaret</a>
      </td></tr>
    </table>

  </td></tr>
</table>$$,
  body_en = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <p style="margin:0;font-size:16px;line-height:1.5;">Hi {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">{{admin_name}} has replied to your case ({{thread_id}}).</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
      <tr><td style="border-left:4px solid #2D6A4F;padding:12px 20px;font-size:14px;color:#6B5B4E;line-height:1.6;font-style:italic;">{{reply_text}}</td></tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{portal_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">View reply</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{portal_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">View reply</a>
      </td></tr>
    </table>

  </td></tr>
</table>$$
WHERE template_key = 'support.reply.customer.notification';

-- ─── support.contact.admin.new ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <p style="margin:0;font-size:16px;line-height:1.5;">Ny kundehenvendelse om ordre {{order_number}}.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Kunde</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_name}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">E-post</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_email}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Telefon</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_phone}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Ordre</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{order_number}}</td></tr>
        </table>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
      <tr><td style="border-left:4px solid #E8DFD5;padding:12px 20px;font-size:14px;color:#6B5B4E;line-height:1.6;font-style:italic;">{{message_text}}</td></tr>
    </table>

  </td></tr>
</table>$$,
  body_en = NULL
WHERE template_key = 'support.contact.admin.new';

-- ─── support.contact.customer.confirmation ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <p style="margin:0;font-size:16px;line-height:1.5;">Hei {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">Vi har mottatt henvendelsen din om ordre {{order_number}}.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
      <tr><td style="border-left:4px solid #E8DFD5;padding:12px 20px;font-size:14px;color:#6B5B4E;line-height:1.6;font-style:italic;">{{message_text}}</td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Vi tar kontakt s&aring; snart vi kan.</p>

  </td></tr>
</table>$$,
  body_en = NULL
WHERE template_key = 'support.contact.customer.confirmation';

-- ─── support.message.admin.new ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <p style="margin:0;font-size:16px;line-height:1.5;">Ny melding fra {{customer_name}} (sak {{thread_id}}).</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Kunde</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_name}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">E-post</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_email}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Telefon</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_phone}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Ordre</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{order_number}}</td></tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:14px;color:#6B5B4E;">Type: {{message_type}}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;">
      <tr><td style="border-left:4px solid #E8DFD5;padding:12px 20px;font-size:14px;color:#6B5B4E;line-height:1.6;font-style:italic;">{{message_text}}</td></tr>
    </table>

  </td></tr>
</table>$$,
  body_en = NULL
WHERE template_key = 'support.message.admin.new';

-- ─── support.reply.admin.notification ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <p style="margin:0;font-size:16px;line-height:1.5;">Svar fra {{customer_name}} p&aring; sak {{thread_id}}.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Kunde</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_name}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">E-post</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_email}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Telefon</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_phone}}</td></tr>
        </table>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
      <tr><td style="border-left:4px solid #E8DFD5;padding:12px 20px;font-size:14px;color:#6B5B4E;line-height:1.6;font-style:italic;">{{reply_text}}</td></tr>
    </table>

  </td></tr>
</table>$$,
  body_en = NULL
WHERE template_key = 'support.reply.admin.notification';

-- ─── admin.order.deposit.confirmed.pig ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <p style="margin:0;font-size:16px;line-height:1.5;">Ny Mangalitsa-ordre mottatt.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Ordre</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{order_number}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Kunde</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_name}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">E-post</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_email}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Telefon</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_phone}}</td></tr>
        </table>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Boks</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{box_label}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Ribbe</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{ribbe_choice}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Levering</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{delivery_label}}</td></tr>
        </table>
      </td></tr>
    </table>

    {{extras_html}}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border:1px solid #E8DFD5;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:12px 20px;font-size:14px;color:#6B5B4E;">Forskudd</td><td style="padding:12px 20px;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
      <tr><td style="padding:12px 20px;font-size:14px;color:#6B5B4E;">Rest</td><td style="padding:12px 20px;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
      <tr><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;background-color:#FFF9E6;">Totalt</td><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;text-align:right;background-color:#FFF9E6;">{{total_amount_nok}}</td></tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{cta_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">Se i admin</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{cta_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">Se i admin</a>
      </td></tr>
    </table>

  </td></tr>
</table>$$,
  body_en = NULL
WHERE template_key = 'admin.order.deposit.confirmed.pig';

-- ─── admin.order.deposit.confirmed.egg ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <p style="margin:0;font-size:16px;line-height:1.5;">Ny rugeegg-ordre mottatt.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Ordre</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{order_number}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Kunde</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_name}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">E-post</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_email}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Telefon</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_phone}}</td></tr>
        </table>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border:1px solid #E8DFD5;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:12px 20px;font-size:14px;color:#6B5B4E;">Forskudd</td><td style="padding:12px 20px;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
      <tr><td style="padding:12px 20px;font-size:14px;color:#6B5B4E;">Rest</td><td style="padding:12px 20px;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
      <tr><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;background-color:#FFF9E6;">Totalt</td><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;text-align:right;background-color:#FFF9E6;">{{total_amount_nok}}</td></tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{cta_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">Se i admin</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{cta_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">Se i admin</a>
      </td></tr>
    </table>

  </td></tr>
</table>$$,
  body_en = NULL
WHERE template_key = 'admin.order.deposit.confirmed.egg';

-- ─── admin.order.deposit.confirmed.chicken ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <p style="margin:0;font-size:16px;line-height:1.5;">Ny kyllingordre mottatt.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Ordre</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{order_number}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Kunde</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_name}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">E-post</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_email}}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">Telefon</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">{{customer_phone}}</td></tr>
        </table>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border:1px solid #E8DFD5;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:12px 20px;font-size:14px;color:#6B5B4E;">Forskudd</td><td style="padding:12px 20px;font-size:14px;color:#1C1210;text-align:right;">{{deposit_amount_nok}}</td></tr>
      <tr><td style="padding:12px 20px;font-size:14px;color:#6B5B4E;">Rest</td><td style="padding:12px 20px;font-size:14px;color:#1C1210;text-align:right;">{{remainder_amount_nok}}</td></tr>
      <tr><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;background-color:#FFF9E6;">Totalt</td><td style="padding:12px 20px;font-size:14px;font-weight:700;color:#1C1210;text-align:right;background-color:#FFF9E6;">{{total_amount_nok}}</td></tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{cta_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">Se i admin</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{cta_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">Se i admin</a>
      </td></tr>
    </table>

  </td></tr>
</table>$$,
  body_en = NULL
WHERE template_key = 'admin.order.deposit.confirmed.chicken';

-- ─── wishlist.received ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <span style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:#ECFDF5;color:#2D6A4F;font-size:13px;font-weight:600;">&Oslash;nske mottatt</span>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hei {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">Vi har mottatt ditt &oslash;nske. Du vil f&aring; beskjed n&aring;r det blir ledig plass.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{cta_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">{{cta_label}}</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{cta_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">{{cta_label}}</a>
      </td></tr>
    </table>

  </td></tr>
</table>$$,
  body_en = NULL
WHERE template_key = 'wishlist.received';

-- ─── wishlist.allocated ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <span style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:#ECFDF5;color:#2D6A4F;font-size:13px;font-weight:600;">Plass sikret!</span>

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hei {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">Gode nyheter! Du har f&aring;tt tildelt plass.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{cta_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">{{cta_label}}</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{cta_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">{{cta_label}}</a>
      </td></tr>
    </table>

  </td></tr>
</table>$$,
  body_en = NULL
WHERE template_key = 'wishlist.allocated';

-- ─── wishlist.not_allocated ───
UPDATE email_templates SET
  body_no = $$<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">

    <p style="margin:0;font-size:16px;line-height:1.5;">Hei {{customer_first_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.5;">Dessverre ble det ikke ledig plass denne gangen. Vi har deg fortsatt p&aring; listen.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{cta_url}}" style="height:44px;width:200px;v-text-anchor:middle;" arcsize="23%" fillcolor="#2C1810" stroke="f"><v:textbox inset="0px,0px,0px,0px"><center style="font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">{{cta_label}}</center></v:textbox></v:roundrect><![endif]-->
        <a href="{{cta_url}}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;mso-hide:all;">{{cta_label}}</a>
      </td></tr>
    </table>

  </td></tr>
</table>$$,
  body_en = NULL
WHERE template_key = 'wishlist.not_allocated';

COMMIT;
