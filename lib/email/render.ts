import { supabaseAdmin } from '@/lib/supabase/server';
import type { EmailLocale } from '@/lib/email/types';

// ── Brand Design Tokens ────────────────────────────────────────────────────
const BRAND = {
  dark: '#2C1810',
  accent: '#8B6914',
  warmBg: '#F5EFE7',
  card: '#FFFFFF',
  muted: '#FAF8F5',
  textPrimary: '#1C1210',
  textSecondary: '#6B5B4E',
  border: '#E8DFD5',
  success: '#2D6A4F',
  successBg: '#ECFDF5',
  warning: '#B45309',
  warningBg: '#FFFBEB',
  error: '#991B1B',
  errorBg: '#FEF2F2',
  link: '#8B6914',
} as const;

const FONT_HEADING = "Georgia, 'Times New Roman', serif";
const FONT_BODY = "Arial, Helvetica, sans-serif";

// ── Template interpolation ─────────────────────────────────────────────────

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

export function interpolateTemplate(input: string, variables: Record<string, unknown>): string {
  let output = input;
  for (const [key, value] of Object.entries(variables)) {
    const normalizedValue = toStringValue(value);
    const upperKey = key.toUpperCase();
    output = output
      .replaceAll(`{{${key}}}`, normalizedValue)
      .replaceAll(`{{ ${key} }}`, normalizedValue)
      .replaceAll(`{${upperKey}}`, normalizedValue);
  }
  return output;
}

// ── Email Component Helpers ────────────────────────────────────────────────

export function emailButton(text: string, href: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const bg = variant === 'primary' ? BRAND.dark : BRAND.card;
  const color = variant === 'primary' ? '#ffffff' : BRAND.dark;
  const border = variant === 'primary' ? BRAND.dark : BRAND.border;

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
  <tr>
    <td align="center" style="border-radius:8px;background:${bg};">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="t" strokecolor="${border}" fillcolor="${bg}"><v:textbox><center style="color:${color};font-family:${FONT_BODY};font-size:15px;font-weight:700;">${text}</center></v:textbox></v:roundrect><![endif]-->
      <!--[if !mso]><!--><a href="${href}" target="_blank" style="display:inline-block;background:${bg};color:${color};font-family:${FONT_BODY};font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid ${border};mso-hide:all;">${text}</a><!--<![endif]-->
    </td>
  </tr>
</table>`;
}

export function emailInfoCard(rows: Array<{ label: string; value: string }>): string {
  const rowHtml = rows
    .map(
      (r) =>
        `<tr>
      <td style="padding:6px 12px 6px 0;font-family:${FONT_BODY};font-size:14px;color:${BRAND.textSecondary};vertical-align:top;white-space:nowrap;">${r.label}</td>
      <td style="padding:6px 0;font-family:${FONT_BODY};font-size:14px;color:${BRAND.textPrimary};font-weight:600;vertical-align:top;">${r.value}</td>
    </tr>`
    )
    .join('');

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:${BRAND.muted};border:1px solid ${BRAND.border};border-radius:8px;margin:16px 0;">
  <tr>
    <td style="padding:14px 16px;">
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
      return `<tr>
      <td style="padding:8px 0;font-family:${FONT_BODY};font-size:14px;color:${BRAND.textPrimary};font-weight:${weight};${topBorder}">${item.label}</td>
      <td style="padding:8px 0;font-family:${FONT_BODY};font-size:14px;color:${BRAND.textPrimary};font-weight:${weight};text-align:right;${topBorder}">${item.amount}</td>
    </tr>`;
    })
    .join('');

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:${BRAND.muted};border:1px solid ${BRAND.border};border-radius:8px;margin:16px 0;">
  <tr>
    <td style="padding:14px 16px;">
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
        ${rowHtml}
      </table>
    </td>
  </tr>
</table>`;
}

export function emailStatusBadge(label: string, variant: 'success' | 'warning' | 'error' = 'success'): string {
  const colors = {
    success: { bg: BRAND.successBg, text: BRAND.success, border: '#BBF7D0' },
    warning: { bg: BRAND.warningBg, text: BRAND.warning, border: '#FDE68A' },
    error: { bg: BRAND.errorBg, text: BRAND.error, border: '#FECACA' },
  };
  const c = colors[variant];
  return `<span style="display:inline-block;font-family:${FONT_BODY};font-size:12px;font-weight:700;color:${c.text};background:${c.bg};border:1px solid ${c.border};border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">${label}</span>`;
}

export function emailSection(title: string, bodyHtml: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;">
  <tr>
    <td style="padding:0 0 8px 0;font-family:${FONT_HEADING};font-size:17px;font-weight:700;color:${BRAND.textPrimary};border-bottom:2px solid ${BRAND.accent};">${title}</td>
  </tr>
  <tr>
    <td style="padding:12px 0 0 0;font-family:${FONT_BODY};font-size:15px;line-height:1.6;color:${BRAND.textPrimary};">
      ${bodyHtml}
    </td>
  </tr>
</table>`;
}

export function emailDivider(): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:24px 0;">
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
    <td style="border-left:4px solid ${c.border};background:${c.bg};padding:14px 16px;border-radius:0 8px 8px 0;font-family:${FONT_BODY};font-size:14px;line-height:1.6;color:${BRAND.textPrimary};white-space:pre-wrap;">${text}</td>
  </tr>
</table>`;
}

export function emailNextSteps(steps: string[]): string {
  const stepsHtml = steps
    .map(
      (step, i) =>
        `<tr>
      <td style="padding:6px 10px 6px 0;font-family:${FONT_BODY};font-size:22px;font-weight:700;color:${BRAND.accent};vertical-align:top;width:32px;text-align:center;">${i + 1}</td>
      <td style="padding:6px 0;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${BRAND.textPrimary};vertical-align:top;">${step}</td>
    </tr>`
    )
    .join('');

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;">
  ${stepsHtml}
</table>`;
}

export function emailHighlightAmount(amount: string, label?: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;">
  <tr>
    <td align="center" style="padding:20px;background:${BRAND.muted};border:1px solid ${BRAND.border};border-radius:10px;">
      <span style="font-family:${FONT_HEADING};font-size:32px;font-weight:700;color:${BRAND.dark};line-height:1.2;">${amount}</span>
      ${label ? `<br><span style="font-family:${FONT_BODY};font-size:13px;color:${BRAND.textSecondary};margin-top:4px;display:inline-block;">${label}</span>` : ''}
    </td>
  </tr>
</table>`;
}

// ── Main Document Wrapper ──────────────────────────────────────────────────

export function ensureHtmlDocument(html: string, locale: EmailLocale = 'no', preheaderText?: string): string {
  if (html.trim().toLowerCase().includes('<html')) {
    return html;
  }

  const brand = 'Tinglum G\u00e5rd';
  const greeting = locale === 'en' ? 'Best regards' : 'Vennlig hilsen';
  const supportLabel = locale === 'en' ? 'Need help?' : 'Trenger du hjelp?';
  const supportText =
    locale === 'en'
      ? 'Reply to this email and we will help you.'
      : 'Svar p\u00e5 denne e-posten, s\u00e5 hjelper vi deg.';
  const preheader = preheaderText ||
    (locale === 'en'
      ? 'Important update about your order from Tinglum G\u00e5rd.'
      : 'Viktig oppdatering om bestillingen din fra Tinglum G\u00e5rd.');

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
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.warmBg};padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="padding:24px 28px 20px;background:${BRAND.dark};">
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
                  <tr>
                    <td style="font-family:${FONT_HEADING};font-size:24px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">
                      ${brand}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Gold accent stripe -->
            <tr>
              <td style="height:3px;background:${BRAND.accent};font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:28px 28px 12px;font-family:${FONT_BODY};font-size:15px;line-height:1.65;color:${BRAND.textPrimary};">
                ${html}
                <p style="margin:28px 0 0;font-family:${FONT_BODY};font-size:15px;color:${BRAND.textPrimary};">${greeting}<br><strong style="font-family:${FONT_HEADING};">${brand}</strong></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:18px 28px;border-top:1px solid ${BRAND.border};background:${BRAND.muted};font-family:${FONT_BODY};">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${BRAND.textPrimary};">${supportLabel}</p>
                <p style="margin:0;font-size:13px;color:${BRAND.textSecondary};">${supportText}</p>
              </td>
            </tr>
            <!-- Bottom bar -->
            <tr>
              <td style="padding:14px 28px;background:${BRAND.dark};font-family:${FONT_BODY};font-size:12px;color:${BRAND.textSecondary};">
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
                  <tr>
                    <td style="font-family:${FONT_BODY};font-size:12px;color:rgba(255,255,255,0.6);">
                      ${brand} &bull; Tinglum, Steinkjer
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

// ── Managed Template Rendering ─────────────────────────────────────────────

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

  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .select('template_key, classification, subject_no, subject_en, body_no, body_en')
    .eq('template_key', options.templateKey)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const subjectRaw = locale === 'en' ? String(data.subject_en || '') : String(data.subject_no || '');
  const bodyRaw = locale === 'en' ? String(data.body_en || '') : String(data.body_no || '');

  return {
    subject: interpolateTemplate(subjectRaw, vars),
    html: ensureHtmlDocument(interpolateTemplate(bodyRaw, vars), locale),
    classification: String(data.classification || 'transactional'),
    templateKey: String(data.template_key || options.templateKey),
  };
}

// ── Plain Text Conversion ──────────────────────────────────────────────────

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
