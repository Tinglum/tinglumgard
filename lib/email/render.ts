import { supabaseAdmin } from '@/lib/supabase/server';
import type { EmailLocale } from '@/lib/email/types';
import { sanitizeSupportEmailCopy } from '@/lib/messages/support-email-copy';

// Brand design tokens
const BRAND = {
  dark: '#2C1810',
  accent: '#8B6914',
  accentLight: '#A3841E',
  warmBg: '#F5EFE7',
  card: '#FFFDF9',
  cardBorder: '#E8DFD5',
  muted: '#FAF8F5',
  textPrimary: '#1C1210',
  textSecondary: '#6B5B4E',
  textTertiary: '#9B8E82',
  border: '#E8DFD5',
  success: '#2D6A4F',
  successBg: '#ECFDF5',
  successBorder: '#BBF7D0',
  warning: '#B45309',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  error: '#991B1B',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
  link: '#8B6914',
  gold50: '#FFF9E6',
} as const;

const FONT_HEADING = "Georgia, 'Times New Roman', serif";
const FONT_BODY = "Arial, Helvetica, sans-serif";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no';

// Template interpolation

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function normalizeEggReminderVariables(
  input: Record<string, unknown>,
  locale: EmailLocale,
): Record<string, unknown> {
  const vars = { ...input };
  const daysLeft = Number(vars.days_left ?? 0);
  const displayDaysLeft = Number.isFinite(daysLeft) ? Math.max(daysLeft - 6, 0) : 0;
  const defaultReminderDays = [11, 9, 7, 6];
  const totalReminders =
    Number(vars.total_reminders ?? 0) > 0 ? Number(vars.total_reminders) : defaultReminderDays.length;
  const reminderNumber =
    Number(vars.reminder_number ?? 0) > 0
      ? Number(vars.reminder_number)
      : Math.max(1, defaultReminderDays.indexOf(daysLeft) + 1 || 0);

  if (!vars.total_reminders && totalReminders > 0) {
    vars.total_reminders = totalReminders;
  }
  if (!vars.reminder_number && reminderNumber > 0) {
    vars.reminder_number = reminderNumber;
  }
  if (!vars.days_left_display_no) {
    vars.days_left_display_no =
      displayDaysLeft === 0 ? 'i dag' : `${displayDaysLeft} ${displayDaysLeft === 1 ? 'dag' : 'dager'} igjen`;
  }
  if (!vars.days_left_display_en) {
    vars.days_left_display_en =
      displayDaysLeft === 0 ? 'today' : `${displayDaysLeft} ${displayDaysLeft === 1 ? 'day' : 'days'} left`;
  }

  if (vars.reminder_badge_label && vars.reminder_intro_html && vars.reminder_support_html && vars.reminder_consequence_html) {
    return vars;
  }

  const isFirstFriendlyReminder = daysLeft === 11 || reminderNumber === 1;
  const isSecondFriendlyReminder = daysLeft === 9 || reminderNumber === 2;

  if (locale === 'en') {
    if (isFirstFriendlyReminder) {
      vars.reminder_badge_label = vars.reminder_badge_label || 'Friendly reminder';
      vars.reminder_intro_html =
        vars.reminder_intro_html ||
        '<p style="font-size:16px;line-height:1.6;margin:0 0 8px;">We are looking forward to sending your hatching eggs, and this is simply an early and friendly reminder about the remaining balance for order <strong>{{order_number}}</strong>.</p><p style="font-size:16px;line-height:1.6;margin:0 0 24px;">You still have plenty of time. We are sending this now so you can settle the payment whenever it suits you best.</p>';
      vars.reminder_support_html =
        vars.reminder_support_html ||
        '<div style="margin:0 0 20px;padding:16px 20px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;"><p style="font-size:14px;line-height:1.6;color:#6B5B4E;margin:0;">If you have already paid, you can ignore this email. If you have any questions about your order, sign in to My page and we will gladly help.</p></div>';
      vars.reminder_consequence_html =
        vars.reminder_consequence_html ||
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #E8DFD5;background:#FAF8F5;border-radius:0 8px 8px 0;"><tr><td style="padding:16px 20px;"><p style="font-size:14px;line-height:1.6;color:#6B5B4E;margin:0;">Your order remains reserved for you until the payment deadline. If the balance is still not registered by then, the order will eventually be cancelled and the eggs released to other customers.</p></td></tr></table>';
      return vars;
    }

    if (isSecondFriendlyReminder) {
      vars.reminder_badge_label = vars.reminder_badge_label || 'Friendly reminder';
      vars.reminder_intro_html =
        vars.reminder_intro_html ||
        '<p style="font-size:16px;line-height:1.6;margin:0 0 8px;">This is another friendly reminder about the remaining balance for order <strong>{{order_number}}</strong>.</p><p style="font-size:16px;line-height:1.6;margin:0 0 24px;">As soon as the payment is registered, everything is ready for the next step toward shipment in the correct week.</p>';
      vars.reminder_support_html =
        vars.reminder_support_html ||
        '<div style="margin:0 0 20px;padding:16px 20px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;"><p style="font-size:14px;line-height:1.6;color:#6B5B4E;margin:0;">If you have already paid, or if you have any questions about the order, sign in to My page. We are happy to help.</p></div>';
      vars.reminder_consequence_html =
        vars.reminder_consequence_html ||
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #FDE68A;background:#FFFBEB;border-radius:0 8px 8px 0;"><tr><td style="padding:16px 20px;"><p style="font-size:14px;line-height:1.6;color:#B45309;margin:0;">We are still holding your place, but the remaining balance needs to be registered by the deadline for delivery to stay on schedule.</p></td></tr></table>';
      return vars;
    }

    vars.reminder_badge_label = vars.reminder_badge_label || 'Reminder';
    vars.reminder_intro_html =
      vars.reminder_intro_html ||
      '<p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Your hatching egg order <strong>{{order_number}}</strong> has not yet been fully paid.</p><p style="font-size:16px;line-height:1.6;margin:0 0 24px;">The remaining balance must be paid before the deadline to secure delivery.</p>';
    vars.reminder_support_html = vars.reminder_support_html || '';
    vars.reminder_consequence_html =
      vars.reminder_consequence_html ||
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #B45309;background:#FFFBEB;border-radius:0 8px 8px 0;"><tr><td style="padding:16px 20px;"><p style="font-size:14px;line-height:1.6;color:#B45309;margin:0;">If the remaining balance is not paid before the deadline, your order will be cancelled and the eggs released to other customers.</p></td></tr></table>';
    return vars;
  }

  if (isFirstFriendlyReminder) {
    vars.reminder_badge_label = vars.reminder_badge_label || 'Vennlig p&aring;minnelse';
    vars.reminder_intro_html =
      vars.reminder_intro_html ||
      '<p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Vi gleder oss til &aring; sende rugeeggene dine, og vil bare gi deg en tidlig og vennlig p&aring;minnelse om restbetalingen for bestilling <strong>{{order_number}}</strong>.</p><p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Du har fortsatt god tid. Vi sender denne meldingen n&aring; slik at du kan ordne betalingen n&aring;r det passer deg best.</p>';
    vars.reminder_support_html =
      vars.reminder_support_html ||
      '<div style="margin:0 0 20px;padding:16px 20px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;"><p style="font-size:14px;line-height:1.6;color:#6B5B4E;margin:0;">Hvis du allerede har betalt, kan du se bort fra denne e-posten. Har du sp&oslash;rsm&aring;l om bestillingen, kan du logge inn p&aring; Min side for hjelp.</p></div>';
    vars.reminder_consequence_html =
      vars.reminder_consequence_html ||
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #E8DFD5;background:#FAF8F5;border-radius:0 8px 8px 0;"><tr><td style="padding:16px 20px;"><p style="font-size:14px;line-height:1.6;color:#6B5B4E;margin:0;">Bestillingen beholdes for deg frem til betalingsfristen. Dersom restbel&oslash;pet ikke er registrert innen fristen, blir ordren til slutt kansellert og eggene frigitt til andre kunder.</p></td></tr></table>';
    return vars;
  }

  if (isSecondFriendlyReminder) {
    vars.reminder_badge_label = vars.reminder_badge_label || 'Vennlig p&aring;minnelse';
    vars.reminder_intro_html =
      vars.reminder_intro_html ||
      '<p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Dette er en ny vennlig p&aring;minnelse om restbetalingen for bestilling <strong>{{order_number}}</strong>.</p><p style="font-size:16px;line-height:1.6;margin:0 0 24px;">N&aring;r betalingen er registrert, er alt klart videre mot utsending i riktig uke.</p>';
    vars.reminder_support_html =
      vars.reminder_support_html ||
      '<div style="margin:0 0 20px;padding:16px 20px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;"><p style="font-size:14px;line-height:1.6;color:#6B5B4E;margin:0;">Hvis du allerede har betalt, eller lurer p&aring; noe rundt ordren, kan du logge inn p&aring; Min side. Vi hjelper gjerne.</p></div>';
    vars.reminder_consequence_html =
      vars.reminder_consequence_html ||
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #FDE68A;background:#FFFBEB;border-radius:0 8px 8px 0;"><tr><td style="padding:16px 20px;"><p style="font-size:14px;line-height:1.6;color:#B45309;margin:0;">Vi holder fortsatt av plassen din, men restbel&oslash;pet m&aring; v&aelig;re registrert innen fristen for at leveringen skal g&aring; som planlagt.</p></td></tr></table>';
    return vars;
  }

  vars.reminder_badge_label = vars.reminder_badge_label || 'P&aring;minnelse';
  vars.reminder_intro_html =
    vars.reminder_intro_html ||
    '<p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Din rugeegg-bestilling <strong>{{order_number}}</strong> er ikke ferdig betalt.</p><p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Restbel&oslash;pet m&aring; betales innen fristen for &aring; sikre leveransen.</p>';
  vars.reminder_support_html = vars.reminder_support_html || '';
  vars.reminder_consequence_html =
    vars.reminder_consequence_html ||
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #B45309;background:#FFFBEB;border-radius:0 8px 8px 0;"><tr><td style="padding:16px 20px;"><p style="font-size:14px;line-height:1.6;color:#B45309;margin:0;">Hvis restbel&oslash;pet ikke betales innen fristen, vil bestillingen bli kansellert og eggene frigitt til andre kunder.</p></td></tr></table>';

  return vars;
}

function normalizeEggPickupReminderVariables(
  input: Record<string, unknown>,
  locale: EmailLocale,
): Record<string, unknown> {
  const vars = { ...input };

  // Pickup orders: eggs are already collected — no delivery framing, no "release to other customers"
  if (locale === 'en') {
    vars.reminder_badge_label = vars.reminder_badge_label || 'Reminder';
    vars.reminder_intro_html =
      vars.reminder_intro_html ||
      '<p style="font-size:16px;line-height:1.6;margin:0 0 8px;">The hatching eggs for order <strong>{{order_number}}</strong> have been collected, but the remaining balance has not yet been registered.</p><p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Please pay the outstanding amount as soon as possible to close the order.</p>';
    vars.reminder_support_html =
      vars.reminder_support_html ||
      '<div style="margin:0 0 20px;padding:16px 20px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;"><p style="font-size:14px;line-height:1.6;color:#6B5B4E;margin:0;">If you have already paid, you can ignore this email. If you have any questions, sign in to My Page or contact us directly.</p></div>';
    vars.reminder_consequence_html =
      vars.reminder_consequence_html ||
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #FDE68A;background:#FFFBEB;border-radius:0 8px 8px 0;"><tr><td style="padding:16px 20px;"><p style="font-size:14px;line-height:1.6;color:#B45309;margin:0;">The payment deadline has passed. Please settle the remaining balance as soon as possible.</p></td></tr></table>';
  } else {
    vars.reminder_badge_label = vars.reminder_badge_label || 'P&aring;minnelse';
    vars.reminder_intro_html =
      vars.reminder_intro_html ||
      '<p style="font-size:16px;line-height:1.6;margin:0 0 8px;">Rugeeggene fra bestilling <strong>{{order_number}}</strong> er hentet, men restbetalingen gjenst&aring;r.</p><p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Vennligst betal det utest&aring;ende bel&oslash;pet snarest for &aring; avslutte ordren.</p>';
    vars.reminder_support_html =
      vars.reminder_support_html ||
      '<div style="margin:0 0 20px;padding:16px 20px;background:#FAF8F5;border:1px solid #E8DFD5;border-radius:10px;"><p style="font-size:14px;line-height:1.6;color:#6B5B4E;margin:0;">Hvis du allerede har betalt, kan du se bort fra denne e-posten. Har du sp&oslash;rsm&aring;l, kan du logge inn p&aring; Min side eller ta kontakt med oss direkte.</p></div>';
    vars.reminder_consequence_html =
      vars.reminder_consequence_html ||
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-left:4px solid #FDE68A;background:#FFFBEB;border-radius:0 8px 8px 0;"><tr><td style="padding:16px 20px;"><p style="font-size:14px;line-height:1.6;color:#B45309;margin:0;">Betalingsfristen er passert. Vennligst betal restbel&oslash;pet s&aring; snart som mulig.</p></td></tr></table>';
  }

  return vars;
}

export function interpolateTemplate(input: string, variables: Record<string, unknown>): string {
  let output = input;

  for (let pass = 0; pass < 3; pass += 1) {
    let nextOutput = output;

    for (const [key, value] of Object.entries(variables)) {
      const normalizedValue = toStringValue(value);
      const upperKey = key.toUpperCase();
      nextOutput = nextOutput
        .replaceAll(`{{${key}}}`, normalizedValue)
        .replaceAll(`{{ ${key} }}`, normalizedValue)
        .replaceAll(`{${upperKey}}`, normalizedValue);
    }

    if (nextOutput === output) {
      break;
    }

    output = nextOutput;
  }

  return output;
}

function decodeBasicHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aring;/g, '\u00E5')
    .replace(/&oslash;/g, '\u00F8')
    .replace(/&aelig;/g, '\u00E6')
    .replace(/&Aring;/g, '\u00C5')
    .replace(/&Oslash;/g, '\u00D8')
    .replace(/&AElig;/g, '\u00C6')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '--');
}

// Email component helpers

export function emailButton(text: string, href: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const bg = variant === 'primary' ? BRAND.dark : BRAND.card;
  const color = variant === 'primary' ? '#ffffff' : BRAND.dark;
  const border = variant === 'primary' ? BRAND.dark : BRAND.border;

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
  <tr>
    <td align="center" style="border-radius:10px;background:${bg};">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="${border}" fillcolor="${bg}"><v:textbox><center style="color:${color};font-family:${FONT_BODY};font-size:15px;font-weight:700;">${text}</center></v:textbox></v:roundrect><![endif]-->
      <!--[if !mso]><!--><a href="${href}" target="_blank" style="display:inline-block;background:${bg};color:${color};font-family:${FONT_BODY};font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;border:2px solid ${border};mso-hide:all;">${text}</a><!--<![endif]-->
    </td>
  </tr>
</table>`;
}

export function emailInfoCard(rows: Array<{ label: string; value: string }>): string {
  const rowHtml = rows
    .map(
      (r) =>
        `<tr>
      <td style="padding:7px 14px 7px 0;font-family:${FONT_BODY};font-size:14px;color:${BRAND.textSecondary};vertical-align:top;white-space:nowrap;">${r.label}</td>
      <td style="padding:7px 0;font-family:${FONT_BODY};font-size:14px;color:${BRAND.textPrimary};font-weight:600;vertical-align:top;">${r.value}</td>
    </tr>`
    )
    .join('');

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:${BRAND.muted};border-left:4px solid ${BRAND.accent};border-radius:0 8px 8px 0;margin:16px 0;">
  <tr>
    <td style="padding:16px 18px;">
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
        ${rowHtml}
      </table>
    </td>
  </tr>
</table>`;
}

export function emailPaymentSummary(
  items: Array<{ label: string; amount: string; bold?: boolean }>,
): string {
  const rowHtml = items
    .map((item) => {
      const weight = item.bold ? '700' : '400';
      const topBorder = item.bold ? `border-top:2px solid ${BRAND.border};` : '';
      const bg = item.bold ? `background:${BRAND.gold50};` : '';
      return `<tr>
      <td style="padding:10px 16px;font-family:${FONT_BODY};font-size:14px;color:${BRAND.textPrimary};font-weight:${weight};${topBorder}${bg}">${item.label}</td>
      <td style="padding:10px 16px;font-family:${FONT_BODY};font-size:14px;color:${BRAND.textPrimary};font-weight:${weight};text-align:right;${topBorder}${bg}">${item.amount}</td>
    </tr>`;
    })
    .join('');

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:${BRAND.muted};border:1px solid ${BRAND.border};border-radius:8px;margin:16px 0;overflow:hidden;">
  <tr>
    <td style="padding:0;">
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
        ${rowHtml}
      </table>
    </td>
  </tr>
</table>`;
}

export function emailStatusBadge(label: string, variant: 'success' | 'warning' | 'error' = 'success'): string {
  const colors = {
    success: { bg: BRAND.successBg, text: BRAND.success, border: BRAND.successBorder },
    warning: { bg: BRAND.warningBg, text: BRAND.warning, border: BRAND.warningBorder },
    error: { bg: BRAND.errorBg, text: BRAND.error, border: BRAND.errorBorder },
  };
  const c = colors[variant];
  return `<p style="margin:0 0 18px;"><span style="display:inline-block;font-family:${FONT_BODY};font-size:12px;font-weight:700;color:${c.text};background:${c.bg};border:1px solid ${c.border};border-radius:20px;padding:5px 14px;letter-spacing:0.4px;text-transform:uppercase;">${label}</span></p>`;
}

export function emailSection(title: string, bodyHtml: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:24px 0;">
  <tr>
    <td style="padding:0 0 10px 0;font-family:${FONT_HEADING};font-size:18px;font-weight:700;color:${BRAND.textPrimary};border-bottom:2px solid ${BRAND.accent};">${title}</td>
  </tr>
  <tr>
    <td style="padding:14px 0 0 0;font-family:${FONT_BODY};font-size:15px;line-height:1.65;color:${BRAND.textPrimary};">
      ${bodyHtml}
    </td>
  </tr>
</table>`;
}

export function emailDivider(): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:28px 0;">
  <tr>
    <td style="border-top:1px solid ${BRAND.border};font-size:0;line-height:0;">&nbsp;</td>
  </tr>
</table>`;
}

export function emailBlockquote(text: string, variant: 'default' | 'reply' | 'admin' = 'default'): string {
  const colors = {
    default: { bg: BRAND.muted, border: BRAND.border },
    reply: { bg: '#ECFDF5', border: BRAND.success },
    admin: { bg: '#FFF7ED', border: '#FB923C' },
  };
  const c = colors[variant];
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;">
  <tr>
    <td style="border-left:4px solid ${c.border};background:${c.bg};padding:16px 18px;border-radius:0 8px 8px 0;font-family:${FONT_BODY};font-size:14px;line-height:1.65;color:${BRAND.textPrimary};white-space:pre-wrap;">${text}</td>
  </tr>
</table>`;
}

export function emailNextSteps(steps: string[]): string {
  const stepsHtml = steps
    .map(
      (step, i) =>
        `<tr>
      <td style="padding:10px 14px 10px 0;font-family:${FONT_HEADING};font-size:24px;font-weight:700;color:${BRAND.accent};vertical-align:top;width:36px;text-align:center;line-height:1;">${i + 1}</td>
      <td style="padding:10px 0;font-family:${FONT_BODY};font-size:14px;line-height:1.55;color:${BRAND.textPrimary};vertical-align:top;${i < steps.length - 1 ? `border-bottom:1px solid ${BRAND.border};` : ''}">${step}</td>
    </tr>`
    )
    .join('');

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;">
  ${stepsHtml}
</table>`;
}

export function emailHighlightAmount(amount: string, label?: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;">
  <tr>
    <td align="center" style="padding:24px;background:${BRAND.muted};border:1px solid ${BRAND.border};border-radius:12px;">
      <span style="font-family:${FONT_HEADING};font-size:36px;font-weight:700;color:${BRAND.dark};line-height:1.2;">${amount}</span>
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:60px;margin:8px auto 0;"><tr><td style="border-top:3px solid ${BRAND.accent};font-size:0;line-height:0;">&nbsp;</td></tr></table>
      ${label ? `<br><span style="font-family:${FONT_BODY};font-size:13px;color:${BRAND.textSecondary};display:inline-block;margin-top:6px;">${label}</span>` : ''}
    </td>
  </tr>
</table>`;
}

// Timeline component

type TimelineStep = {
  label: string;
  status: 'completed' | 'active' | 'upcoming';
  detail?: string;
};

export function emailTimeline(steps: TimelineStep[]): string {
  const width = Math.floor(100 / steps.length);
  const completedColor = BRAND.success;
  const activeColor = BRAND.accent;
  const upcomingColor = '#D1CBC4';

  const nodeRow = steps
    .map((step, i) => {
      let nodeColor: string;
      let nodeContent: string;
      let nodeTextColor: string;
      if (step.status === 'completed') {
        nodeColor = completedColor;
        nodeContent = '&#10003;';
        nodeTextColor = '#ffffff';
      } else if (step.status === 'active') {
        nodeColor = activeColor;
        nodeContent = String(i + 1);
        nodeTextColor = '#ffffff';
      } else {
        nodeColor = 'transparent';
        nodeContent = String(i + 1);
        nodeTextColor = upcomingColor;
      }
      const borderStyle = step.status === 'upcoming' ? `border:2px solid ${upcomingColor};` : '';
      return `<td width="${width}%" align="center" valign="top" style="padding:0 4px;">
        <table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="center" style="width:32px;height:32px;border-radius:50%;background:${nodeColor};${borderStyle}font-family:${FONT_BODY};font-size:14px;font-weight:700;color:${nodeTextColor};text-align:center;line-height:${step.status === 'upcoming' ? '28' : '32'}px;">${nodeContent}</td></tr></table>
      </td>`;
    })
    .join('');

  const lineRow = steps
    .map((step, i) => {
      const lineColor = step.status === 'completed' ? completedColor : (step.status === 'active' ? activeColor : upcomingColor);
      const nextColor = i < steps.length - 1 ? (steps[i + 1].status === 'upcoming' ? upcomingColor : (steps[i + 1].status === 'completed' ? completedColor : activeColor)) : lineColor;
      const showLine = i < steps.length - 1;
      return `<td width="${width}%" align="center" valign="middle" style="padding:0;">
        ${showLine ? `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;"><tr><td style="width:50%;border-bottom:3px solid ${lineColor};font-size:0;line-height:0;">&nbsp;</td><td style="width:50%;border-bottom:3px solid ${nextColor};font-size:0;line-height:0;">&nbsp;</td></tr></table>` : '&nbsp;'}
      </td>`;
    })
    .join('');

  const labelRow = steps
    .map((step) => {
      const labelColor = step.status === 'upcoming' ? BRAND.textTertiary : BRAND.textPrimary;
      const labelWeight = step.status === 'active' ? '700' : '600';
      return `<td width="${width}%" align="center" valign="top" style="padding:6px 2px 0;">
        <span style="font-family:${FONT_BODY};font-size:11px;font-weight:${labelWeight};color:${labelColor};text-transform:uppercase;letter-spacing:0.3px;">${step.label}</span>
        ${step.detail ? `<br><span style="font-family:${FONT_BODY};font-size:11px;color:${BRAND.textSecondary};line-height:1.3;">${step.detail}</span>` : ''}
      </td>`;
    })
    .join('');

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0 24px;">
  <tr>${nodeRow}</tr>
  <tr style="height:4px;">${lineRow}</tr>
  <tr>${labelRow}</tr>
</table>`;
}

// Tip of the week component

type TipContent = {
  title: string;
  text: string;
  link?: string;
  linkText?: string;
};

const PIG_TIPS: TipContent[] = [
  { title: 'Pr\u00f8v pulled pork!', text: 'Mangalitsa-kj\u00f8ttet har en unik marmorering som gir saftig, smaksrik pulled pork. Langsom steking p\u00e5 lav varme f\u00e5r fettet til \u00e5 smelte inn i kj\u00f8ttet.', link: `${APP_URL}/oppskrifter`, linkText: 'Se oppskrifter \u2192' },
  { title: 'Ribbe med sprø svor', text: 'Mangalitsa-ribbe trenger lengre steketid enn vanlig ribbe. Start med 150\u00b0C i 3 timer, deretter 220\u00b0C for sprø svor. Resultatet er uforglemmelig.', link: `${APP_URL}/oppskrifter`, linkText: 'Se oppskrifter \u2192' },
  { title: 'Det perfekte sm\u00f8rbr\u00f8d', text: 'Mangalitsa-skinke med tynt skj\u00e6rt br\u00f8d, sm\u00f8r og sennep \u2013 en enkel, men fantastisk lunsj. Det marmorerte kj\u00f8ttet gj\u00f8r hele forskjellen.', link: `${APP_URL}/oppskrifter`, linkText: 'Se oppskrifter \u2192' },
  { title: 'Slow-cooked ragout', text: 'Kutt Mangalitsa-bog i terninger og la det putre i 4\u20135 timer med r\u00f8dvin, tomater og rosmarin. Det intense fettet gir en silkemyk saus.', link: `${APP_URL}/oppskrifter`, linkText: 'Se oppskrifter \u2192' },
  { title: 'Grilltips for sommeren', text: 'Mangalitsa-koteletter p\u00e5 grillen? Middels varme, 5 minutter per side. La kj\u00f8ttet hvile 5 minutter f\u00f8r servering \u2013 s\u00e5 holder det p\u00e5 saftene.', link: `${APP_URL}/oppskrifter`, linkText: 'Se oppskrifter \u2192' },
  { title: 'Lardo \u2013 verdens beste fett', text: 'Mangalitsa-sp\u00e6kk kan saltes og modnes til lardo \u2013 en italiensk delikatesse. Tynt skj\u00e6rt p\u00e5 varmt br\u00f8d smelter det p\u00e5 tungen.', link: `${APP_URL}/oppskrifter`, linkText: 'Se oppskrifter \u2192' },
];

const EGG_TIPS: TipContent[] = [
  { title: 'Temperaturkontroll', text: 'Hold rugemaskinen stabil p\u00e5 37.5\u00b0C. Selv sm\u00e5 svingninger p\u00e5 0.5\u00b0C kan p\u00e5virke klekkeprosenten. Bruk et eksternt termometer for \u00e5 dobbeltsjekke.' },
  { title: 'Fuktighet er n\u00f8kkelen', text: 'Sikt p\u00e5 45\u201355% fuktighet de f\u00f8rste 18 dagene, \u00f8k til 65\u201375% de siste 3 dagene. For lav fuktighet gir store luftlommer og svake kyllinger.' },
  { title: 'Lysing av egg', text: 'Lys eggene p\u00e5 dag 7 og 14. Se etter \u00e5renettverk og bevegelse. Fjern ufruktbare egg for \u00e5 gi de andre bedre plass og luftsirkulasjon.' },
  { title: 'Vending av egg', text: 'Snu eggene minst 3 ganger daglig de f\u00f8rste 18 dagene. Automatisk vendingssystem er ideelt \u2013 det sikrer jevn fordeling av varme og n\u00e6ring.' },
  { title: 'De siste 3 dagene', text: 'Stopp vending p\u00e5 dag 18. Kyllingene trenger ro for \u00e5 posisjonere seg for klekking. \u00d8k fuktigheten og \u00e5pne ikke maskinen \u2013 ogs\u00e5 kjent som \u00ablockdown\u00bb.' },
  { title: 'F\u00f8rste d\u00f8gn etter klekking', text: 'Nyf\u00f8dte kyllinger kan klare seg 24\u201348 timer uten mat og vann takket v\u00e6re plommesekken. La dem t\u00f8rke i maskinen f\u00f8r du flytter dem til oppvarmingsb\u00e5sen.' },
];

const CHICKEN_TIPS: TipContent[] = [
  { title: 'Visste du? Ayam Cemani', text: 'Ayam Cemani er kjent for sin fibromelanose \u2013 en genetisk egenskap som gj\u00f8r alt fra fj\u00e6r, hud, skjelett og indre organer svarte. Selv blodet er m\u00f8rkere enn normalt.' },
  { title: 'Visste du? Bl\u00e5 egg', text: 'Bl\u00e5 eggeskall skyldes pigmentet oocyanin som integreres gjennom hele skallet. Til forskjell fra brune egg (der pigmentet bare er p\u00e5 overflaten) er bl\u00e5 egg bl\u00e5 helt gjennom.' },
  { title: 'Visste du? Auto-sexing', text: 'Cream Legbar er en auto-sexing rase \u2013 du kan se forskjell p\u00e5 hanekyllinger og h\u00f8nekyllinger allerede som daggamle. Hannene har en lys prikk p\u00e5 hodet.' },
  { title: 'Visste du? H\u00f8ners syn', text: 'H\u00f8ns har tetrakromatisk syn \u2013 de ser fire fargekanaler mot v\u00e5re tre. De kan se ultrafiolett lys, noe som hjelper dem \u00e5 finne modent frukt og insekter.' },
  { title: 'Visste du? Kyllingers hukommelse', text: 'Kyllinger kan huske over 100 individuelle ansikter \u2013 b\u00e5de kyllinger og mennesker. De har ogs\u00e5 en sosial hierarkiforst\u00e5else kalt \u00abhakkeordenen\u00bb.' },
  { title: 'Visste du? Fj\u00e6rfarger', text: 'Fj\u00e6rfarger hos h\u00f8ns styres av over 10 ulike gener. Silverudd\'s Bl\u00e5 har en unik kombinasjon av blue-gen og silver-gen som gir den karakteristiske bl\u00e5gr\u00e5 fj\u00e6rdrakten.' },
];

export function emailTipBox(product: 'pig' | 'eggs' | 'chickens' | string, tipIndex: number): string {
  const tips = product === 'pig' ? PIG_TIPS : product === 'eggs' ? EGG_TIPS : CHICKEN_TIPS;
  if (tips.length === 0) return '';
  const tip = tips[Math.abs(tipIndex) % tips.length];
  const headerLabel = product === 'pig' ? '\u{1F4A1} Ukens oppskriftstips' : product === 'eggs' ? '\u{1F4A1} Rugetips' : '\u{1F4A1} Visste du?';

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:24px 0;">
  <tr>
    <td style="background:${BRAND.muted};border-left:4px solid ${BRAND.accent};border-radius:0 10px 10px 0;padding:18px 20px;">
      <p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:12px;font-weight:700;color:${BRAND.accent};text-transform:uppercase;letter-spacing:0.5px;">${headerLabel}</p>
      <p style="margin:0 0 4px;font-family:${FONT_HEADING};font-size:16px;font-weight:700;color:${BRAND.textPrimary};">${tip.title}</p>
      <p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.55;color:${BRAND.textSecondary};">${tip.text}</p>
      ${tip.link ? `<p style="margin:8px 0 0;"><a href="${tip.link}" style="font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${BRAND.link};text-decoration:none;">${tip.linkText || 'Les mer \u2192'}</a></p>` : ''}
    </td>
  </tr>
</table>`;
}

// Reminder progress component

export function emailReminderProgress(current: number, total: number, locale: EmailLocale = 'no'): string {
  const label = locale === 'en' ? `Reminder ${current} of ${total}` : `P\u00e5minnelse ${current} av ${total}`;
  const pct = Math.min(100, Math.round((current / total) * 100));

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;">
  <tr>
    <td style="padding:14px 18px;background:${BRAND.muted};border:1px solid ${BRAND.border};border-radius:10px;">
      <p style="margin:0 0 8px;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${BRAND.textSecondary};">${label}</p>
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;height:6px;background:${BRAND.border};border-radius:3px;overflow:hidden;">
        <tr>
          <td style="width:${pct}%;background:${BRAND.warning};border-radius:3px;font-size:0;line-height:0;">&nbsp;</td>
          ${pct < 100 ? `<td style="font-size:0;line-height:0;">&nbsp;</td>` : ''}
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

// Order recap component

export function emailOrderRecap(rows: Array<{ label: string; value: string }>): string {
  const rowHtml = rows
    .map(
      (r) =>
        `<tr>
      <td style="padding:5px 12px 5px 0;font-family:${FONT_BODY};font-size:13px;color:${BRAND.textSecondary};vertical-align:top;">${r.label}</td>
      <td style="padding:5px 0;font-family:${FONT_BODY};font-size:13px;color:${BRAND.textPrimary};font-weight:600;vertical-align:top;">${r.value}</td>
    </tr>`
    )
    .join('');

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:${BRAND.muted};border:1px solid ${BRAND.border};border-radius:8px;margin:12px 0;">
  <tr>
    <td style="padding:12px 16px;">
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
        ${rowHtml}
      </table>
    </td>
  </tr>
</table>`;
}

// Story footer component

const PIG_STORIES = [
  'Mangalitsa er verdens mest eksklusive svinekj\u00f8tt. Den ullh\u00e5rede rasen fra Ungarn gir et marmorert, n\u00f8tteaktig kj\u00f8tt som minner mer om Wagyu-biff enn vanlig svin.',
  'V\u00e5re Mangalitsa-griser lever fritt p\u00e5 Tinglum G\u00e5rd i Namdalseid. De spiser naturlig f\u00f4r, roter i jorda og lever et godt liv \u2013 det smaker du p\u00e5 kj\u00f8ttet.',
  'Visste du at Mangalitsa-fett smelter ved lavere temperatur enn vanlig svinefett? Det gir en silkemyk tekstur n\u00e5r du steker, og en rikere smak i hver bit.',
  'Fra g\u00e5rd til bord \u2013 v\u00e5re Mangalitsa-bokser pakkes og vakuumforsegles p\u00e5 g\u00e5rden. Du f\u00e5r premium kj\u00f8tt rett fra produsenten, uten mellomledd.',
];

const EGG_STORIES = [
  'Rugegg fra Tinglum G\u00e5rd kommer fra frittg\u00e5ende h\u00f8ner med h\u00f8y fruktbarhet. Vi pakker eggene trygt for posting og leverer ferskt fra g\u00e5rden til deg.',
  'Alle v\u00e5re avlsdyr er h\u00e5ndplukket for helse, temperament og rasestandard. Det betyr at du f\u00e5r rugeegg med best mulig forutsetninger for vellykket klekking.',
  'Vi f\u00f8rer et bredt utvalg av spennende raser \u2013 fra den eksotiske Ayam Cemani til den bl\u00e5eggende Silverudd\'s Bl\u00e5. Hver rase har sine unike egenskaper.',
];

const CHICKEN_STORIES = [
  'Kyllingene fra Tinglum G\u00e5rd er oppvokst i trygge omgivelser med naturlig lys og frisk luft. De er sosialisert med mennesker fra f\u00f8rste dag.',
  'V\u00e5re h\u00f8ner gir b\u00e5de vakre egg og godt selskap. Enten du \u00f8nsker eggproduksjon eller bare herlige hageh\u00f8ner, har vi rasen for deg.',
  'Alle kyllinger fra oss leveres med helsegaranti og alderstilpasset f\u00f4rplan. Vi hjelper deg ogs\u00e5 gjerne med sp\u00f8rsm\u00e5l etter kj\u00f8pet.',
];

export function emailStoryFooter(product: 'pig' | 'eggs' | 'chickens' | string, variant: number): string {
  const stories = product === 'pig' ? PIG_STORIES : product === 'eggs' ? EGG_STORIES : CHICKEN_STORIES;
  if (stories.length === 0) return '';
  const story = stories[Math.abs(variant) % stories.length];

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:28px 0 0;">
  <tr>
    <td style="border-top:1px solid ${BRAND.border};padding:20px 0 0;">
      <p style="margin:0 0 4px;font-family:${FONT_HEADING};font-size:13px;font-weight:700;color:${BRAND.accent};letter-spacing:0.3px;">FRA G\u00c5RDEN</p>
      <p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${BRAND.textSecondary};font-style:italic;">${story}</p>
    </td>
  </tr>
</table>`;
}

// Main document wrapper

type FarmProductScope = 'pig' | 'eggs' | 'chickens';

type FarmCrossSellCopy = {
  title: string;
  description: string;
  cta: string;
  href: string;
};

const FARM_CROSS_SELL: Record<EmailLocale, Record<FarmProductScope, FarmCrossSellCopy>> = {
  no: {
    pig: {
      title: 'Ullgris til jul',
      description:
        'Pr\u00f8v delikatessen ullgris fra Tinglum G\u00e5rd. Sikre deg ribbe til jul og sesongens kasser mens vi fortsatt har ledige bokser.',
      cta: 'Se ullgris-kassene',
      href: `${APP_URL}/produkt`,
    },
    eggs: {
      title: 'Rugeegg',
      description:
        'Se tilgjengelige uker, finn rasene du vil klekke, og legg inn bestilling eller \u00f8nskeliste direkte p\u00e5 Min side.',
      cta: 'Se rugeegg',
      href: `${APP_URL}/rugeegg`,
    },
    chickens: {
      title: 'Kyllinger',
      description:
        'Reserver kyllinger fra v\u00e5rens kull og finn raser med ulike aldre, farger og egenskaper som passer hos deg.',
      cta: 'Se kyllinger',
      href: `${APP_URL}/kyllinger`,
    },
  },
  en: {
    pig: {
      title: 'Mangalitsa for the holidays',
      description:
        'Discover our seasonal woolly pig boxes and reserve premium pork for the holiday table while we still have boxes available.',
      cta: 'View pig boxes',
      href: `${APP_URL}/produkt`,
    },
    eggs: {
      title: 'Hatching eggs',
      description:
        'Browse available weeks, choose the breeds you want to hatch, and place an order or wishlist request from your account.',
      cta: 'View hatching eggs',
      href: `${APP_URL}/rugeegg`,
    },
    chickens: {
      title: 'Chickens',
      description:
        'Reserve chickens from our upcoming groups and explore breeds with different ages, colors, and personalities.',
      cta: 'View chickens',
      href: `${APP_URL}/kyllinger`,
    },
  },
};

function emailFarmProductCard(copy: FarmCrossSellCopy): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 12px;background:${BRAND.card};border:1px solid ${BRAND.cardBorder};border-radius:12px;">
  <tr>
    <td style="padding:16px 18px;">
      <p style="margin:0 0 6px;font-family:${FONT_HEADING};font-size:18px;font-weight:700;color:${BRAND.textPrimary};">${copy.title}</p>
      <p style="margin:0 0 12px;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${BRAND.textSecondary};">${copy.description}</p>
      <p style="margin:0;"><a href="${copy.href}" style="font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${BRAND.link};text-decoration:none;">${copy.cta} &rarr;</a></p>
    </td>
  </tr>
</table>`;
}

function emailFarmCrossSellBar(productScope: string | undefined, locale: EmailLocale, classification?: string): string {
  if (!productScope || !['pig', 'eggs', 'chickens'].includes(productScope)) {
    return '';
  }

  if (classification === 'system' || classification === 'support') {
    return '';
  }

  const currentScope = productScope as FarmProductScope;
  const sectionTitle = locale === 'en' ? 'Also from the farm' : 'Ogs\u00e5 fra g\u00e5rden';
  const sectionDescription =
    locale === 'en'
      ? 'This is not part of your current order, just a quick look at the two other products we currently offer from Tinglum G\u00e5rd.'
      : 'Dette er ikke en del av bestillingen din, bare en liten oversikt over de to andre produktene vi tilbyr fra Tinglum G\u00e5rd akkurat n\u00e5.';

  const otherScopes = (['pig', 'eggs', 'chickens'] as FarmProductScope[]).filter(
    (scope) => scope !== currentScope,
  );

  const cards = otherScopes
    .map((scope) => emailFarmProductCard(FARM_CROSS_SELL[locale][scope]))
    .join('');

  return `<tr>
    <td style="padding:22px 36px;border-top:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border};background:${BRAND.gold50};">
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
        <tr>
          <td>
            <p style="margin:0 0 4px;font-family:${FONT_BODY};font-size:12px;font-weight:700;color:${BRAND.accent};letter-spacing:0.6px;text-transform:uppercase;">${sectionTitle}</p>
            <p style="margin:0 0 16px;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${BRAND.textSecondary};">${sectionDescription}</p>
            ${cards}
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function ensureHtmlDocument(
  html: string,
  locale: EmailLocale = 'no',
  preheaderText?: string,
  options?: { productScope?: string; classification?: string },
): string {
  if (html.trim().toLowerCase().includes('<html')) {
    return html;
  }

  const brand = 'Tinglum G\u00e5rd';
  const tagline = locale === 'en' ? 'The farm in Namdalseid' : 'G\u00e5rden i Namdalseid';
  const greeting = locale === 'en' ? 'Warm regards,' : 'Varme hilsener,';
  const supportLabel = locale === 'en' ? 'Questions?' : 'Sp\u00f8rsm\u00e5l?';
  const supportText =
    locale === 'en'
      ? 'Sign in to My page if you need help or want to respond to a message.'
      : 'Logg inn p\u00e5 Min side hvis du trenger hjelp eller vil svare p\u00e5 en melding.';
  const preheader = preheaderText ||
    (locale === 'en'
      ? 'Update from Tinglum G\u00e5rd about your order.'
      : 'Oppdatering fra Tinglum G\u00e5rd om bestillingen din.');
  const crossSellBar = emailFarmCrossSellBar(options?.productScope, locale, options?.classification);

  return `<!DOCTYPE html>
<html lang="${locale}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
    <title>${brand}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.warmBg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}${'&#8199;&#65279;'.repeat(30)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.warmBg};padding:40px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:${BRAND.card};border:1px solid ${BRAND.cardBorder};border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(44,24,16,0.06);">
            <!-- Header -->
            <tr>
              <td style="padding:28px 36px 22px;background:${BRAND.dark};">
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
                  <tr>
                    <td>
                      <p style="margin:0;font-family:${FONT_HEADING};font-size:26px;font-weight:700;color:#ffffff;letter-spacing:0.3px;line-height:1.2;">${brand}</p>
                      <p style="margin:4px 0 0;font-family:${FONT_BODY};font-size:12px;color:rgba(255,255,255,0.55);letter-spacing:0.8px;text-transform:uppercase;">${tagline}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Gold accent stripe -->
            <tr>
              <td style="height:4px;font-size:0;line-height:0;background:linear-gradient(90deg, ${BRAND.accent}, ${BRAND.accentLight});">
                <!--[if mso]><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="height:4px;background:${BRAND.accent};font-size:0;line-height:0;">&nbsp;</td></tr></table><![endif]-->
                <!--[if !mso]><!-->&nbsp;<!--<![endif]-->
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px 36px 16px;font-family:${FONT_BODY};font-size:15px;line-height:1.65;color:${BRAND.textPrimary};">
                ${html}
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:32px 0 0;">
                  <tr>
                    <td>
                      <p style="margin:0;font-family:${FONT_BODY};font-size:15px;color:${BRAND.textPrimary};">${greeting}</p>
                      <p style="margin:4px 0 0;font-family:${FONT_HEADING};font-size:17px;font-weight:700;color:${BRAND.dark};">${brand}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Support footer -->
            <tr>
              <td style="padding:20px 36px;border-top:1px solid ${BRAND.border};background:${BRAND.muted};">
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
                  <tr>
                    <td>
                      <p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${BRAND.textPrimary};">${supportLabel}</p>
                      <p style="margin:0;font-family:${FONT_BODY};font-size:13px;color:${BRAND.textSecondary};line-height:1.5;">${supportText}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${crossSellBar}
            <!-- Bottom bar -->
            <tr>
              <td style="padding:16px 36px;background:${BRAND.dark};">
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
                  <tr>
                    <td style="font-family:${FONT_BODY};font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;">
                      ${brand} &middot; Tinglum, Namdalseid &middot; <a href="${APP_URL}" style="color:rgba(255,255,255,0.5);text-decoration:none;">tinglumgard.no</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Managed template rendering

export async function renderManagedTemplate(options: {
  templateKey: string;
  locale?: EmailLocale;
  variables?: Record<string, unknown>;
}): Promise<{ subject: string; html: string; classification: string; templateKey: string } | null> {
  const locale = options.locale || 'no';
  const vars = { ...options.variables } || {};

  // Auto-derive customer_first_name from customer_name if not explicitly set
  if (vars.customer_name && !vars.customer_first_name) {
    const fullName = String(vars.customer_name).trim();
    vars.customer_first_name = fullName.split(/\s+/)[0] || fullName;
  }

  if (options.templateKey === 'egg.remainder.reminder') {
    Object.assign(vars, normalizeEggReminderVariables(vars, locale));
  }

  if (options.templateKey === 'egg.remainder.reminder.pickup') {
    Object.assign(vars, normalizeEggPickupReminderVariables(vars, locale));
  }

  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .select('template_key, classification, product_scope, subject_no, subject_en, body_no, body_en')
    .eq('template_key', options.templateKey)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // Auto-inject tip_html if tip_index is provided and product_scope is known
  const productScope = String(data.product_scope || '');
  const tipIndex = vars.tip_index !== undefined ? Number(vars.tip_index) : null;
  if (tipIndex !== null && (productScope === 'pig' || productScope === 'eggs' || productScope === 'chickens')) {
    if (!vars.tip_html) {
      vars.tip_html = emailTipBox(productScope, tipIndex);
    }
  }
  // Fallback: if template references {{tip_html}} but we have no tip, inject empty string
  if (!vars.tip_html) {
    vars.tip_html = '';
  }

  const subjectRaw = locale === 'en' ? String(data.subject_en || '') : String(data.subject_no || '');
  const bodyRaw = locale === 'en' ? String(data.body_en || '') : String(data.body_no || '');
  const templateKey = String(data.template_key || options.templateKey);
  const interpolatedBody = interpolateTemplate(bodyRaw, vars);
  const eggReminderBody =
    templateKey === 'egg.remainder.reminder'
      ? locale === 'en'
        ? interpolatedBody.replace(
            /\(\s*[^)]*days left\s*\)/i,
            `(${String(vars.days_left_display_en || 'today')})`
          )
        : interpolatedBody.replace(
            /\(\s*[^)]*dager igjen\s*\)/i,
            `(${String(vars.days_left_display_no || 'i dag')})`
          )
      : interpolatedBody;
  const sanitized = sanitizeSupportEmailCopy({
    templateKey,
    subject: interpolateTemplate(subjectRaw, vars),
    html: eggReminderBody,
  });

  return {
    subject: sanitized.subject,
    html: ensureHtmlDocument(sanitized.html, locale, undefined, {
      productScope,
      classification: String(data.classification || 'transactional'),
    }),
    classification: String(data.classification || 'transactional'),
    templateKey,
  };
}

// Plain text conversion

export function htmlToPlainText(html: string): string {
  return decodeBasicHtmlEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim(),
  );
}

