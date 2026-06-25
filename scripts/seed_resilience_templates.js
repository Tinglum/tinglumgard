// Seeds/updates the email templates used by the payment-resilience flows:
//   order.cancelled.customer      - sent when an unpaid order is cancelled
//   order.manual_confirmed.customer - sent when Vipps failed twice but the order
//                                     was confirmed manually (payment owed)
//   admin.order.flagged           - admin alert when an order is flagged for review
//   admin.confirmation.audit      - daily admin digest of missing confirmations
//
// Idempotent: upserts by template_key. Usage: node scripts/seed_resilience_templates.js
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

function loadEnv(p) {
  const c = fs.readFileSync(p, 'utf8');
  const e = {};
  for (const l of c.split(/\r?\n/)) { const m = l.match(/^([^#=\s]+)=([\s\S]*)$/); if (m) e[m[1]] = m[2].trim(); }
  return e;
}
const env = loadEnv('.env.local');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const card = (rows) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-left:4px solid #8B6914;background-color:#FFF9E6;border-radius:4px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${rows.map(([k, v]) => `          <tr><td style="padding:4px 0;font-size:14px;color:#6B5B4E;">${k}</td><td style="padding:4px 0;font-size:14px;color:#1C1210;text-align:right;">${v}</td></tr>`).join('\n')}
        </table>
      </td></tr>
    </table>`;

const button = (label, href) => `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
      <tr><td style="background-color:#2C1810;border-radius:10px;text-align:center;">
        <a href="${href}" style="display:inline-block;background-color:#2C1810;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:32px;padding:6px 24px;border-radius:10px;text-decoration:none;">${label}</a>
      </td></tr>
    </table>`;

const wrap = (inner) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1C1210;background-color:#FAF8F5;">
  <tr><td style="padding:32px 24px;">
${inner}
  </td></tr>
</table>`;

const badge = (text, bg, color) => `    <span style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:${bg};color:${color};font-size:13px;font-weight:600;">${text}</span>`;

// ── 1. Order cancelled (customer) ────────────────────────────────────────────
const cancelled_no = wrap(`
${badge('Bestilling kansellert', '#FEF2F2', '#991B1B')}

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hei {{customer_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;">Bestillingen <strong>{{order_number}}</strong> ({{product_label}}) er dessverre kansellert fordi betalingen ikke ble fullført. Du er ikke belastet noe.</p>

    <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#6B5B4E;">{{reason_text}}</p>

    <p style="margin:24px 0 0;font-size:15px;line-height:1.6;">Ønsker du fortsatt varene? Du er hjertelig velkommen til å bestille på nytt — vi hjelper deg gjerne hvis noe stoppet opp i kassen.</p>
${button('Bestill på nytt', '{{order_url}}')}`);

const cancelled_en = wrap(`
${badge('Order cancelled', '#FEF2F2', '#991B1B')}

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hi {{customer_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;">Order <strong>{{order_number}}</strong> ({{product_label}}) has been cancelled because the payment was not completed. You have not been charged.</p>

    <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#6B5B4E;">{{reason_text}}</p>

    <p style="margin:24px 0 0;font-size:15px;line-height:1.6;">Still want the items? You are very welcome to order again — just reach out if something got stuck at checkout.</p>
${button('Order again', '{{order_url}}')}`);

// ── 2. Manually confirmed after Vipps failure (customer) ──────────────────────
const manual_no = wrap(`
${badge('Bestilling bekreftet', '#ECFDF5', '#2D6A4F')}

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hei {{customer_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;">Vipps-betalingen for bestilling <strong>{{order_number}}</strong> ({{product_label}}) gikk dessverre ikke gjennom. Ikke noe problem — vi har lagt inn bestillingen din manuelt, og den er <strong>bekreftet og reservert</strong>.</p>
${card([['Ordre', '{{order_number}}'], ['Å betale', '{{amount_owed_nok}}']])}

    <p style="margin:24px 0 0;font-size:15px;line-height:1.6;">Betalingen er ikke trukket ennå. Vi tar kontakt for å avtale betaling, eller du kan ordne det ved henting/levering. Du trenger ikke gjøre noe nå.</p>
${button('Se bestillingen', '{{order_url}}')}`);

const manual_en = wrap(`
${badge('Order confirmed', '#ECFDF5', '#2D6A4F')}

    <p style="margin:24px 0 0;font-size:16px;line-height:1.5;">Hi {{customer_name}},</p>

    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;">The Vipps payment for order <strong>{{order_number}}</strong> ({{product_label}}) did not go through. No problem — we have entered your order manually, and it is <strong>confirmed and reserved</strong>.</p>
${card([['Order', '{{order_number}}'], ['Amount due', '{{amount_owed_nok}}']])}

    <p style="margin:24px 0 0;font-size:15px;line-height:1.6;">No payment has been charged yet. We will be in touch to arrange payment, or you can settle it at pickup/delivery. Nothing is required from you right now.</p>
${button('View your order', '{{order_url}}')}`);

// ── 3. Admin: order flagged ───────────────────────────────────────────────────
const adminFlag = wrap(`
${badge('Ordre flagget', '#FFFBEB', '#B45309')}

    <p style="margin:24px 0 0;font-size:16px;line-height:1.6;">En ordre er flagget for manuell oppfølging.</p>
${card([
  ['Ordre', '{{order_number}}'],
  ['Type', '{{product_label}}'],
  ['Kunde', '{{customer_name}}'],
  ['E-post', '{{customer_email}}'],
  ['Telefon', '{{customer_phone}}'],
  ['Årsak', '{{flag_reason}}'],
  ['Å betale', '{{amount_owed_nok}}'],
])}
${button('Åpne i admin', '{{admin_url}}')}`);

// ── 4. Admin: daily confirmation-email audit ─────────────────────────────────
const adminAudit = wrap(`
${badge('Daglig bekreftelses-sjekk', '#FFF9E6', '#8B6914')}

    <p style="margin:24px 0 0;font-size:16px;line-height:1.6;">Daglig kontroll av at alle betalte/bekreftede ordre har fått bekreftelse på e-post.</p>
${card([
  ['Manglet bekreftelse', '{{missing_count}}'],
  ['Sendt på nytt automatisk', '{{resent_count}}'],
  ['Kunne ikke sendes', '{{failed_count}}'],
])}

    {{details_html}}
${button('Åpne i admin', '{{admin_url}}')}`);

const templates = [
  {
    template_key: 'order.cancelled.customer',
    classification: 'transactional',
    product_scope: 'shared',
    subject_no: 'Bestilling kansellert - {{order_number}}',
    subject_en: 'Order cancelled - {{order_number}}',
    body_no: cancelled_no,
    body_en: cancelled_en,
    variables: ['customer_name', 'order_number', 'product_label', 'reason_text', 'order_url'],
    active: true,
  },
  {
    template_key: 'order.manual_confirmed.customer',
    classification: 'transactional',
    product_scope: 'shared',
    subject_no: 'Bestilling bekreftet - {{order_number}}',
    subject_en: 'Order confirmed - {{order_number}}',
    body_no: manual_no,
    body_en: manual_en,
    variables: ['customer_name', 'order_number', 'product_label', 'amount_owed_nok', 'order_url'],
    active: true,
  },
  {
    template_key: 'admin.order.flagged',
    classification: 'system',
    product_scope: 'shared',
    subject_no: 'Ordre flagget for oppfolging - {{order_number}}',
    subject_en: 'Order flagged for review - {{order_number}}',
    body_no: adminFlag,
    body_en: adminFlag,
    variables: ['order_number', 'product_label', 'customer_name', 'customer_email', 'customer_phone', 'flag_reason', 'amount_owed_nok', 'admin_url'],
    active: true,
  },
  {
    template_key: 'admin.confirmation.audit',
    classification: 'system',
    product_scope: 'shared',
    subject_no: 'Daglig sjekk: {{missing_count}} ordre uten bekreftelse',
    subject_en: 'Daily check: {{missing_count}} orders without confirmation',
    body_no: adminAudit,
    body_en: adminAudit,
    variables: ['missing_count', 'resent_count', 'failed_count', 'details_html', 'admin_url'],
    active: true,
  },
];

(async () => {
  for (const t of templates) {
    const { error } = await sb.from('email_templates').upsert(t, { onConflict: 'template_key' });
    console.log(`${error ? 'ERROR ' + error.message : 'ok'}  ${t.template_key}`);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
